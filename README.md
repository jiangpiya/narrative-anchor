叙事锚点 (Narrative Anchor)
一个基于 Electron + Vue 3 的单机叙事游戏引擎，集成大语言模型（DeepSeek/OpenAI）实现动态剧情生成、NPC 智能对话、状态管理与持久化存档。

https://img.shields.io/badge/license-MIT-blue.svg
https://img.shields.io/badge/Electron-27.0.0-47848F?logo=electron
https://img.shields.io/badge/Vue-3.3-4FC08D?logo=vuedotjs
https://img.shields.io/badge/TypeScript-5.3-3178C6?logo=typescript

## 特性
## AI 驱动叙事：接入 DeepSeek / OpenAI 大语言模型，动态生成剧情、角色对话与建议动作。

## NPC 长期记忆：每个 NPC 拥有独立记忆库，AI 扮演时严格遵循其知识边界。

## 动态状态管理：用户可自定义游戏状态字段（Schema）与分组，适配任意规则系统。

## 多存档系统：支持存档的创建、复制、重命名、删除，自动生成剧情摘要。

## 沉浸音频：背景音乐与环境音效独立控制，支持随机播放与 AI 切换音乐。

## 跨平台桌面：基于 Electron 构建，Windows / macOS / Linux 均可运行。

## 深色梦境主题：玻璃质感、星空渐变与流畅动画，营造沉浸叙事氛围。

## 技术栈
类别	技术
前端框架	Vue 3 (Composition API)
状态管理	Pinia
桌面框架	Electron
构建工具	Vite
语言	TypeScript
数据库	better-sqlite3
AI 集成	DeepSeek / OpenAI API
音频引擎	Howler.js
UI 组件	自定义玻璃质感组件

## 快速开始
环境要求
Node.js ≥ 18.18.0

npm ≥ 9.0.0

安装与运行
bash
# 克隆仓库
git clone https://github.com/jiangpiya/narrative-anchor.git
cd narrative-anchor

# 安装依赖
npm install

# 开发模式（启动 Vite + Electron）
npm run dev

# 构建生产版本
npm run build

# 打包应用（Windows / macOS / Linux）
npm run dist         # 打包当前平台
npm run dist:win     # 仅 Windows
npm run dist:mac     # 仅 macOS
npm run dist:linux   # 仅 Linux
首次运行提示：若缺少 better-sqlite3 原生模块，postinstall 会自动运行 electron-rebuild。

## 使用说明
开始新游戏：输入存档名称后，可自定义游戏状态字段（Schema）或使用默认模板。

游戏主界面：左侧展示角色状态面板（可自定义分组），右侧为聊天窗口与建议动作按钮。

AI 对话：输入任意消息，AI 会生成叙事回复、提供行动选项，并自动更新游戏状态、创建 NPC 和记忆。

设定管理：支持上传世界观设定文档（.txt/.md/.docx），AI 清洗后注入系统提示。

NPC 编辑器：查看所有 NPC，编辑其关系、好感度与记忆库。

存档管理：新建、复制、重命名、删除存档，自动生成剧情摘要。

## 项目结构
text
narrative-anchor/
├── src/
│   ├── main/                # Electron 主进程
│   │   ├── database/        # 数据库模型与迁移
│   │   ├── ipc/             # IPC 处理器
│   │   └── index.ts         # 主进程入口
│   ├── preload/             # 预加载脚本
│   │   └── index.ts         # 安全暴露 API
│   ├── renderer/            # Vue 渲染进程
│   │   ├── assets/          # 静态资源（音频、图片）
│   │   ├── components/      # Vue 组件
│   │   ├── composables/     # 组合式函数（toast, confirm）
│   │   ├── services/        # 服务层（AI、音频、设置）
│   │   ├── stores/          # Pinia 状态管理
│   │   ├── utils/           # 工具函数
│   │   ├── App.vue
│   │   ├── main.ts
│   │   └── index.html
│   └── shared/              # 主/渲染进程共享类型
├── dist/                    # 构建输出
├── release/                 # 打包输出
├── public/                  # 静态资源（可选）
├── .env.example             # 环境变量示例
├── package.json
└── README.md

## 配置 AI
进入游戏后，点击「设定管理」→「AI 配置」。

选择供应商（DeepSeek / OpenAI / 自定义），填入 API Key 和模型名称。

点击「测试连接」验证，保存即可。

若未配置 API Key，应用会自动弹出配置窗口。

## 音频致谢
本游戏使用的背景音乐与 UI 音效来自以下免费资源：

Pixabay Music – 提供自由使用的背景音乐与音效

Freesound.org – 社区贡献的音效素材

Sonix – 高质量 UI 交互音效库

OpenGameArt.org – 游戏音频资源社区

游戏菜单音乐<《Homecoming》[乌鸦Producer]提供

感谢所有音频创作者的分享，让叙事之锚的世界更加生动。

## 贡献
欢迎提交 Issue 和 Pull Request。请确保代码符合 ESLint 规范，并测试通过。

## 许可证
MIT License © 2026 胡成辉
