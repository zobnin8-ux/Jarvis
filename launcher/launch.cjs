const { spawn, execSync } = require("child_process");
const http = require("http");
const path = require("path");
const fs = require("fs");

const launcherDir = process.pkg
  ? path.dirname(process.execPath)
  : __dirname;
const PROJECT_ROOT = path.resolve(launcherDir, "..");
const PORT = 3001;
const URL = `http://localhost:${PORT}`;

function showError(message) {
  try {
    execSync(
      `powershell -NoProfile -Command "[System.Reflection.Assembly]::LoadWithPartialName('System.Windows.Forms') | Out-Null; [System.Windows.Forms.MessageBox]::Show('${message.replace(/'/g, "''")}','Jarvis','OK','Error')"`,
      { stdio: "ignore" }
    );
  } catch {
    // ignore
  }
}

function npmPath() {
  const candidates = [
    process.env.npm_execpath ? path.join(path.dirname(process.execPath), "npm.cmd") : null,
    path.join(process.env.ProgramFiles || "C:\\Program Files", "nodejs", "npm.cmd"),
    path.join(process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)", "nodejs", "npm.cmd"),
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  try {
    return execSync("where npm.cmd", { encoding: "utf8" }).trim().split(/\r?\n/)[0];
  } catch {
    return null;
  }
}

function isListening() {
  return new Promise((resolve) => {
    const req = http.get(URL, (res) => {
      resolve(res.statusCode === 200);
      res.resume();
    });
    req.on("error", () => resolve(false));
    req.setTimeout(2000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function waitForServer(timeoutMs = 90000) {
  const started = Date.now();
  return new Promise((resolve) => {
    const tick = async () => {
      if (await isListening()) {
        resolve(true);
        return;
      }
      if (Date.now() - started >= timeoutMs) {
        resolve(false);
        return;
      }
      setTimeout(tick, 600);
    };
    tick();
  });
}

function startServer(npmCmd) {
  if (!fs.existsSync(path.join(PROJECT_ROOT, ".next"))) {
    showError("Сначала собери проект:\\n\\ncd D:\\Jarvis\\nnpm run build");
    process.exit(1);
  }

  const child = spawn(npmCmd, ["start"], {
    cwd: PROJECT_ROOT,
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  child.unref();
}

function openBrowser() {
  spawn("cmd", ["/c", "start", "", URL], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  }).unref();
}

async function main() {
  const npmCmd = npmPath();
  if (!npmCmd) {
    showError("Node.js / npm не найден.\\nУстанови Node с https://nodejs.org");
    process.exit(1);
  }

  if (!(await isListening())) {
    startServer(npmCmd);
    const ready = await waitForServer();
    if (!ready) {
      showError(`Сервер не поднялся за 90 с.\\nПроверь порт ${PORT} или npm start`);
      process.exit(1);
    }
  }

  openBrowser();
}

main().catch(() => {
  showError("Не удалось запустить Jarvis.");
  process.exit(1);
});
