import Database from 'better-sqlite3';
import { app } from 'electron';
import fs from 'fs';
import path from 'path';
import { runMigrations } from './migrations';

// 数据库单例实例
let dbInstance: Database.Database | null = null;

/**
 * 获取数据库实例（单例模式）
 * @returns Database 实例
 */
export function getDb(): Database.Database {
  if (!dbInstance) {
    // 确定数据库存储路径：使用 Electron 的 userData 目录
    const userDataPath = app.getPath('userData');
    const dbDir = path.join(userDataPath, 'data');
    const dbPath = path.join(dbDir, 'narrative.db');

    // 确保目录存在
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    // 创建数据库连接，启用 WAL 模式以提高并发性能
    dbInstance = new Database(dbPath);
    dbInstance.pragma('journal_mode = WAL');
    // 强制启用外键约束
    dbInstance.pragma('foreign_keys = ON');

    // 开发环境下开启 SQL 日志（生产环境应关闭）
    if (!app.isPackaged) {
      dbInstance.pragma('verbose');
      console.log(`[Database] Connected to ${dbPath}`);
    }
  }
  return dbInstance;
}

/**
 * 初始化数据库：执行所有未运行的迁移脚本
 * @throws 如果迁移失败则抛出异常
 */
export async function initializeDatabase(): Promise<void> {
  try {
    const db = getDb();
    // 执行迁移（migrations.ts 中的逻辑）
    await runMigrations(db);
    console.log('[Database] Initialization completed successfully.');
  } catch (error) {
    console.error('[Database] Initialization failed:', error);
    throw error; // 上层（主进程）负责捕获并弹窗退出
  }
}

/**
 * 关闭数据库连接（通常在应用退出前调用）
 */
export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
    console.log('[Database] Connection closed.');
  }
}
import {
  GameSessionModel,
  GameStateModel,
  DialogueModel,
  SummaryModel,
  KeyEventModel,
  SettingsDocModel,
  NPCModel,
  NPCMemoryModel,
} from './models';

// 缓存模型实例
let modelsCache: ReturnType<typeof createModels> | null = null;

function createModels(db: Database.Database) {
  return {
    gameSession: new GameSessionModel(db),
    gameState: new GameStateModel(db),
    dialogue: new DialogueModel(db),
    summary: new SummaryModel(db),
    keyEvent: new KeyEventModel(db),
    settingsDoc: new SettingsDocModel(db),
    npc: new NPCModel(db),
    npcMemory: new NPCMemoryModel(db),
  };
} 

/**
 * 获取所有模型实例（共享同一个数据库连接）
 */
export function getModels() {
  if (!modelsCache) {
    const db = getDb();
    modelsCache = {
      gameSession: new GameSessionModel(db),
      gameState: new GameStateModel(db),
      dialogue: new DialogueModel(db),
      summary: new SummaryModel(db),
      keyEvent: new KeyEventModel(db),
      settingsDoc: new SettingsDocModel(db),
      npc: new NPCModel(db),
      npcMemory: new NPCMemoryModel(db),
    };
  }
  return modelsCache;
}