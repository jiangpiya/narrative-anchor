<template>
  <div class="archive-manager-page">
    <div class="page-header">
      <h2>📖 梦境存档</h2>
      <div class="header-actions">
        <button v-audio:click class="btn btn-back-to-game" @click="goToGame">返回游戏</button>
        <button v-audio:click class="btn btn-primary" @click="openCreateDialog" :disabled="isLoading">✨ 编织新梦境</button>
      </div>
    </div>

    <div v-if="isLoading" class="loading">
      <div class="spinner"></div>
      <span>唤醒记忆中...</span>
    </div>
    <div v-else class="archive-list">
      <div
        v-for="session in sessions"
        :key="session.id"
        class="archive-card card"
        :class="{ current: session.session_uuid === gameStore.currentSessionId }"
      >
        <div class="archive-info">
          <div class="archive-name">{{ session.sessionName || session.session_uuid }}</div>
          <div class="archive-meta">
            <span>🌙 创建：{{ formatDate(session.createdAt) }}</span>
            <span>✨ 更新：{{ formatDate(session.updatedAt) }}</span>
          </div>
        </div>
        <div class="archive-actions">
          <button v-audio:click class="btn btn-ghost" @click="switchTo(session.session_uuid)" :disabled="isLoading || session.session_uuid === gameStore.currentSessionId">
            {{ session.session_uuid === gameStore.currentSessionId ? '🌟 当前' : '🔮 切换' }}
          </button>
          <button v-audio:click class="btn btn-ghost" @click="openRenameDialog(session)" :disabled="isLoading">✏️ 重命名</button>
          <button v-audio:click class="btn btn-ghost" @click="openDuplicateDialog(session)" :disabled="isLoading">📄 复制</button>
          <button v-audio:clicks class="btn btn-danger" @click="remove(session)" :disabled="isLoading || sessions.length === 1">🗑️ 删除</button>
        </div>
      </div>
    </div>

    <!-- 名称输入对话框（使用全局模态框样式） -->
    <div v-if="showNameDialog" class="modal-overlay" @click.self="closeNameDialog">
      <div class="modal-content">
        <h3>{{ dialogTitle }}</h3>
        <input type="text" v-model="inputName" placeholder="请输入存档名称" @keyup.enter="confirmName" autofocus />
        <div class="modal-buttons">
          <button v-audio:click class="btn btn-ghost" @click="closeNameDialog">🌙 取消</button>
          <button v-audio:click class="btn btn-primary" @click="confirmName">✨ 确定</button>
        </div>
      </div>
    </div>

    <!-- Schema 编辑器弹窗 -->
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
import { ref, onMounted ,inject} from 'vue';
import { useGameSessionStore } from '../../stores/gameSession';
import { useToast } from '../../composables/useToast';
import { useConfirm } from '../../composables/useConfirm';
import { gameService } from '../../services/gameService';
import StateSchemaEditor from '../Settings/StateSchemaEditor.vue';

const gameStore = useGameSessionStore();
const toast = useToast();
const confirm = useConfirm();
const switchToChat = inject<() => void>('switchToChat');
const sessions = ref<any[]>([]);
const isLoading = ref(false);

// 名称对话框状态
const showNameDialog = ref(false);
const dialogTitle = ref('');
const inputName = ref('');
let pendingAction: 'create' | 'duplicate' | 'rename' | null = null;
let pendingSession: any = null;
let renameTarget: any = null;

// Schema 编辑器状态
const showSchemaEditor = ref(false);
let newSessionId = '';
let pendingNewSessionName = '';

function openCreateDialog() {
  dialogTitle.value = '新建存档';
  inputName.value = '';
  pendingAction = 'create';
  showNameDialog.value = true;
}

function openDuplicateDialog(session: any) {
  dialogTitle.value = '复制存档';
  inputName.value = `${session.sessionName || session.session_uuid} (副本)`;
  pendingAction = 'duplicate';
  pendingSession = session;
  showNameDialog.value = true;
}

function openRenameDialog(session: any) {
  dialogTitle.value = '重命名存档';
  inputName.value = session.sessionName || session.session_uuid;
  pendingAction = 'rename';
  renameTarget = session;
  showNameDialog.value = true;
}

function closeNameDialog() {
  showNameDialog.value = false;
  inputName.value = '';
  pendingAction = null;
  pendingSession = null;
  renameTarget = null;
}

async function confirmName() {
  const name = inputName.value.trim();
  if (!name) {
    toast.warning('请输入存档名称');
    return;
  }
  if (pendingAction === 'create') {
    // 先创建空白会话（无状态、无 schema）
    await createBlankSession(name);
  } else if (pendingAction === 'duplicate' && pendingSession) {
    await duplicateWithName(pendingSession, name);
  } else if (pendingAction === 'rename' && renameTarget) {
    await renameSession(renameTarget, name);
  }
  closeNameDialog();
}

async function createBlankSession(name: string) {
  isLoading.value = true;
  try {
    const newId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const res = await gameService.createSession({ sessionUuid: newId, sessionName: name });
    if (res.success) {
      newSessionId = newId;
      pendingNewSessionName = name;
      // 打开 Schema 编辑器，强制用户定义状态结构
      showSchemaEditor.value = true;
    } else {
      toast.error(res.error || '创建失败');
    }
  } catch (err: any) {
    toast.error(err.message);
  } finally {
    isLoading.value = false;
  }
}

async function onSchemaSaved() {
  await gameStore.loadSession(newSessionId);
  await loadSessions();
  showSchemaEditor.value = false;
  toast.success('新梦境已编织，状态结构已定义');
}

function closeSchemaEditor() {
  // 用户取消，删除刚创建的空白会话
  if (newSessionId) {
    window.electronAPI.game.deleteSession(newSessionId).catch(console.error);
    toast.warning('已取消创建存档');
  }
  showSchemaEditor.value = false;
  newSessionId = '';
}

async function duplicateWithName(session: any, newName: string) {
  isLoading.value = true;
  try {
    const res = await window.electronAPI.game.duplicateSession(session.session_uuid, newName);
    if (res.success) {
      await loadSessions();
      toast.success('存档已复制');
    } else {
      toast.error(res.error || '复制失败');
    }
  } catch (err: any) {
    toast.error(err.message);
  } finally {
    isLoading.value = false;
  }
}

async function renameSession(session: any, newName: string) {
  isLoading.value = true;
  try {
    const res = await window.electronAPI.game.renameSession(session.session_uuid, newName);
    if (res.success) {
      await loadSessions();
      toast.success('重命名成功');
    } else {
      toast.error(res.error || '重命名失败');
    }
  } catch (err: any) {
    toast.error(err.message);
  } finally {
    isLoading.value = false;
  }
}

async function loadSessions() {
  isLoading.value = true;
  try {
    const res = await gameService.getSessions({ limit: 100 });
    if (res.success && res.data) {
      sessions.value = res.data.map((s: any) => ({
        id: s.id,
        session_uuid: s.sessionUuid || s.session_uuid || s.id,
        sessionName: s.sessionName || s.session_name || s.name || '未命名',
        createdAt: s.createdAt || s.created_at,
        updatedAt: s.updatedAt || s.updated_at,
      }));
    } else {
      toast.error('加载存档列表失败');
    }
  } catch (err) {
    console.error(err);
    toast.error('加载存档列表失败');
  } finally {
    isLoading.value = false;
  }
}

async function switchTo(sessionUuid: string) {
  if (sessionUuid === gameStore.currentSessionId) return;
  isLoading.value = true;
  try {
    await gameStore.loadSession(sessionUuid);
    await loadSessions();
  } catch (err: any) {
    toast.error(err.message || '切换失败');
  } finally {
    isLoading.value = false;
  }
}

async function remove(session: any) {
  if (sessions.value.length === 1) {
    toast.warning('至少保留一个存档，无法删除');
    return;
  }
  const ok = await confirm('删除存档', `确定要删除存档“${session.sessionName}”吗？此操作不可恢复。`);
if (!ok) return;
  try {
    const res = await window.electronAPI.game.deleteSession(session.session_uuid);
    if (res.success) {
      await loadSessions();
      if (session.session_uuid === gameStore.currentSessionId && sessions.value.length > 0) {
        await gameStore.loadSession(sessions.value[0].session_uuid);
      }
      toast.success('存档已删除');
    } else {
      toast.error(res.error || '删除失败');
    }
  } catch (err: any) {
    toast.error(err.message);
  } finally {
    isLoading.value = false;
  }
}

function formatDate(timestamp?: string) {
  if (!timestamp) return '未知';
  try {
    return new Date(timestamp).toLocaleString('zh-CN', { hour12: false });
  } catch {
    return timestamp;
  }
}
// 定义返回游戏的方法
function goToGame() {
  if (switchToChat) {
    switchToChat();
  } else {
    console.error('无法返回游戏：切换方法未提供');
    // 备用方案：直接修改父组件的全局变量（不推荐）
    if (typeof window !== 'undefined' && (window as any).__switchToChat) {
      (window as any).__switchToChat();
    }
  }
}
onMounted(() => {
  loadSessions();
});
</script>

<style scoped>
.archive-manager-page {
  padding: 30px;
  height: 100%;
  overflow-y: auto;
  background: radial-gradient(ellipse at 30% 20%, rgba(30, 25, 60, 0.4), rgba(10, 8, 20, 0.8));
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 28px;
  flex-wrap: wrap;
  gap: 12px;
}

.page-header h2 {
  font-size: 1.8rem;
  background: linear-gradient(135deg, #c4b5fd, #fbbf24);
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.archive-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.archive-card {
  padding: 18px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.archive-card.current {
  border-left: 4px solid #fbbf24;
  background: rgba(139, 92, 246, 0.2);
}

.archive-info {
  flex: 1;
}

.archive-name {
  font-weight: bold;
  font-size: 1.1rem;
  margin-bottom: 6px;
}

.archive-meta {
  font-size: 0.7rem;
  color: var(--text-secondary);
  display: flex;
  gap: 16px;
}

.archive-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.schema-editor-modal {
  width: 700px;
  max-width: 90vw;
  max-height: 85vh;
  overflow-y: auto;
}

.hint {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-bottom: 16px;
}
.modal-footer {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
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