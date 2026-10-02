import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Rotate3D, X } from 'lucide-react';
import * as THREE from 'three';
import { MTLLoader } from 'three/addons/loaders/MTLLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

interface Props {
  modelUrl: string;
  title: string;
  onClose: () => void;
}

export default function ProjectModelViewer({ modelUrl, title, onClose }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = 'hidden';
    closeButton.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'Tab') {
        event.preventDefault();
        closeButton.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
      previousFocus?.focus();
    };
  }, [onClose]);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let disposed = false;
    let frame = 0;
    let object: THREE.Group | null = null;
    const ownedMaterials = new Set<THREE.Material>();
    const ownedTextures = new Set<THREE.Texture>();
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setError('当前浏览器无法启动 3D 渲染，请启用 WebGL 后重试。');
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.6;
    element.appendChild(renderer.domElement);
    renderer.domElement.className = 'h-full w-full touch-none';
    renderer.domElement.setAttribute('aria-label', `${title} 三维模型，可拖拽旋转并滚轮缩放`);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 2000);
    camera.position.set(0, 0, 190);
    scene.add(new THREE.HemisphereLight(0xf7fbff, 0x425775, 2.2));
    const key = new THREE.DirectionalLight(0xffffff, 3);
    key.position.set(-80, 100, 150);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x93c5fd, 2.2);
    rim.position.set(80, -40, -100);
    scene.add(rim);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 75;
    controls.maxDistance = 400;
    controls.zoomSpeed = 0.8;
    controls.rotateSpeed = 0.8;

    const resize = () => {
      if (!element.clientWidth || !element.clientHeight) return;
      camera.aspect = element.clientWidth / element.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(element.clientWidth, element.clientHeight);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    resize();

    const animate = () => {
      frame = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const mtlUrl = modelUrl.replace(/\.obj$/i, '.mtl');
    new MTLLoader().load(mtlUrl, (materials) => {
      if (disposed) return;
      materials.preload();
      Object.values(materials.materials).forEach((material) => {
        material.side = THREE.DoubleSide;
        ownedMaterials.add(material);
        if (material.map) ownedTextures.add(material.map);
      });
      new OBJLoader().setMaterials(materials).load(modelUrl, (loaded) => {
        if (disposed) {
          loaded.traverse((child) => {
            if (child instanceof THREE.Mesh) child.geometry.dispose();
          });
          return;
        }
        object = loaded;
        const bounds = new THREE.Box3().setFromObject(loaded);
        const size = bounds.getSize(new THREE.Vector3());
        const center = bounds.getCenter(new THREE.Vector3());
        loaded.position.sub(center);
        scene.add(loaded);
        const halfFov = THREE.MathUtils.degToRad(camera.fov / 2);
        const distance = Math.max(size.y / 2 / Math.tan(halfFov), size.x / 2 / (Math.tan(halfFov) * camera.aspect)) * 1.25;
        camera.position.set(distance * 0.12, distance * 0.08, distance);
        controls.minDistance = distance * 0.55;
        controls.maxDistance = distance * 3;
        controls.update();
      }, undefined, () => setError('三维模型加载失败，请稍后重试。'));
    }, undefined, () => setError('模型材质加载失败，请稍后重试。'));

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      object?.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        child.geometry.dispose();
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((material) => ownedMaterials.add(material));
      });
      ownedMaterials.forEach((material) => material.dispose());
      ownedTextures.forEach((texture) => texture.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [modelUrl, title]);

  return createPortal(
    <div className="fixed inset-0 z-[100] flex flex-col bg-black/45 backdrop-blur-2xl" role="dialog" aria-modal="true" aria-label={`${title} 三维预览`}>
      <button type="button" className="absolute inset-0 cursor-default" aria-label="关闭三维预览" onClick={onClose} />
      <div className="pointer-events-none relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-5 pt-5 sm:px-8 sm:pt-8">
        <div>
          <p className="mono text-[10px] tracking-[0.22em] text-primary">3D OBJECT / DEPARTMENT CARD</p>
          <h2 className="mt-1 text-lg font-semibold text-white sm:text-2xl">{title}</h2>
        </div>
        <button ref={closeButton} type="button" className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" onClick={onClose} aria-label="关闭三维预览">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="pointer-events-auto relative z-10 mx-auto my-4 min-h-0 w-[min(94vw,1100px)] flex-1 overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-white/[0.08] via-white/[0.025] to-primary/[0.06] shadow-2xl sm:my-7">
        <div ref={host} className="absolute inset-0" />
        {error && <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-white/80">{error}</div>}
      </div>
      <div className="pointer-events-none relative z-10 mx-auto flex items-center gap-2 pb-5 text-center text-xs text-white/70 sm:pb-8">
        <Rotate3D className="h-4 w-4" /> 拖拽旋转 · 滚轮缩放 · Esc 关闭
      </div>
    </div>,
    document.body
  );
}
