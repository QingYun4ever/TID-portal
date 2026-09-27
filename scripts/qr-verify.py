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
]
ECL_MAP = {
    "L": qrcode.constants.ERROR_CORRECT_L,
    "M": qrcode.constants.ERROR_CORRECT_M,
    "Q": qrcode.constants.ERROR_CORRECT_Q,
    "H": qrcode.constants.ERROR_CORRECT_H,
}

here = os.path.dirname(os.path.abspath(__file__))
root = os.path.dirname(here)
fails = 0

for text, ecl in CASES:
    q = qrcode.QRCode(error_correction=ECL_MAP[ecl], border=0, box_size=1)
    # 强制 8bit 字节模式，禁止分段优化 —— 与我们的实现口径一致
    q.add_data(QRData(text.encode("utf-8"), mode=MODE_8BIT_BYTE))
    q.make(fit=True)
    ref = q.get_matrix()
    n = len(ref)

    out = subprocess.run(
        f'npx tsx "{os.path.join(here, "qr-dump.ts")}" "{text}" {ecl}',
        capture_output=True, text=True, cwd=root, shell=True,
    )
    if out.returncode != 0:
        print(f"[FAIL-RUN] ecl={ecl} len={len(text)}  {out.stdout[-400:]}{out.stderr[-400:]}")
        fails += 1
        continue

    lines = out.stdout.strip().splitlines()
    mine = [[c == "1" for c in ln] for ln in lines[1:]]
    if len(mine) != n:
        print(f"[FAIL-SIZE] ecl={ecl} len={len(text)}  ref={n} ours={len(mine)}  {lines[0]}")
        fails += 1
        continue

    diff = sum(1 for y in range(n) for x in range(n) if bool(ref[y][x]) != mine[y][x])
    status = "OK  " if diff == 0 else "DIFF"
    if diff:
        fails += 1
    print(f"[{status}] ecl={ecl} payload={len(text.encode('utf-8')):>4}B  {lines[0]:<20} diff={diff}")

print()
print("RESULT:", "ALL MATCH" if fails == 0 else f"{fails} FAILURES")
sys.exit(0 if fails == 0 else 1)
