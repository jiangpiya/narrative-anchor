<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content glass-panel">
      <div class="modal-header">
        <h2>🙏 致谢</h2>
        <button v-audio:click class="close-icon" @click="$emit('close')">✖</button>
      </div>
      <div class="modal-body">
        <p><strong>叙事锚点</strong> —— 一个融合叙事与 AI 的交互式游戏引擎。</p>
        <p>本项目离不开以下开源项目的支持：</p>
        <ul>
          <li>Vue 3 & Pinia – 前端框架与状态管理</li>
          <li>Electron – 跨平台桌面应用框架</li>
          <li>better-sqlite3 – 轻量级数据库</li>
          <li>Howler.js – 音频引擎</li>
          <li>marked – Markdown 解析</li>
          <li>lodash – 工具库</li>
        </ul>
        <p>🎵 本游戏使用的背景音乐与 UI 音效来自以下资源：</p>
        <ul>
          <li><strong>Pixabay Music</strong> – 提供自由使用的背景音乐与音效（pixabay.com）</li>
          <li>游戏菜单音乐<strong>《Homecoming》</strong>由<strong>[乌鸦Producer]</strong>提供</li>
        </ul>
        <p>💡 特别感谢所有测试者与贡献者，让这个梦想成真。</p>
        <p class="version">版本 1.0.0</p>
      </div>
      <div class="modal-footer">
        <button v-audio:click class="btn btn-primary" @click="$emit('close')">✨ 知晓 • 继续旅途</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
}

.modal-content {
  width: 500px;
  max-width: 90%;
  background: rgba(20, 22, 40, 0.92);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(139, 92, 246, 0.5);
  border-radius: 32px;
  padding: 24px;
  color: #f0eefc;
  box-shadow: 0 20px 35px rgba(0, 0, 0, 0.5);
  transition: all 0.2s ease;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(139, 92, 246, 0.3);
}

.modal-header h2 {
  margin: 0;
  font-size: 1.6rem;
  background: linear-gradient(135deg, #c4b5fd, #fbbf24);
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
}

.close-icon {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  color: #cdc6ff;
  transition: all 0.2s;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-icon:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: rotate(90deg);
}

.modal-body {
  margin-bottom: 24px;
  line-height: 1.5;
  font-size: 0.9rem;
}

.modal-body ul {
  margin: 12px 0;
  padding-left: 20px;
}

.modal-body li {
  margin: 6px 0;
  color: #e0d6ff;
}

.version {
  text-align: center;
  margin-top: 16px;
  font-size: 0.75rem;
  color: #9ca3cf;
}

.modal-footer {
  display: flex;
  justify-content: center;
}

.btn-primary {
  background: linear-gradient(135deg, #8b5cf6, #6d28d9);
  border: none;
  border-radius: 40px;
  padding: 8px 24px;
  font-size: 0.9rem;
  font-weight: 500;
  color: white;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary:hover {
  transform: translateY(-2px);
  filter: brightness(1.05);
  box-shadow: 0 6px 14px rgba(139, 92, 246, 0.4);
}
</style>