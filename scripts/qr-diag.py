import subprocess, sys, os, qrcode
from qrcode.util import QRData, MODE_8BIT_BYTE

CASES = [
    ("STI-CHECKIN:1:p-abc123", "M", 0),
    ("HELLO", "L", 148),
    ("https://sti.university.edu.cn/activities/ai-agent-tech-salon-12", "M", 522),
    ("A" * 120, "Q", 0),
    ("x" * 300, "M", 0),
    ("科技创新部 签到二维码 测试 payload 中文内容", "H", 796),
    ("1234567890" * 40, "H", 0),
    ("STI-CHECKIN:6:p-9f2c1a4b", "L", 0),
    ("y" * 900, "L", 0),
    ("Z" * 60, "H", 0),
]
ECL_MAP = {"L": 1, "M": 0, "Q": 3, "H": 2}
ECL_CONST = {
    "L": qrcode.constants.ERROR_CORRECT_L, "M": qrcode.constants.ERROR_CORRECT_M,
    "Q": qrcode.constants.ERROR_CORRECT_Q, "H": qrcode.constants.ERROR_CORRECT_H,
}

def decode_format(mat, size):
    """从矩阵读出 (ecl_bits, mask)"""
    bits = []
    for i in range(6):
        bits.append(1 if mat[8][i] else 0)
    bits.append(1 if mat[8][7] else 0)
    bits.append(1 if mat[8][8] else 0)
    bits.append(1 if mat[7][8] else 0)
    for i in range(9, 15):
        bits.append(1 if mat[14 - i][8] else 0)
    val = 0
    for b in bits:
        val = (val << 1) | b
    val ^= 0x5412
    data = val >> 10
    return data >> 3, data & 7

here = os.path.dirname(os.path.abspath(__file__))
root = os.path.dirname(here)

for text, ecl, prev_diff in CASES:
    q = qrcode.QRCode(error_correction=ECL_CONST[ecl], border=0, box_size=1)
    q.add_data(QRData(text.encode("utf-8"), mode=MODE_8BIT_BYTE))
    q.make(fit=True)
    ref = q.get_matrix()
    n = len(ref)

    out = subprocess.run(
        f'npx tsx "{os.path.join(here, "qr-dump.ts")}" "{text}" {ecl}',
        capture_output=True, text=True, cwd=root, shell=True,
    )
    lines = out.stdout.strip().splitlines()
    mine = [[c == "1" for c in ln] for ln in lines[1:]]

    if len(mine) != n:
        print(f"size mismatch {text[:20]!r}")
        continue

    re_ec, re_mask = decode_format(ref, n)
    me_ec, me_mask = decode_format(mine, n)
    diff = sum(1 for y in range(n) for x in range(n) if bool(ref[y][x]) != mine[y][x])
    same_mask = re_mask == me_mask
    print(f"{text[:34]!r:38} v{lines[0].split('version=')[1]:>3} ecl={ecl} "
          f"refmask={re_mask} ourmask={me_mask} {'same' if same_mask else 'DIFF'} diff={diff}")
