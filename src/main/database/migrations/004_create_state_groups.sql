-- 状态分组配置表
CREATE TABLE IF NOT EXISTS state_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    group_name TEXT NOT NULL,
    fields TEXT NOT NULL,                -- JSON 数组，存储字段名列表
    sort_order INTEGER DEFAULT 0,        -- 显示顺序
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (session_id) REFERENCES game_sessions(session_uuid) ON DELETE CASCADE,
    UNIQUE(session_id, group_name)
);