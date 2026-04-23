import 'dotenv/config';
import { app, BrowserWindow, dialog } from 'electron';
import path from 'path';
import { initializeDatabase, closeDatabase, getModels } from './database/db';
import { registerIpcHandlers } from './ipc';  // 导入 IPC 注册函数

const isDev = !app.isPackaged;

function createWindow() {
  // 预加载脚本路径修正：输出为 dist/preload/index.js
  const preloadPath = path.join(__dirname, '../preload/index.js');
  console.log('[Main] Preload  path:', preloadPath);

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false, // 允许预加载脚本使用 Node.js API（需谨慎）
    },
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(async () => {
  try {
    await initializeDatabase();// 1. 初始化数据库（创建表、运行迁移）
    registerIpcHandlers();  // 2. 注册 IPC 处理器（依赖模型层，模型层在 getModels 中初始化）
  } catch (error) {
    dialog.showErrorBox('数据库初始化失败', String(error));
    app.quit();
    return;
  }

  // 开发环境测试模型层（可选）
  if (isDev) {
    try {
      const models = getModels();
      const testUuid = `test-${Date.now()}`;
      const sessionId = models.gameSession.createSession(testUuid, 'Test Session');
      console.log('[Test] Created session:', { id: sessionId, uuid: testUuid });
      const session = models.gameSession.getSessionByUuid(testUuid);
      console.log('[Test] Retrieved session:', session);
      models.gameSession.deleteSession(testUuid);
      console.log('[Test] Cleaned up test session.');
    } catch (err) {
      console.error('[Test] Model test failed:', err);
    }
  }

  createWindow();// 3. 创建窗口
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  closeDatabase();
});