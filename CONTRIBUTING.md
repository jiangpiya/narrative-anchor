# 贡献指南

感谢你对叙事锚点 (Narrative Anchor) 的关注！欢迎任何形式的贡献。

## 环境准备

- Node.js ≥ 18.18.0
- npm ≥ 9.0.0

```bash
git clone https://github.com/jiangpiya/narrative-anchor.git
cd narrative-anchor
npm install
npm run dev
```

首次安装后 `postinstall` 会自动执行 `electron-rebuild` 编译原生模块。

## 项目结构

```
src/
├── main/          # Electron 主进程（数据库、IPC 处理）
├── preload/       # 预加载脚本（安全暴露 API 给渲染进程）
├── renderer/      # Vue 3 渲染进程（组件、服务、状态管理）
│   ├── components/   # Vue 组件
│   ├── composables/  # 组合式函数
│   ├── services/     # 业务服务（AI、音频、设置）
│   ├── stores/       # Pinia 状态管理
│   └── utils/        # 工具函数
├── shared/        # 主进程/渲染进程共享类型定义
└── styles/        # 全局样式
```

## 开发

```bash
npm run dev          # 启动 Vite + Electron 开发模式
npm run build        # 构建生产版本
npm run lint         # ESLint 代码检查
npm run format       # Prettier 格式化
npm run dist         # 打包桌面应用
```

## 提交规范

- 提交前请运行 `npm run lint` 确保代码风格一致
- 提交信息使用中文描述，简明扼要说明改动内容
- 一个提交尽量只做一件事

## 提交 Issue

- 使用清晰的标题描述问题
- 提供复现步骤和环境信息（操作系统、Node.js 版本）
- 如果是功能建议，请详细描述使用场景

## 提交 Pull Request

1. Fork 本仓库
2. 创建功能分支：`git checkout -b feature/your-feature`
3. 提交改动：`git commit -m '添加 xxx 功能'`
4. 推送到远程：`git push origin feature/your-feature`
5. 创建 Pull Request，描述改动内容和原因

## 注意事项

- 请勿在代码中提交任何 API Key 或敏感信息
- 不要提交 `.env` 文件、数据库文件（`*.db`）和构建产物
- 新增依赖需审慎评估，优先使用已有技术栈内的方案
