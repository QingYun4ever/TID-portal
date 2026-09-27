/* 验证 QR 生成器：输出矩阵，供与参考实现比对 */
import { encodeQr } from '../src/lib/qrcode.ts';

const text = process.argv[2] ?? 'STI-CHECKIN:1:p-abc123';
const ecl = (process.argv[3] ?? 'M') as 'L' | 'M' | 'Q' | 'H';
const r = encodeQr(text, ecl);

const lines: string[] = [];
lines.push(`size=${r.size} version=${r.version}`);
for (let y = 0; y < r.size; y++) {
  let s = '';
  for (let x = 0; x < r.size; x++) s += r.modules[y][x] ? '1' : '0';
  lines.push(s);
}
console.log(lines.join('\n'));
