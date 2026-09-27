"""终极验证：解开掩模后比较数据模块。
若两组数据模块完全一致，说明编码 / RS 纠错 / 排布三者均正确，
差异仅来自「掩模选择启发式」（两种实现都是标准允许的，且掩模号编码在格式信息中，
任何扫码器都能正确还原）。
"""
import subprocess, sys, os, qrcode
from qrcode.util import QRData, MODE_8BIT_BYTE

CASES = [
    ("STI-CHECKIN:1:p-abc123", "M"),
    ("HELLO", "L"),
    ("https://sti.university.edu.cn/activities/ai-agent-tech-salon-12", "M"),
    ("A" * 120, "Q"),
    ("x" * 300, "M"),
    ("科技创新部 签到二维码 测试 payload 中文内容", "H"),
    ("1234567890" * 40, "H"),
    ("STI-CHECKIN:6:p-9f2c1a4b", "L"),
    ("y" * 900, "L"),
    ("Z" * 60, "H"),
    ("", "M"),
    ("https://example.com/a?b=1&c=2#frag", "Q"),
]
ECL_CONST = {
    "L": qrcode.constants.ERROR_CORRECT_L, "M": qrcode.constants.ERROR_CORRECT_M,
    "Q": qrcode.constants.ERROR_CORRECT_Q, "H": qrcode.constants.ERROR_CORRECT_H,
}

def mask_fn(mask, x, y):
    return [
        (x + y) % 2 == 0,
        y % 2 == 0,
        x % 3 == 0,
        (x + y) % 3 == 0,
        ((x // 3) + (y // 2)) % 2 == 0,
        (x * y) % 2 + (x * y) % 3 == 0,
        ((x * y) % 2 + (x * y) % 3) % 2 == 0,
        ((x + y) % 2 + (x * y) % 3) % 2 == 0,
    ][mask]

def read_format(mat):
    bits = [1 if mat[8][i] else 0 for i in range(6)]
    bits += [1 if mat[8][7] else 0, 1 if mat[8][8] else 0, 1 if mat[7][8] else 0]
    bits += [1 if mat[14 - i][8] else 0 for i in range(9, 15)]
    val = 0
    for b in bits:
        val = (val << 1) | b
    val ^= 0x5412
    return val >> 10

def function_mask(version, size):
    """标记功能区模块（不参与数据编码）"""
    fn = [[False] * size for _ in range(size)]
    def mark(x, y):
        if 0 <= x < size and 0 <= y < size:
            fn[y][x] = True
    # 定位图案 + 分隔符
    for (ox, oy) in [(0, 0), (size - 7, 0), (0, size - 7)]:
        for dy in range(-1, 8):
            for dx in range(-1, 8):
                mark(ox + dx, oy + dy)
    # 时序
    for i in range(size):
        mark(6, i); mark(i, 6)
    # 校正图案
    if version > 1:
        num = version // 7 + 2
        step = 26 if version == 32 else ((version * 4 + 4) + (num * 2 - 2) - 1) // (num * 2 - 2) * 2
        pos = [6]
        p = version * 4 + 10
        while len(pos) < num:
            pos.insert(1, p); p -= step
        for i in pos:
            for j in pos:
                if (i == 6 and j == 6) or (i == 6 and j == pos[-1]) or (i == pos[-1] and j == 6):
                    continue
                for dy in range(-2, 3):
                    for dx in range(-2, 3):
                        mark(i + dx, j + dy)
    # 格式信息
    for i in range(9):
        mark(8, i); mark(i, 8)
    for i in range(8):
        mark(size - 1 - i, 8); mark(8, size - 1 - i)
    # 版本信息
    if version >= 7:
        for i in range(18):
            a = size - 11 + i % 3
            b = i // 3
            mark(a, b); mark(b, a)
    return fn

here = os.path.dirname(os.path.abspath(__file__))
root = os.path.dirname(here)
fails = 0

for text, ecl in CASES:
    q = qrcode.QRCode(error_correction=ECL_CONST[ecl], border=0, box_size=1)
    q.add_data(QRData(text.encode("utf-8"), mode=MODE_8BIT_BYTE))
    q.make(fit=True)
    ref = q.get_matrix()
    n = len(ref)

    out = subprocess.run(
        f'npx tsx "{os.path.join(here, "qr-dump.ts")}" "{text}" {ecl}',
        capture_output=True, text=True, cwd=root, shell=True,
    )
    if out.returncode != 0:
        print(f"[RUN-FAIL] {text[:30]!r}: {out.stderr[-300:]}")
        fails += 1
        continue
    lines = out.stdout.strip().splitlines()
    version = int(lines[0].split("version=")[1])
    mine = [[c == "1" for c in ln] for ln in lines[1:]]

    if len(mine) != n:
        print(f"[SIZE-FAIL] {text[:30]!r} ref={n} ours={len(mine)}")
        fails += 1
        continue

    ref_mask = read_format(ref) & 7
    my_mask = read_format(mine) & 7
    fn = function_mask(version, n)

    diff_data = 0
    for y in range(n):
        for x in range(n):
            if fn[y][x]:
                continue
            a = bool(ref[y][x]) ^ mask_fn(ref_mask, x, y)
            b = bool(mine[y][x]) ^ mask_fn(my_mask, x, y)
            if a != b:
                diff_data += 1

    ok = diff_data == 0
    if not ok:
        fails += 1
    label = "DATA-IDENTICAL" if ok else "DATA-MISMATCH"
    print(f"[{'OK ' if ok else 'BAD'}] v{version:>2} ecl={ecl} mask ref={ref_mask} ours={my_mask} "
          f"data-module diff={diff_data}  {text[:30]!r}")

print()
print("RESULT:", "ALL DATA IDENTICAL" if fails == 0 else f"{fails} FAILURES")
sys.exit(0 if fails == 0 else 1)
