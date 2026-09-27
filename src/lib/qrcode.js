/* =============================================================================
 * 极简 QR 码生成器（无依赖）
 *  - 字节模式（UTF-8），版本 1–40 自动选择
 *  - 纠错等级 L / M / Q / H
 *  - 完整 Reed–Solomon 纠错 + 掩模惩罚评分
 *  算法遵循 ISO/IEC 18004 标准流程。
 * ========================================================================== */
/* 每块纠错码字数 [ecl][version]（索引 0 占位） */
const ECC_CODEWORDS_PER_BLOCK = {
    L: [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    M: [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
    Q: [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    H: [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
};
/* 纠错块数 [ecl][version] */
const NUM_ECC_BLOCKS = {
    L: [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
    M: [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
    Q: [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
    H: [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81],
};
const FORMAT_ECL_BITS = { L: 1, M: 0, Q: 3, H: 2 };
function numRawDataModules(ver) {
    let result = (16 * ver + 128) * ver + 64;
    if (ver >= 2) {
        const numAlign = Math.floor(ver / 7) + 2;
        result -= (25 * numAlign - 10) * numAlign - 55;
        if (ver >= 7)
            result -= 36;
    }
    return result;
}
function numDataCodewords(ver, ecl) {
    return (Math.floor(numRawDataModules(ver) / 8) -
        ECC_CODEWORDS_PER_BLOCK[ecl][ver] * NUM_ECC_BLOCKS[ecl][ver]);
}
function alignmentPatternPositions(ver) {
    if (ver === 1)
        return [];
    const numAlign = Math.floor(ver / 7) + 2;
    const step = ver === 32 ? 26 : Math.ceil((ver * 4 + 4) / (numAlign * 2 - 2)) * 2;
    const result = [6];
    for (let pos = ver * 4 + 10; result.length < numAlign; pos -= step)
        result.splice(1, 0, pos);
    return result;
}
/* ------------------------------ GF(256) --------------------------------- */
function rsMultiply(x, y) {
    let z = 0;
    for (let i = 7; i >= 0; i--) {
        z = (z << 1) ^ ((z >>> 7) * 0x11d);
        z ^= ((y >>> i) & 1) * x;
    }
    return z & 0xff;
}
function rsDivisor(degree) {
    const result = new Uint8Array(degree);
    result[degree - 1] = 1;
    let root = 1;
    for (let i = 0; i < degree; i++) {
        for (let j = 0; j < result.length; j++) {
            result[j] = rsMultiply(result[j], root);
            if (j + 1 < result.length)
                result[j] ^= result[j + 1];
        }
        root = rsMultiply(root, 0x02);
    }
    return result;
}
function rsRemainder(data, divisor) {
    const result = new Uint8Array(divisor.length);
    for (const b of data) {
        const factor = b ^ result[0];
        result.copyWithin(0, 1);
        result[result.length - 1] = 0;
        for (let i = 0; i < result.length; i++)
            result[i] ^= rsMultiply(divisor[i], factor);
    }
    return result;
}
/* ------------------------------ 位缓冲 ---------------------------------- */
class BitBuffer {
    bits = [];
    put(value, len) {
        for (let i = len - 1; i >= 0; i--)
            this.bits.push((value >>> i) & 1);
    }
    get length() {
        return this.bits.length;
    }
}
/* ------------------------------ 编码 ------------------------------------ */
function toUtf8(str) {
    if (typeof TextEncoder !== 'undefined')
        return new TextEncoder().encode(str);
    const out = [];
    for (let i = 0; i < str.length; i++) {
        let c = str.charCodeAt(i);
        if (c < 0x80)
            out.push(c);
        else if (c < 0x800)
            out.push(0xc0 | (c >> 6), 0x80 | (c & 63));
        else if (c >= 0xd800 && c <= 0xdbff && i + 1 < str.length) {
            const c2 = str.charCodeAt(++i);
            c = 0x10000 + ((c & 0x3ff) << 10) + (c2 & 0x3ff);
            out.push(0xf0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
        }
        else
            out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    }
    return new Uint8Array(out);
}
function addEccAndInterleave(data, ver, ecl) {
    const numBlocks = NUM_ECC_BLOCKS[ecl][ver];
    const blockEccLen = ECC_CODEWORDS_PER_BLOCK[ecl][ver];
    const rawCodewords = Math.floor(numRawDataModules(ver) / 8);
    const numShortBlocks = numBlocks - (rawCodewords % numBlocks);
    const shortBlockLen = Math.floor(rawCodewords / numBlocks);
    const blocks = [];
    const rsDiv = rsDivisor(blockEccLen);
    for (let i = 0, k = 0; i < numBlocks; i++) {
        const datLen = shortBlockLen - blockEccLen + (i < numShortBlocks ? 0 : 1);
        const dat = data.slice(k, k + datLen);
        k += datLen;
        const ecc = rsRemainder(dat, rsDiv);
        const block = new Uint8Array(datLen + blockEccLen);
        block.set(dat, 0);
        block.set(ecc, datLen);
        blocks.push(block);
    }
    const result = new Uint8Array(rawCodewords);
    let idx = 0;
    const maxDatLen = shortBlockLen - blockEccLen + 1;
    for (let i = 0; i < maxDatLen; i++) {
        for (let j = 0; j < numBlocks; j++) {
            // 短块无末尾数据字节，跳过
            if (i < blocks[j].length - blockEccLen)
                result[idx++] = blocks[j][i];
        }
    }
    for (let i = 0; i < blockEccLen; i++) {
        for (let j = 0; j < numBlocks; j++)
            result[idx++] = blocks[j][blocks[j].length - blockEccLen + i];
    }
    return result;
}
/* ------------------------------ 矩阵绘制 -------------------------------- */
class QrMatrix {
    version;
    size;
    modules;
    isFunction;
    constructor(version) {
        this.version = version;
        this.size = version * 4 + 17;
        this.modules = Array.from({ length: this.size }, () => new Array(this.size).fill(false));
        this.isFunction = Array.from({ length: this.size }, () => new Array(this.size).fill(false));
    }
    setFunctionModule(x, y, isDark) {
        if (x < 0 || y < 0 || x >= this.size || y >= this.size)
            return;
        this.modules[y][x] = isDark;
        this.isFunction[y][x] = true;
    }
    drawFinderPattern(x, y) {
        for (let dy = -4; dy <= 4; dy++) {
            for (let dx = -4; dx <= 4; dx++) {
                const dist = Math.max(Math.abs(dx), Math.abs(dy));
                const xx = x + dx;
                const yy = y + dy;
                if (xx >= 0 && xx < this.size && yy >= 0 && yy < this.size)
                    this.setFunctionModule(xx, yy, dist !== 2 && dist !== 4);
            }
        }
    }
    drawAlignmentPattern(x, y) {
        for (let dy = -2; dy <= 2; dy++)
            for (let dx = -2; dx <= 2; dx++)
                this.setFunctionModule(x + dx, y + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
    drawFunctionPatterns() {
        // 时序图案
        for (let i = 0; i < this.size; i++) {
            this.setFunctionModule(6, i, i % 2 === 0);
            this.setFunctionModule(i, 6, i % 2 === 0);
        }
        // 三个定位图案
        this.drawFinderPattern(3, 3);
        this.drawFinderPattern(this.size - 4, 3);
        this.drawFinderPattern(3, this.size - 4);
        // 校正图案
        const align = alignmentPatternPositions(this.version);
        const n = align.length;
        for (let i = 0; i < n; i++) {
            for (let j = 0; j < n; j++) {
                if ((i === 0 && j === 0) || (i === 0 && j === n - 1) || (i === n - 1 && j === 0))
                    continue;
                this.drawAlignmentPattern(align[i], align[j]);
            }
        }
        // 预留格式信息区（真实内容在 writeFormatBits 中写入）
        this.writeFormatBits('M', 0);
        this.drawVersionBits();
    }
    writeFormatBits(ecl, mask) {
        const data = (FORMAT_ECL_BITS[ecl] << 3) | mask;
        let rem = data;
        for (let i = 0; i < 10; i++)
            rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
        const bits = ((data << 10) | rem) ^ 0x5412;
        for (let i = 0; i <= 5; i++)
            this.setFunctionModule(8, i, ((bits >>> i) & 1) !== 0);
        this.setFunctionModule(8, 7, ((bits >>> 6) & 1) !== 0);
        this.setFunctionModule(8, 8, ((bits >>> 7) & 1) !== 0);
        this.setFunctionModule(7, 8, ((bits >>> 8) & 1) !== 0);
        for (let i = 9; i < 15; i++)
            this.setFunctionModule(14 - i, 8, ((bits >>> i) & 1) !== 0);
        for (let i = 0; i < 8; i++)
            this.setFunctionModule(this.size - 1 - i, 8, ((bits >>> i) & 1) !== 0);
        for (let i = 8; i < 15; i++)
            this.setFunctionModule(8, this.size - 15 + i, ((bits >>> i) & 1) !== 0);
        this.setFunctionModule(8, this.size - 8, true); // 固定深色模块
    }
    drawVersionBits() {
        if (this.version < 7)
            return;
        let rem = this.version;
        for (let i = 0; i < 12; i++)
            rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
        const bits = (this.version << 12) | rem;
        for (let i = 0; i < 18; i++) {
            const bit = ((bits >>> i) & 1) !== 0;
            const a = this.size - 11 + (i % 3);
            const b = Math.floor(i / 3);
            this.setFunctionModule(a, b, bit);
            this.setFunctionModule(b, a, bit);
        }
    }
    drawCodewords(data) {
        let i = 0;
        for (let right = this.size - 1; right >= 1; right -= 2) {
            if (right === 6)
                right = 5;
            for (let vert = 0; vert < this.size; vert++) {
                for (let j = 0; j < 2; j++) {
                    const x = right - j;
                    const upward = ((right + 1) & 2) === 0;
                    const y = upward ? this.size - 1 - vert : vert;
                    if (!this.isFunction[y][x] && i < data.length * 8) {
                        this.modules[y][x] = ((data[i >>> 3] >>> (7 - (i & 7))) & 1) !== 0;
                        i++;
                    }
                }
            }
        }
    }
    applyMask(mask) {
        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                if (this.isFunction[y][x])
                    continue;
                let invert = false;
                switch (mask) {
                    case 0:
                        invert = (x + y) % 2 === 0;
                        break;
                    case 1:
                        invert = y % 2 === 0;
                        break;
                    case 2:
                        invert = x % 3 === 0;
                        break;
                    case 3:
                        invert = (x + y) % 3 === 0;
                        break;
                    case 4:
                        invert = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
                        break;
                    case 5:
                        invert = ((x * y) % 2) + ((x * y) % 3) === 0;
                        break;
                    case 6:
                        invert = (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
                        break;
                    case 7:
                        invert = (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
                        break;
                }
                if (invert)
                    this.modules[y][x] = !this.modules[y][x];
            }
        }
    }
    penaltyScore() {
        const size = this.size;
        const N1 = 3, N2 = 3, N3 = 40, N4 = 10;
        let result = 0;
        /* --- 运行长度历史（含边缘亮色补边），用于规则 1 与规则 3 --- */
        const addHistory = (runLength, hist) => {
            if (hist[0] === 0)
                runLength += size; // 行/列首补亮色边框
            hist.copyWithin(1, 0, hist.length - 1);
            hist[0] = runLength;
        };
        const countPatterns = (hist) => {
            const n = hist[1];
            const core = n > 0 && hist[2] === n && hist[3] === n * 3 && hist[4] === n && hist[5] === n;
            return ((core && hist[0] >= n * 4 && hist[6] >= n ? 1 : 0) +
                (core && hist[6] >= n * 4 && hist[0] >= n ? 1 : 0));
        };
        const terminateAndCount = (runColor, runLength, hist) => {
            if (runColor) {
                addHistory(runLength, hist);
                runLength = 0;
            }
            runLength += size; // 行/列尾补亮色边框
            addHistory(runLength, hist);
            return countPatterns(hist);
        };
        const scanLine = (get) => {
            let runColor = false;
            let runLen = 0;
            const hist = [0, 0, 0, 0, 0, 0, 0];
            for (let i = 0; i < size; i++) {
                if (get(i) === runColor) {
                    runLen++;
                    if (runLen === 5)
                        result += N1;
                    else if (runLen > 5)
                        result++;
                }
                else {
                    addHistory(runLen, hist);
                    if (!runColor)
                        result += countPatterns(hist) * N3;
                    runColor = get(i);
                    runLen = 1;
                }
            }
            result += terminateAndCount(runColor, runLen, hist) * N3;
        };
        // 规则 1（同行同色连续 ≥5）+ 规则 3（类定位图案）
        for (let y = 0; y < size; y++)
            scanLine((x) => this.modules[y][x]);
        for (let x = 0; x < size; x++)
            scanLine((y) => this.modules[y][x]);
        // 规则 2：2×2 同色块
        for (let y = 0; y < size - 1; y++) {
            for (let x = 0; x < size - 1; x++) {
                const c = this.modules[y][x];
                if (c === this.modules[y][x + 1] && c === this.modules[y + 1][x] && c === this.modules[y + 1][x + 1])
                    result += N2;
            }
        }
        // 规则 4：深色模块比例偏离 50% 的惩罚
        let dark = 0;
        for (const row of this.modules)
            for (const c of row)
                if (c)
                    dark++;
        const total = size * size;
        const k = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1;
        result += k * N4;
        return result;
    }
}
export function encodeQr(text, ecl = 'M') {
    const bytes = toUtf8(text);
    // 选择最小可用版本
    let version = 0;
    for (let v = 1; v <= 40; v++) {
        const capBits = numDataCodewords(v, ecl) * 8;
        const ccBits = v <= 9 ? 8 : 16;
        if (4 + ccBits + bytes.length * 8 <= capBits) {
            version = v;
            break;
        }
    }
    if (!version)
        throw new Error('内容过长，无法生成 QR 码');
    const ccBits = version <= 9 ? 8 : 16;
    const bb = new BitBuffer();
    bb.put(0b0100, 4); // 字节模式
    bb.put(bytes.length, ccBits);
    for (const b of bytes)
        bb.put(b, 8);
    const capacityBits = numDataCodewords(version, ecl) * 8;
    // 终止符 + 补齐到字节
    bb.put(0, Math.min(4, capacityBits - bb.length));
    bb.put(0, (8 - (bb.length % 8)) % 8);
    // 填充字节
    for (let pad = 0xec; bb.length < capacityBits; pad ^= 0xec ^ 0x11)
        bb.put(pad, 8);
    const dataCodewords = new Uint8Array(bb.length / 8);
    bb.bits.forEach((bit, i) => {
        if (bit)
            dataCodewords[i >>> 3] |= 0x80 >>> (i & 7);
    });
    const allCodewords = addEccAndInterleave(dataCodewords, version, ecl);
    // 选择最优掩模
    let best = null;
    let bestPenalty = Infinity;
    for (let mask = 0; mask < 8; mask++) {
        const m = new QrMatrix(version);
        m.drawFunctionPatterns();
        m.writeFormatBits(ecl, mask);
        m.drawCodewords(allCodewords);
        m.applyMask(mask);
        m.writeFormatBits(ecl, mask);
        const p = m.penaltyScore();
        if (p < bestPenalty) {
            bestPenalty = p;
            best = m;
        }
    }
    const m = best;
    // 保留功能区标记，但返回纯模块矩阵
    return { size: m.size, version, modules: m.modules };
}
/** 生成 SVG path（每个深色模块一个方块），便于任意缩放 */
export function qrSvgPath(text, ecl = 'M') {
    const { modules, size } = encodeQr(text, ecl);
    const parts = [];
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            if (modules[y][x])
                parts.push(`M${x} ${y}h1v1h-1z`);
        }
    }
    return { d: parts.join(''), size };
}
/** React 友好：返回 <svg> 的 innerHTML 字符串 */
export function qrSvg(text, opts = {}) {
    const { ecl = 'M', dark = '#000', light = 'transparent', quiet = 2, className = '' } = opts;
    const { d, size } = qrSvgPath(text, ecl);
    const total = size + quiet * 2;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges" class="${className}">${light !== 'transparent' ? `<rect width="${total}" height="${total}" fill="${light}"/>` : ''}<g transform="translate(${quiet} ${quiet})"><path d="${d}" fill="${dark}"/></g></svg>`;
}
