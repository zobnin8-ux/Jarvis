const { spawn, execSync } = require("child_process");
const http = require("http");
const path = require("path");
const fs = require("fs");
const net = require("net");

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

function readLocalBuildId() {
  const buildPath = path.join(PROJECT_ROOT, ".next", "BUILD_ID");
  if (!fs.existsSync(buildPath)) return null;
  return fs.readFileSync(buildPath, "utf8").trim();
}

function fetchText(targetUrl) {
  return new Promise((resolve, reject) => {
    const req = http.get(targetUrl, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => {
        if (res.statusCode === 200) {
          resolve(body);
          return;
        }
        reject(new Error(`HTTP ${res.statusCode}`));
      });
    });
    req.on("error", reject);
    req.setTimeout(3000, () => {
      req.destroy();
      reject(new Error("timeout"));
    });
  });
}

function getDashboardProbeChunk() {
  const manifestPath = path.join(
    PROJECT_ROOT,
    ".next",
    "react-loadable-manifest.json"
  );
  if (!fs.existsSync(manifestPath)) return null;

  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const entry =
      manifest["components\\ClientDashboard.tsx -> @/layout/DashboardLayout"];
    if (!entry?.files) return null;

    return entry.files.find((file) => file.startsWith("static/chunks/")) ?? null;
  } catch {
    return null;
  }
}

function headOk(targetUrl) {
  return new Promise((resolve) => {
    const req = http.request(targetUrl, { method: "HEAD" }, (res) => {
      resolve(res.statusCode === 200);
      res.resume();
    });
    req.on("error", () => resolve(false));
    req.setTimeout(3000, () => {
      req.destroy();
      resolve(false);
    });
    req.end();
  });
}

async function testServerBuildFresh() {
  const chunk = getDashboardProbeChunk();
  if (!chunk) return true;
  return headOk(`${URL}/_next/${chunk}`);
}

function isListening() {
  return new Promise((resolve) => {
    const socket = net.connect({ port: PORT, host: "127.0.0.1" });
    socket.once("connect", () => {
      socket.end();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
    socket.setTimeout(1500, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

function stopServer() {
  if (process.platform !== "win32") return;
  try {
    execSync(
      `powershell -NoProfile -Command "$c=Get-NetTCPConnection -LocalPort ${PORT} -State Listen -ErrorAction SilentlyContinue; if($c){$c|ForEach-Object{Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue}}"`
    );
  } catch {
    // ignore
  }
}

function waitForServer(timeoutMs = 90000) {
  const started = Date.now();
  return new Promise((resolve) => {
    const tick = async () => {
      try {
        const html = await fetchText(URL);
        if (html.includes('"buildId":"')) {
          resolve(true);
          return;
        }
      } catch {
        /* retry */
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

function chromePath() {
  const localAppData = process.env.LOCALAPPDATA || "";
  const programFiles = process.env.ProgramFiles || "C:\\Program Files";
  const programFilesX86 =
    process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";

  const candidates = [
    path.join(localAppData, "Google", "Chrome", "Application", "chrome.exe"),
    path.join(programFiles, "Google", "Chrome", "Application", "chrome.exe"),
    path.join(programFilesX86, "Google", "Chrome", "Application", "chrome.exe"),
  ];

  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function openBrowser() {
  const chrome = chromePath();
  if (chrome) {
    spawn(chrome, [URL, "--new-window"], {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    }).unref();
    return;
  }

  spawn("cmd", ["/c", "start", "", URL], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  }).unref();
}

async function ensureServer(npmCmd) {
  if (!readLocalBuildId()) {
    showError("Сначала собери проект:\\n\\ncd D:\\Jarvis\\nnpm run build");
    process.exit(1);
  }

  let needsStart = !(await isListening());
  if (!needsStart && !(await testServerBuildFresh())) {
    stopServer();
    await new Promise((resolve) => setTimeout(resolve, 800));
    needsStart = true;
  }

  if (needsStart) {
    startServer(npmCmd);
    const ready = await waitForServer();
    if (!ready) {
      showError(`Сервер не поднялся за 90 с.\\nПроверь порт ${PORT} или npm start`);
      process.exit(1);
    }

    if (!(await testServerBuildFresh())) {
      showError(
        "Сервер отдаёт старые JS-файлы.\\nЗапусти:\\nnpm run build\\nnpm start"
      );
      process.exit(1);
    }
  }
}

async function main() {
  const npmCmd = npmPath();
  if (!npmCmd) {
    showError("Node.js / npm не найден.\\nУстанови Node с https://nodejs.org");
    process.exit(1);
  }

  await ensureServer(npmCmd);
  openBrowser();
}

main().catch(() => {
  showError("Не удалось запустить Jarvis.");
  process.exit(1);
});
