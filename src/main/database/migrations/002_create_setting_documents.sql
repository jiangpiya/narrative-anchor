-- 设定文档表（用于存储用户上传的世界观、角色设定等）
CREATE TABLE IF NOT EXISTS setting_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,           -- 原始文件名
    file_path TEXT NOT NULL UNIQUE,   -- 文件绝对路径
    is_core INTEGER NOT NULL DEFAULT 0,  -- 是否为核心设定（0=否，1=是）
    enabled INTEGER NOT NULL DEFAULT 1,  -- 是否启用（用于注入 AI）
    is_cleaned INTEGER NOT NULL DEFAULT 0, -- 是否已注入到系统提示（标记位）
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_setting_documents_enabled ON setting_documents(enabled);
CREATE INDEX IF NOT EXISTS idx_setting_documents_is_core ON setting_documents(is_core);