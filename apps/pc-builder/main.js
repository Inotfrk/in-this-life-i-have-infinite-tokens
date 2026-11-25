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

// 默认走硬件加速；只有在无 GPU 的 CI / 容器里才用 PC_BUILDER_SOFTWARE=1 / SMOKE=1 退回软件渲染
const SOFTWARE = process.env.PC_BUILDER_SOFTWARE === '1' || process.env.SMOKE === '1';
if (SOFTWARE) {
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch('disable-gpu');
  // 没有 GPU 的环境里 Chromium 不再默认回退到 SwiftShader，必须显式打开
  app.commandLine.appendSwitch('enable-unsafe-swiftshader');
} else {
  app.commandLine.appendSwitch('ignore-gpu-blocklist');
  if (process.platform === 'linux') app.commandLine.appendSwitch('ozone-platform-hint', 'auto');
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    show: !SMOKE,
    backgroundColor: '#0d0c0b',
    title: '3D 装机模拟器 · Demo',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.webContents.on('console-message', (_event, level, message) => {
    if (level >= 2) console.log('[renderer]', message);
  });

  // 无头验收时可以带参数：PC_BUILDER_QUERY='autofill=1'
  const query = process.env.PC_BUILDER_QUERY || '';
  await win.loadFile(
    path.join(__dirname, 'src', 'index.html'),
    query ? { search: `?${query.replace(/^\?/, '')}` } : undefined
  );

  if (SMOKE) {
    await new Promise((resolve) => setTimeout(resolve, Number(process.env.PC_BUILDER_WAIT || 2500)));
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
