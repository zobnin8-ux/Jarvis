/**
 * Kill :3001, remove .next, start dev — fixes corrupted Next cache / EADDRINUSE.
 * Usage: npm run dev:clean
 */
import { execSync, spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const PORT = 3001;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function killPort(port) {
  try {
    if (process.platform === "win32") {
      execSync(
        `powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort ${port} -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }"`,
        { stdio: "ignore" }
      );
    } else {
      execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null || true`, {
        shell: true,
        stdio: "ignore",
      });
    }
  } catch {
    // port already free
  }
}

function removeNextCache() {
  const nextDir = path.join(ROOT, ".next");
  if (fs.existsSync(nextDir)) {
    fs.rmSync(nextDir, { recursive: true, force: true });
    console.log("Removed .next");
  }
}

killPort(PORT);
removeNextCache();

console.log(`Starting dev on :${PORT}...`);
const child = spawn("npm", ["run", "dev"], {
  cwd: ROOT,
  stdio: "inherit",
  shell: true,
});

child.on("exit", (code) => process.exit(code ?? 0));
