const { app, BrowserWindow, ipcMain, dialog, Menu } = require("electron");
const path = require("path");

const isDev =
  process.env.NODE_ENV === "development" || process.env.ELECTRON_DEV === "1";

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    // hide the menu bar by default (Windows/Linux)
    autoHideMenuBar: true,
    menuBarVisible: false,
  });

  if (isDev) {
    win.loadURL("http://localhost:5173");
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, "../dist-web/index.html"));
  }
}

app.whenReady().then(() => {
  createWindow();
  // Remove the default application menu (hides File/Edit/View/Help)
  try {
    Menu.setApplicationMenu(null);
  } catch (e) {
    // ignore if Menu is not available for some platforms
  }

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit();
});

// Simple file dialog helpers
ipcMain.handle("dialog:openFile", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ["openFile"],
  });
  return canceled ? null : filePaths[0];
});

const fs = require("fs").promises;
ipcMain.handle("native:readFile", async (_, filePath) => {
  return fs.readFile(filePath, "utf8");
});
ipcMain.handle("native:saveFile", async (_, filePath, contents) => {
  await fs.writeFile(filePath, contents, "utf8");
  return true;
});
