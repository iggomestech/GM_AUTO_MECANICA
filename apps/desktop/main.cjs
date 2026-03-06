const { app, BrowserWindow } = require("electron");
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

let backendProcess;

function resolveWindowIcon() {
  const candidates = app.isPackaged
    ? [
        path.join(process.resourcesPath, "app", "apps", "desktop", "assets", "icons", "app.ico"),
        path.join(process.resourcesPath, "app", "apps", "desktop", "assets", "icons", "app.ico.jpg")
      ]
    : [
        path.join(__dirname, "assets", "icons", "app.ico"),
        path.join(__dirname, "assets", "icons", "app.ico.jpg")
      ];

  return candidates.find((filePath) => fs.existsSync(filePath));
}

function resolveProdFrontendFile() {
  return path.join(__dirname, "..", "..", "frontend", "dist", "index.html");
}

function startPackagedBackend() {
  if (!app.isPackaged || backendProcess) {
    return;
  }

  const backendRoot = path.join(process.resourcesPath, "backend");
  const backendEntry = path.join(backendRoot, "dist", "server.js");
  const bundledDb = path.join(backendRoot, "dev.db");
  const userDb = path.join(app.getPath("userData"), "dev.db");

  if (fs.existsSync(bundledDb)) {
    fs.copyFileSync(bundledDb, userDb);
  }

  const databaseUrl = `file:${userDb.replace(/\\/g, "/")}`;

  backendProcess = spawn(process.execPath, [backendEntry], {
    cwd: backendRoot,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      DATABASE_URL: databaseUrl,
      JWT_SECRET: process.env.JWT_SECRET || "gm-sistema-local",
      PORT: "3001",
      NODE_PATH: path.join(backendRoot, "node_modules")
    },
    windowsHide: true,
    stdio: "ignore"
  });
}

function createWindow() {
  const iconPath = resolveWindowIcon();
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    autoHideMenuBar: true,
    icon: iconPath,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const isDev = !app.isPackaged;

  if (isDev) {
    win.loadURL("http://localhost:5173");
    win.webContents.openDevTools({ mode: "detach" });
    return;
  }

  startPackagedBackend();
  win.loadFile(resolveProdFrontendFile());
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    if (backendProcess && !backendProcess.killed) {
      backendProcess.kill();
    }
    app.quit();
  }
});
