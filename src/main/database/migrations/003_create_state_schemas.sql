-- 状态 Schema 配置表
CREATE TABLE IF NOT EXISTS game_state_schemas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL UNIQUE,          -- 每个会话独立 schema
    schema_json TEXT NOT NULL,                -- JSON 数组，每个元素 { name, type, defaultValue }
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (session_id) REFERENCES game_sessions(session_uuid) ON DELETE CASCADE
);