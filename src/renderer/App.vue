<template>
  <StarsBackground />
  <div class="app-layout starry-bg">
    <HomePage v-if="showHomePage" @start-game="startGame" />
    <div v-else class="app-layout">
      <!-- 侧边栏：只保留状态面板 -->
      <aside v-if="currentView === 'chat'" class="sidebar">
        <StatusPanel />
      </aside>

      <main class="main-content" :class="{ 'full-width': currentView !== 'chat' }">
        <!-- 聊天视图时显示浮动按钮 -->
        <FloatingNavButtons
          v-if="currentView === 'chat'"
          @switch-view="handleSwitchView"
          @exit-to-home="exitToHome"
        />
        <ChatWindow v-if="currentView === 'chat'" />
        <SettingsPage v-else-if="currentView === 'settings'" />
        <ArchiveManager v-else-if="currentView === 'archive'" />
        <!-- NPC 知识库已移除，不再需要 -->
      </main>
    </div>

    <ConfirmDialog ref="confirmDialogRef" />
    <Toast />  <!-- 添加 Toast 组件 -->
    
    <div v-if="showAIDialog" class="modal-overlay">
      <div class="modal-content">
        <h3>⚠️ 需要配置 AI 服务</h3>
        <p>请先配置 API Key 和模型，才能使用 AI 功能。</p>
        <AISettings />
        <button @click="closeAIDialog" class="btn btn-ghost">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch, computed, onUnmounted, ref, provide, nextTick } from 'vue';
import HomePage from './components/HomePage.vue';
import ChatWindow from './components/ChatWindow.vue';
import StatusPanel from './components/Sidebar/StatusPanel.vue';
import ArchiveManager from './components/Sidebar/ArchiveManager.vue';
import SettingsPage from './components/Settings/SettingsPage.vue';
import ConfirmDialog from './components/ConfirmDialog.vue';
import { useGameSessionStore } from './stores/gameSession';
import { useSettingsStore } from './stores/settings';
import AISettings from './components/Settings/AISettings.vue';
import { audioService } from './services/audioService';
import FloatingNavButtons from './components/FloatingNavButtons.vue';  // 导入浮动按钮
import StarsBackground from './components/StarsBackground.vue';
import Toast from './components/Toast.vue';  


const showHomePage = ref(true);
const settingsStore = useSettingsStore();
const gameStore = useGameSessionStore();
const showAIDialog = ref(false);
const currentView = ref<'chat' | 'settings' | 'archive'>('chat');  // 移除 'npc'
provide('switchToChat', () => {
  currentView.value = 'chat';
});

// 处理浮动按钮的视图切换
function handleSwitchView(view: 'archive' | 'settings') {
  currentView.value = view;
  restoreFocusToInput();
}

// 提供给子组件的返回游戏方法
const switchToChat = () => {
  currentView.value = 'chat';
  restoreFocusToInput();
};
provide('switchToChat', switchToChat);

const confirmDialogRef = ref<InstanceType<typeof ConfirmDialog> | null>(null);
provide('confirm', async (title: string, message: string): Promise<boolean> => {
  if (confirmDialogRef.value && typeof confirmDialogRef.value.open === 'function') {
    return await confirmDialogRef.value.open(title, message);
  }
  console.error('ConfirmDialog 组件尚未挂载或没有 open 方法');
  return false;
});

function startGame() {
  showHomePage.value = false;
}

function exitToHome() {
  showHomePage.value = true;
}

function restoreFocusToInput() {
  nextTick(() => {
    const chatTextarea = document.querySelector('.input-area textarea') as HTMLTextAreaElement;
    if (chatTextarea && !chatTextarea.disabled) {
      chatTextarea.focus();
      return;
    }
    const searchInput = document.querySelector('.search-input') as HTMLInputElement;
    if (searchInput && !searchInput.disabled) searchInput.focus();
  });
}

function handleWindowFocus() {
  const active = document.activeElement;
  if (!active || (active.tagName !== 'INPUT' && active.tagName !== 'TEXTAREA')) {
    restoreFocusToInput();
  }
}

function handleGlobalClick(e: MouseEvent) {
  const target = e.target as HTMLElement;
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
    const input = target as HTMLInputElement | HTMLTextAreaElement;
    if (document.activeElement !== input) {
      input.focus();
    }
  }
}

async function checkApiKey() {
  await settingsStore.loadSettings();
  if (!settingsStore.apiKey) {
    showAIDialog.value = true;
  }
}

function closeAIDialog() {
  showAIDialog.value = false;
}

// 监听主菜单显示状态，而不是游戏视图
watch(() => showHomePage.value, (isHome) => {
  if (isHome) {
    // 主菜单：播放菜单音乐
    audioService.playBGM('menu');
  } else {
    // 进入游戏（包括所有游戏内子页面）：统一播放游戏背景音乐
    audioService.playBGM('game');
  }
}, { immediate: true });

onUnmounted(() => {
  window.removeEventListener('focus', handleWindowFocus);
  document.removeEventListener('click', handleGlobalClick);
  if (typeof window !== 'undefined') {
    delete (window as any).__switchToChat;
  }
});
onMounted(async () => {
  await settingsStore.initialize();
  await gameStore.loadCurrentSessionFromLocalStorage();
  window.addEventListener('focus', handleWindowFocus);
  document.addEventListener('click', handleGlobalClick);
  checkApiKey();
});

onUnmounted(() => {
  window.removeEventListener('focus', handleWindowFocus);
  document.removeEventListener('click', handleGlobalClick);
  if (typeof window !== 'undefined') {
    delete (window as any).__switchToChat;
  }
});
</script>

<style scoped>
/* App.vue 特有样式（布局相关） */
.app-layout {
  display: flex;
  height: 100vh;
  width: 100vw;
  background: radial-gradient(ellipse at 30% 40%, #0f1222, #03050a);
  position: relative;
}

.sidebar {
  width: 320px;
  background: var(--bg-sidebar);
  backdrop-filter: blur(12px);
  border-right: 1px solid var(--border-light);
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: 2;
  box-shadow: var(--shadow-sm);
}



.nav-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 20px 20px 0;
  margin-bottom: 20px;
}

.nav-btn {
  padding: 10px 16px;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(59, 130, 246, 0.2));
  border: 1px solid rgba(139, 92, 246, 0.5);
  border-radius: 40px;
  color: white;
  font-weight: 500;
  cursor: pointer;
  backdrop-filter: blur(4px);
  transition: all 0.2s ease;
  text-align: center;
  font-size: 0.9rem;
}

.nav-btn:hover {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.5), rgba(59, 130, 246, 0.4));
  border-color: var(--accent-purple-light);
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}

.nav-btn.active {
  background: linear-gradient(135deg, var(--accent-purple), var(--accent-purple-dark));
  border-color: #c4b5fd;
  box-shadow: var(--shadow-glow);
}

.main-content {
  flex: 1;
}

.main-content.full-width {
  width: 100%;
}
</style>