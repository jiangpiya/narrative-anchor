import { app, BrowserWindow, dialog } from 'electron';
import path from 'path';
import { initializeDatabase, closeDatabase, getDb } from './database/db';
import { GameSessionModel } from './database/models/GameSessionModel';
import { GameStateModel } from './database/models/GameStateModel';
import { DEFAULT_GAME_STATE } from '../shared/types/store';
import { registerIpcHandlers } from './ipc';   // 导入 IPC 注册函数
import { StateSchemaModel } from './database/models/StateSchemaModel';
import type { StateField } from './database/models/StateSchemaModel';

const isDev = !app.isPackaged;

async function ensureInitialArchive() {
  const db = getDb();
  const sessionModel = new GameSessionModel(db);
  const stateModel = new GameStateModel(db);
  const schemaModel = new StateSchemaModel(db);

  const sessions = sessionModel.listSessions(1);
  if (sessions.length > 0) {
    console.log('[Init] 已有存档，跳过创建');
    return;
  }

  const sessionUuid = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  const sessionName = '新游戏';

  try {
    // 创建会话
    sessionModel.createSession(sessionUuid, sessionName);
    console.log('[Init] 创建初始存档，UUID:', sessionUuid);

    // 保存默认状态（使用 sessionUuid 字符串）
    const stateJson = JSON.stringify(DEFAULT_GAME_STATE);
    stateModel.appendState(sessionUuid, 'game', stateJson);
    console.log('[Init] 已写入默认游戏状态');

    // 保存默认状态 Schema（显式类型）
    const defaultSchema: StateField[] = [
      { name: 'name', type: 'string', defaultValue: '无名旅者' },
      { name: 'race', type: 'string', defaultValue: '人类' },
      { name: 'physicalCondition', type: 'string', defaultValue: '健康' },
      { name: 'mentalState', type: 'string', defaultValue: '平静' },
      { name: 'powerLevel', type: 'number', defaultValue: 1 },
      { name: 'traits', type: 'array', defaultValue: [] },
      { name: 'title', type: 'string', defaultValue: '' },
      { name: 'gold', type: 'number', defaultValue: 10 },
      { name: 'equipment', type: 'array', defaultValue: [] },
      { name: 'skills', type: 'array', defaultValue: [] },
      { name: 'ultimateSkill', type: 'string', defaultValue: null },
      { name: 'friends', type: 'array', defaultValue: [] },
      { name: 'enemies', type: 'array', defaultValue: [] },
      { name: 'location', type: 'string', defaultValue: '新手村' },
      { name: 'date', type: 'string', defaultValue: '第1天' },
      { name: 'mainQuestProgress', type: 'string', defaultValue: '未开始' },
      { name: 'chapterProgress', type: 'number', defaultValue: 0 },
    ];
    schemaModel.save(sessionUuid, defaultSchema);
    console.log('[Init] 已写入默认状态 Schema');
  } catch (error) {
    console.error('[Init] 创建初始存档失败:', error);
  }
}

function createWindow() {
  const preloadPath = path.join(__dirname, '../preload/index.js');
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false, // 关键：防止后台时音频卡顿
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
    await initializeDatabase();       // 1. 数据库初始化
    await ensureInitialArchive();    // 2. 确保初始存档
    registerIpcHandlers();           // 3. 注册 IPC 处理器（关键步骤）
  } catch (error) {
    dialog.showErrorBox('初始化失败', String(error));
    app.quit();
    return;
  }
  createWindow();                    // 4. 创建窗口
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
  closeDatabase();
});

