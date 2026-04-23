-- ============================================
-- 叙事锚点（Narrative Anchor）数据库初始化脚本
-- 版本: 001
-- 创建时间: 2026-04-08
-- 描述: 创建核心业务所需的 8 张表
-- ============================================

-- 开启外键约束（SQLite 默认关闭，需在连接时通过 PRAGMA 启用，此处仅作声明）
PRAGMA foreign_keys = ON;

-- --------------------------------------------
-- 1. 游戏会话表 (game_sessions)
-- 记录每一次独立的游戏运行或项目会话
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS game_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_uuid TEXT UNIQUE NOT NULL,          -- 全局唯一标识符，便于导出/同步
    session_name TEXT NOT NULL,                 -- 用户自定义会话名称
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- --------------------------------------------
-- 2. 游戏状态表 (game_states)
-- 存储当前游戏会话的实时状态（JSON 格式，灵活扩展）
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS game_states (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    state_key TEXT NOT NULL,                    -- 状态键名，如 'player', 'plot', 'inventory'
    state_value TEXT NOT NULL,                  -- JSON 字符串存储状态值
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (session_id) REFERENCES game_sessions(session_uuid) ON DELETE CASCADE,
    UNIQUE(session_id, state_key)
);

-- --------------------------------------------
-- 3. 对话记录表 (dialogues)
-- 存储玩家与 NPC 之间的每次对话
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS dialogues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    npcid INTEGER,                          -- 关联的 NPC ID，可为空（表示系统对话）
    npc_id TEXT,                             -- 关联的 NPC，可为空（表示系统对话）
    turn INTEGER NOT NULL,                         -- 对话轮数，便于追踪对话进程
    speaker TEXT NOT NULL,                      -- 'player' 或 NPC 名称
    message TEXT NOT NULL,                      -- 对话内容
    timestamp TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (session_id) REFERENCES game_sessions(session_uuid) ON DELETE CASCADE,
    FOREIGN KEY (npcid) REFERENCES npcs(id) ON DELETE SET NULL
);

-- --------------------------------------------
-- 4. 摘要记录表 (summaries)
-- 存储 LLM 生成的阶段性摘要（例如每 10 轮对话后生成一次）
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS summaries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    summary_text TEXT NOT NULL,                 -- 摘要内容
    start_dialogue_id INTEGER,                  -- 起始对话 ID（可选）
    end_dialogue_id INTEGER,                    -- 结束对话 ID（可选）
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (session_id) REFERENCES game_sessions(session_uuid) ON DELETE CASCADE
);

-- --------------------------------------------
-- 5. 关键事件表 (key_events)
-- 标记重要剧情节点或用户主动保存的事件
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS key_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    event_name TEXT NOT NULL,                   -- 事件名称，如 '主角觉醒'
    event_description TEXT,                     -- 详细描述
    event_timestamp TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (session_id) REFERENCES game_sessions(session_uuid) ON DELETE CASCADE
);

-- --------------------------------------------
-- 6. 设置文档表 (settings_docs)
-- 存储应用或会话级别的 JSON 配置（例如 LLM 参数、UI 偏好）
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS settings_docs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    setting_key TEXT UNIQUE NOT NULL,           -- 如 'app_theme', 'llm_config'
    setting_value TEXT NOT NULL,                -- JSON 字符串
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- --------------------------------------------
-- 7. NPC 基础信息表 (npcs)
-- 存储所有非玩家角色的静态数据
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS npcs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    npc_uuid TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    session_id TEXT NOT NULL,
    first_appearance_turn INTEGER,                   -- NPC 首次出现的对话轮数  
    relation TEXT,                              -- 与玩家的关系（如 '友好', '敌对', '中立'）
    relation_value INTEGER,                      -- 关系数值（-100 到 100，负数表示敌对，正数表示友好）
    notes TEXT,                                 -- 备注信息
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    personality TEXT,                           -- JSON 格式性格描述
    background TEXT,                            -- 背景故事
    avatar_path TEXT,                           -- 头像图片路径
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    UNIQUE(name, session_id),                        -- 同一会话内 NPC 名称唯一
    FOREIGN KEY (session_id) REFERENCES game_sessions(session_uuid) ON DELETE CASCADE
);

-- --------------------------------------------
-- 8. NPC 长期记忆表 (npc_memories)
-- 存储 NPC 对会话中发生事件的记忆（可用于检索增强生成）
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS npc_memories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    npcid INTEGER NOT NULL,                          -- 关联的 NPC ID   
    npc_name TEXT NOT NULL,
    session_id TEXT NOT NULL,
    memory_text TEXT NOT NULL,                  -- 记忆内容
    turn INTEGER NOT NULL,                         -- 记忆形成的对话轮数
    timestamp INTEGER NOT NULL,                      -- 记忆形成的时间戳
    importance INTEGER DEFAULT 1,               -- 重要程度 1-10，用于检索优先级
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),  -- 以秒为单位的 Unix 时间戳
    FOREIGN KEY (npcid) REFERENCES npcs(id) ON DELETE CASCADE,
    FOREIGN KEY (session_id) REFERENCES game_sessions(session_uuid) ON DELETE CASCADE
);




-- 创建常用索引以提升查询性能
CREATE INDEX IF NOT EXISTS idx_game_states_session ON game_states(session_id);
CREATE INDEX IF NOT EXISTS idx_dialogues_session ON dialogues(session_id);
CREATE INDEX IF NOT EXISTS idx_dialogues_npc ON dialogues(npcid);
CREATE INDEX IF NOT EXISTS idx_summaries_session ON summaries(session_id);
CREATE INDEX IF NOT EXISTS idx_key_events_session ON key_events(session_id);
CREATE INDEX IF NOT EXISTS idx_npc_memories_npc ON npc_memories(npcid);
CREATE INDEX IF NOT EXISTS idx_npc_memories_session ON npc_memories(session_id);
