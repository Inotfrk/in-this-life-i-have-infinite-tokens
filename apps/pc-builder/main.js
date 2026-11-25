/**
 * Electron 主进程。
 *
 * 默认打开 1440×900 的窗口加载渲染进程；
 * SMOKE=1 时不显示窗口，等页面加载后截图到 smoke.png 再退出，用于无人工验收。
 */

import { app, BrowserWindow } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SMOKE = process.env.SMOKE === '1';

// 无 GPU 的机器（CI / 容器）也能起窗口，否则 Chromium 会直接崩
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');

async function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    show: !SMOKE,
    backgroundColor: '#070b12',
    title: '3D 装机模拟器 · Demo',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.webContents.on('console-message', (_event, level, message) => {
    if (level >= 2) console.log('[renderer]', message);
  });

  await win.loadFile(path.join(__dirname, 'src', 'index.html'));

  if (SMOKE) {
    await new Promise((resolve) => setTimeout(resolve, 2500));
    try {
      const image = await win.webContents.capturePage();
      await fs.writeFile(path.join(__dirname, 'smoke.png'), image.toPNG());
      console.log('SMOKE_OK');
    } catch (error) {
      console.error('SMOKE_FAIL', error);
    }
    app.quit();
  }
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
