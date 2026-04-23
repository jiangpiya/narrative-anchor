<template>
  <StarsBackground />
  <div class="home-page starry-bg">

    <div class="title-container">
      <h1 class="game-title">叙事锚点</h1>
      <p class="subtitle">Narrative Anchor</p>
    </div>
    <div class="button-group">
      <button v-audio:click class="menu-btn" @click="startNewGame">✨ 开始新游戏</button>
      <button v-audio:click class="menu-btn" @click="openLoadGameModal">📂 读档</button>
      <button v-audio:click class="menu-btn" @click="openSettings">⚙️ 设置</button>
      <button v-audio:click class="menu-btn" @click="showCreditsModal = true">🙏 致谢</button>
      <button v-audio:click class="menu-btn" @click="quitGame">🚪 退出游戏</button>
    </div>

    <CreditsModal v-if="showCreditsModal" @close="showCreditsModal = false" />
    <!-- 读档模态框（优化样式） -->
    <div v-if="showLoadModal" class="modal-overlay" @click.self="closeLoadModal">
      <div class="modal-content load-modal">
        <h3>📖 选择梦境存档</h3>
        <div v-if="loadingSessions" class="loading">
          <div class="spinner"></div>
          <span>唤醒记忆中...</span>
        </div>
        <div v-else class="session-list">
          <div
            v-for="session in sessions"
            :key="session.sessionUuid"
            class="session-item"
            @click="loadGame(session.sessionUuid)"
          >
            <div class="session-name">{{ session.sessionName }}</div>
            <div class="session-date">{{ formatDate(session.updatedAt) }}</div>
          </div>
          <div v-if="sessions.length === 0" class="empty-hint">
            🌙 暂无存档，请先开始新游戏。
          </div>
        </div>
        <div class="modal-buttons">
          <button v-audio:click class="btn btn-ghost" @click="closeLoadModal">取消</button>
        </div>
      </div>
    </div>

    <!-- 设置弹窗 -->
    <SettingsModal v-if="showSettingsModal" @close="closeSettings" />

    <!-- 新建存档时的 Schema 编辑器弹窗 -->
<div v-if="showSchemaEditor" class="modal-overlay" @click.self="closeSchemaEditor">
  <div class="modal-content schema-editor-modal">
    <div class="modal-header">
      <h3>📐 定义玩家状态结构</h3>
      <button v-audio:click class="btn btn-secondary" @click="closeSchemaEditor">返回</button>
    </div>
    <p class="hint">你可以自定义玩家状态的字段（游戏中可编辑，但已存数据可能不兼容）。</p>
    <StateSchemaEditor
      :sessionId="newSessionId"
      @saved="onSchemaSaved"
      @cancel="closeSchemaEditor"
    />
  </div>
</div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useGameSessionStore } from '../stores/gameSession';
import { gameService } from '../services/gameService';
import StateSchemaEditor from './Settings/StateSchemaEditor.vue';
import SettingsModal from './SettingsModal.vue';
import StarsBackground from '../components/StarsBackground.vue';
import { useToast } from '../composables/useToast';
import CreditsModal from './CreditsModal.vue';

const toast = useToast();

const emit = defineEmits(['start-game']);
const gameStore = useGameSessionStore();
const showCreditsModal = ref(false);

// 读档相关
const showLoadModal = ref(false);
const sessions = ref<any[]>([]);
const loadingSessions = ref(false);

// 设置弹窗
const showSettingsModal = ref(false);

// 新建存档 + Schema 编辑器
const showSchemaEditor = ref(false);
let newSessionId = '';
let pendingNewSessionName = '';

async function startNewGame() {
  const name = `新游戏 ${new Date().toLocaleString()}`;
  const newId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  try {
    const result = await gameService.createSession({ sessionUuid: newId, sessionName: name });
    if (result.success) {
      newSessionId = newId;
      pendingNewSessionName = name;
      showSchemaEditor.value = true;
    } else {
     toast.error('创建存档失败：' + result.error);
    }
  } catch (err: any) {
    toast.error(err.message);
  }
}

async function onSchemaSaved() {
  await gameStore.loadSession(newSessionId);
  emit('start-game');
  showSchemaEditor.value = false;
}

function closeSchemaEditor() {
  if (newSessionId) {
    window.electronAPI.game.deleteSession(newSessionId).catch(console.error);
    toast.warning('已取消创建存档');
  }
    showSchemaEditor.value = false;
  newSessionId = '';
}

async function openLoadGameModal() {
  loadingSessions.value = true;
  showLoadModal.value = true;
  try {
    const res = await gameService.getSessions({ limit: 100 });
    if (res.success && res.data) {
      sessions.value = res.data.map((s: any) => ({
        sessionUuid: s.sessionUuid || s.session_uuid,
        sessionName: s.sessionName || s.session_name,
        updatedAt: s.updatedAt || s.updated_at,
      }));
    } else {
      sessions.value = [];
    }
  } catch (err) {
    console.error(err);
    toast.error('加载存档列表失败');
  } finally {
    loadingSessions.value = false;
  }
}

function closeLoadModal() { showLoadModal.value = false; }

async function loadGame(sessionUuid: string) {
  try {
    await gameStore.loadSession(sessionUuid);
    closeLoadModal();
    emit('start-game');
  } catch (err) {
    toast.error('加载存档失败');
  }
}

function openSettings() { showSettingsModal.value = true; }
function closeSettings() { showSettingsModal.value = false; }



function quitGame() {
  if (window.electronAPI.quitApp) window.electronAPI.quitApp();
  else console.error('quitApp not available');
}

function formatDate(timestamp?: string) {
  return timestamp ? new Date(timestamp).toLocaleString() : '';
}
</script>

<style scoped>

/* 背景样式（星空渐变 + 动画） */
.home-page {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(ellipse at 50% 100%, rgba(245, 158, 11, 0.08), transparent 60%),
              radial-gradient(circle at 20% 30%, rgba(59, 130, 246, 0.05), transparent 70%);
  background-color: #0a0c15;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  font-family: 'Segoe UI', 'Poppins', sans-serif;
  overflow: hidden;
}



@keyframes twinkle {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.7; }
}

.title-container {
  text-align: center;
  margin-bottom: 60px;
  z-index: 1;
}

.game-title {
  font-size: 4rem;
  background: linear-gradient(135deg, #c4b5fd, #fbbf24);
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  margin-bottom: 10px;
  letter-spacing: 2px;
}

.subtitle {
  font-size: 1rem;
  color: #9ca3cf;
  letter-spacing: 4px;
}

.button-group {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 220px;
  z-index: 1;
}

.menu-btn {
  background: rgba(20, 22, 40, 0.8);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(139, 92, 246, 0.5);
  border-radius: 40px;
  padding: 12px 24px;
  font-size: 1.1rem;
  font-weight: 500;
  color: #f0eefc;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}

.menu-btn:hover {
  background: #8b5cf6;
  border-color: #c084fc;
  transform: scale(1.02);
  box-shadow: 0 0 12px rgba(139, 92, 246, 0.4);
}

/* ========== 模态框样式（深色玻璃质感） ========== */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.modal-content {
  background: rgba(20, 22, 40, 0.96);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(139, 92, 246, 0.5);
  border-radius: 32px;
  padding: 28px;
  width: 480px;
  max-width: 90%;
  color: #f5f3ff;
  box-shadow: 0 20px 35px rgba(0, 0, 0, 0.5);
}

.modal-content h3 {
  margin: 0 0 20px 0;
  font-size: 1.5rem;
  font-weight: 500;
  background: linear-gradient(135deg, #c4b5fd, #fbbf24);
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  text-align: center;
}

/* 读档专用模态框稍宽 */
.load-modal {
  width: 520px;
}

/* 存档列表区域 */
.session-list {
  max-height: 400px;
  overflow-y: auto;
  padding: 4px 6px;
  margin: 16px 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 自定义滚动条 */
.session-list::-webkit-scrollbar {
  width: 5px;
}
.session-list::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 10px;
}
.session-list::-webkit-scrollbar-thumb {
  background: #8b5cf6;
  border-radius: 10px;
}
.session-list::-webkit-scrollbar-thumb:hover {
  background: #a78bfa;
}

/* 每个存档项 */
.session-item {
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(139, 92, 246, 0.3);
  border-radius: 24px;
  padding: 14px 20px;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 8px;
}

.session-item:hover {
  background: rgba(139, 92, 246, 0.2);
  border-color: #a78bfa;
  transform: translateX(4px);
}

.session-name {
  font-weight: 600;
  font-size: 1rem;
  color: #f0eefc;
}

.session-date {
  font-size: 0.7rem;
  color: #a7a3d0;
}

.empty-hint {
  text-align: center;
  color: #a9a5cf;
  padding: 30px;
  font-style: italic;
}

/* 按钮 */
.modal-buttons {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.btn {
  padding: 8px 20px;
  border-radius: 40px;
  border: none;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.85rem;
}

.btn-ghost {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(139, 92, 246, 0.5);
  color: #e0d6ff;
}

.btn-ghost:hover {
  background: rgba(255, 255, 255, 0.15);
  transform: translateY(-1px);
  border-color: #a78bfa;
}

/* 加载动画 */
.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 30px;
  color: #cdc6ff;
}

.spinner {
  width: 22px;
  height: 22px;
  border: 2px solid rgba(139, 92, 246, 0.3);
  border-top-color: #c084fc;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Schema 编辑器弹窗宽度 */
.schema-editor-modal {
  width: 700px;
  max-width: 90vw;
  max-height: 85vh;
  overflow-y: auto;
}

.hint {
  font-size: 0.8rem;
  color: #9ca3cf;
  margin-bottom: 16px;
}

.btn-secondary {
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(139,92,246,0.4);
  border-radius: 30px;
  padding: 6px 16px;
  color: #e0d6ff;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-secondary:hover {
  background: rgba(255,255,255,0.2);
  transform: translateY(-1px);
}
/* 仅针对 Schema 编辑器弹窗的头部 */
.schema-editor-modal .modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.schema-editor-modal .modal-header h3 {
  margin: 0;  /* 重置全局 h3 的 margin-bottom */
  text-align: left; /* 重置为左对齐，而非全局的居中 */
  background: linear-gradient(135deg, #c4b5fd, #fbbf24);
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  font-size: 1.5rem;
  font-weight: 500;
}

</style>
