<template>
  <div class="floating-nav">
    <button
      v-audio:click
      class="nav-icon-btn"
      @click="switchToView('settings')"
      title="设置"
    >
      <span class="icon">⚙️</span>
      <span class="label">设置</span>
    </button>

    <button
      v-audio:click
      class="nav-icon-btn"
      @click="switchToView('archive')"
      title="存档管理"
    >
      <span class="icon">📚</span>
      <span class="label">存档</span>
    </button>

    <button
      v-audio:click
      class="nav-icon-btn"
      @click="exitToHome"
      title="主菜单"
    >
      <span class="icon">🏠</span>
      <span class="label">主菜单</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { inject } from 'vue';

const emit = defineEmits(['switchView', 'exitToHome']);
const switchToChat = inject('switchToChat', () => {});

// 这些方法需要从 App.vue 传递，或者直接通过 inject 获取全局切换函数
// 为了解耦，这里通过 emit 让父组件处理，或者直接使用全局挂载的函数
// 简单起见，我们直接使用全局函数（如果有）或者 emit
// 但为了符合 Vue 习惯，使用 emit 让 App.vue 处理

function switchToView(view: 'archive' | 'settings') {
  // 通知父组件切换视图
  emit('switchView', view);
}

function exitToHome() {
  emit('exitToHome');
}
</script>

<style scoped>
.floating-nav {
  position: absolute;
  top: 20px;
  right: 20px;
  display: flex;
  gap: 12px;
  z-index: 10;
}

.nav-icon-btn {
  background: var(--bg-glass-strong, rgba(20, 22, 40, 0.9));
  backdrop-filter: blur(8px);
  border: 0px solid var(--border-glow, rgba(139, 92, 246, 0.5));
  border-radius: 48px;
  padding: 10px;
  cursor: pointer;
  transition: all var(--transition-fast, 0.2s);
  display: flex;
  align-items: center;
  gap: 0;
  overflow: hidden;
  width: 44px;
  justify-content: center;
  color: var(--text-primary, #eef2ff);
}

.nav-icon-btn .icon {
  font-size: 1.3rem;
  transition: transform 0.2s;
}

.nav-icon-btn .label {
  font-size: 0;
  opacity: 0;
  white-space: nowrap;
  transition: all 0.2s ease;
  font-weight: 500;
  margin-left: 0;
}

.nav-icon-btn:hover {
  width: auto;
  padding: 10px 18px;
  gap: 8px;
  background: linear-gradient(135deg, var(--accent-purple, #8b5cf6), var(--accent-purple-dark, #6d28d9));
  border-color: var(--accent-purple-light, #a78bfa);
  box-shadow: var(--shadow-glow, 0 0 12px rgba(139, 92, 246, 0.4));
}

.nav-icon-btn:hover .label {
  font-size: 0.9rem;
  opacity: 1;
  margin-left: 6px;
}

.nav-icon-btn:hover .icon {
  transform: scale(1.05);
}
</style>