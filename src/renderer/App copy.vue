<template>
  <div class="app-layout">
    <aside class="sidebar">
      <ArchiveManager />
      <StatusPanel />
    </aside>
    <main class="chat-area">
      <ChatWindow />
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import ChatWindow from './components/ChatWindow.vue';
import StatusPanel from './components/Sidebar/StatusPanel.vue';
import ArchiveManager from './components/Sidebar/ArchiveManager.vue';
import { useGameSessionStore } from './stores/gameSession';

const gameStore = useGameSessionStore();

onMounted(async () => {
  // 尝试从 localStorage 恢复上次会话
  await gameStore.loadCurrentSessionFromLocalStorage();
  // 注意：不再自动创建默认会话，因为主进程已保证至少有一个存档
  // ArchiveManager 组件会处理选择第一个会话
});
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  background: #f0f2f5;
}

.app-layout {
  display: flex;
  height: 100vh;
  width: 100%;
}

.sidebar {
  width: 280px;
  flex-shrink: 0;
  background: #f8f9fa;
  border-right: 1px solid #e9ecef;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.chat-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
</style>