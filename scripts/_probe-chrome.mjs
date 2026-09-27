import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
const chrome = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const port = 9611;
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "cdp-t-"));
const p = spawn(chrome, ["--headless=new","--disable-gpu","--no-first-run","--no-default-browser-check",`--remote-debugging-port=${port}`,`--user-data-dir=${profile}`,"about:blank"], { stdio: ["ignore","pipe","pipe"] });
p.stderr.on("data", (d) => process.stdout.write("STDERR: " + d.toString().slice(0,400) + "\n"));
p.on("exit", (c) => console.log("CHROME EXIT", c));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (let i = 0; i < 20; i++) {
  try { const r = await fetch(`http://127.0.0.1:${port}/json/version`); const j = await r.json(); console.log("OK", j["Browser"]); break; }
  catch (e) { console.log("try", i, e.message.slice(0,80)); }
  await sleep(300);
}
p.kill();
