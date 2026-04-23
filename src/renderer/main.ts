import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { marked } from 'marked';
import App from './App.vue';
import { useSettingsStore } from './stores/settings';
import { useGameSessionStore } from './stores/gameSession';
import { createRouter, createWebHistory } from 'vue-router'
import { vAudio } from './directives/audio';
import '../styles/global.css'


const router = createRouter({
  history: createWebHistory(),
  routes: [
    // 你的路由配置
  ]
});

// 配置 marked
marked.setOptions({
  breaks: true,   // 支持换行转 <br>
  gfm: true,      // 启用 GitHub 风格 Markdown
});

const app = createApp(App);
const pinia = createPinia();
app.use(router)  // ← 关键步骤
app.use(pinia);

// 注册音频指令
app.directive('audio', vAudio);

async function initializeStores() {
  const settingsStore = useSettingsStore();
  await settingsStore.loadSettings();

  const gameStore = useGameSessionStore();
  await gameStore.loadCurrentSessionFromLocalStorage();
}

initializeStores().catch(console.error);

app.mount('#app');