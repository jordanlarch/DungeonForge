#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const script = path.join(path.dirname(fileURLToPath(import.meta.url)), "build-srd-data.py");
const candidates = process.platform === "win32" ? ["python", "py", "python3"] : ["python3", "python"];

for (const cmd of candidates) {
  const result = spawnSync(cmd, [script], { stdio: "inherit", shell: process.platform === "win32" });
  if (result.status === 0) process.exit(0);
  if (result.error && "code" in result.error && result.error.code !== "ENOENT") {
    process.exit(result.status ?? 1);
  }
}

console.error("Could not find Python. Install Python 3 and ensure it is on your PATH.");
process.exit(1);
