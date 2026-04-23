<template>
  <div class="key-events-manager">
    <div class="header">
      <h3>📌 关键事件</h3>
      <p class="hint">星标标记的事件将自动注入 AI 系统提示，帮助 AI 记住重要剧情。</p>
    </div>
    <div v-if="loading" class="loading">
      <div class="spinner"></div>
      <span>加载中...</span>
    </div>
    <div v-else-if="events.length === 0" class="empty">
      🌙 暂无关键事件，请在聊天界面点击 AI 消息旁的 ⭐ 按钮标记。
    </div>
    <div v-else class="events-list">
      <div v-for="evt in events" :key="evt.id" class="event-card">
        <div class="event-info">
          <div class="event-name">{{ evt.event_name }}</div>
          <div class="event-meta">
            <span>📅 {{ formatDate(evt.event_timestamp) }}</span>
          </div>
          <div class="event-desc">{{ evt.event_description || '无描述' }}</div>
        </div>
        <div class="event-actions">
          <button v-audio:click @click="editEvent(evt)" class="btn-edit">✏️ 编辑</button>
          <button v-audio:click @click="deleteEvent(evt.id)" class="btn-delete">🗑️ 删除</button>
        </div>
      </div>
    </div>

    <!-- 编辑弹窗 -->
    <div v-if="showEditDialog" class="modal-overlay" @click.self="closeEditDialog">
      <div class="modal-content">
        <h3>编辑关键事件</h3>
        <div class="form-row">
          <label>事件名称</label>
          <input type="text" v-model="editForm.name" />
        </div>
        <div class="form-row">
          <label>事件描述</label>
          <textarea v-model="editForm.desc" rows="4"></textarea>
        </div>
        <div class="modal-buttons">
          <button v-audio:click @click="closeEditDialog">取消</button>
          <button v-audio:click @click="saveEdit" class="confirm-btn">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useGameSessionStore } from '../../stores/gameSession';

const gameStore = useGameSessionStore();
const events = ref<any[]>([]);
const loading = ref(false);
const showEditDialog = ref(false);
const editForm = ref({ id: 0, name: '', desc: '' });

async function loadEvents() {
  const sessionId = gameStore.currentSessionId;
  if (!sessionId) return;
  loading.value = true;
  try {
    const res = await window.electronAPI.game.getKeyEvents(sessionId);
    if (res.success && res.events) {
      events.value = res.events;
    } else {
      events.value = [];
    }
  } catch (err) {
    console.error('加载关键事件失败:', err);
  } finally {
    loading.value = false;
  }
}

async function deleteEvent(eventId: number) {
  if (!confirm('确定删除此关键事件吗？')) return;
  try {
    const res = await window.electronAPI.game.deleteKeyEvent(eventId);
    if (res.success) {
      await loadEvents();
    } else {
      alert(res.error || '删除失败');
    }
  } catch (err: any) {
    alert(err.message);
  }
}

function editEvent(evt: any) {
  editForm.value = { id: evt.id, name: evt.event_name, desc: evt.event_description || '' };
  showEditDialog.value = true;
}

async function saveEdit() {
  if (!editForm.value.name.trim()) {
    alert('事件名称不能为空');
    return;
  }
  try {
    const res = await window.electronAPI.game.updateKeyEvent(
      editForm.value.id,
      editForm.value.name.trim(),
      editForm.value.desc
    );
    if (res.success) {
      await loadEvents();
      closeEditDialog();
    } else {
      alert(res.error || '保存失败');
    }
  } catch (err: any) {
    alert(err.message);
  }
}

function closeEditDialog() {
  showEditDialog.value = false;
  editForm.value = { id: 0, name: '', desc: '' };
}

function formatDate(timestamp: string) {
  if (!timestamp) return '未知时间';
  try {
    return new Date(timestamp).toLocaleString();
  } catch {
    return timestamp;
  }
}

watch(() => gameStore.currentSessionId, () => {
  loadEvents();
}, { immediate: true });

onMounted(() => {
  loadEvents();
});
</script>

<style scoped>
.key-events-manager {
  padding: 16px;
}

.header h3 {
  margin: 0 0 8px 0;
  font-size: 1.2rem;
  color: var(--text-secondary, #e0d6ff);
}

.hint {
  font-size: 0.8rem;
  color: var(--text-muted, #9ca3cf);
  margin-bottom: 20px;
}

.loading {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  margin: 30px;
  color: var(--text-secondary, #c4b5fd);
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(139, 92, 246, 0.3);
  border-top-color: var(--accent-purple-light, #c084fc);
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty {
  text-align: center;
  color: var(--text-muted, #9ca3cf);
  margin: 40px 0;
}

.events-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.event-card {
  background: var(--bg-card, rgba(0, 0, 0, 0.3));
  border: 1px solid var(--border-glow, rgba(139, 92, 246, 0.3));
  border-radius: var(--radius-md, 20px);
  padding: 14px 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all var(--transition-fast, 0.2s);
}

.event-card:hover {
  background: rgba(139, 92, 246, 0.1);
  border-color: var(--accent-purple-light, #a78bfa);
}

.event-info {
  flex: 1;
}

.event-name {
  font-weight: bold;
  color: var(--text-primary, #f0eefc);
  margin-bottom: 6px;
}

.event-meta {
  font-size: 0.7rem;
  color: var(--text-muted, #9ca3cf);
  margin-bottom: 6px;
}

.event-desc {
  font-size: 0.85rem;
  color: var(--text-secondary, #cdc6ff);
}

.event-actions {
  display: flex;
  gap: 8px;
}

.btn-edit, .btn-delete {
  padding: 4px 12px;
  border-radius: var(--radius-full, 20px);
  border: none;
  cursor: pointer;
  transition: all var(--transition-fast, 0.2s);
}

.btn-edit {
  background: var(--accent-warm, #fbbf24);
  color: #1e1b10;
}

.btn-delete {
  background: var(--accent-danger, #dc3545);
  color: white;
}

.btn-edit:hover, .btn-delete:hover {
  transform: translateY(-1px);
  filter: brightness(1.05);
}

/* 模态框样式（复用全局） */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--overlay-bg, rgba(0, 0, 0, 0.7));
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: var(--modal-bg, rgba(20, 22, 40, 0.95));
  backdrop-filter: blur(12px);
  border: 1px solid var(--border-glow, rgba(139, 92, 246, 0.4));
  border-radius: var(--radius-xl, 28px);
  padding: 24px;
  width: 450px;
  max-width: 90%;
  color: var(--text-primary, white);
}

.modal-content h3 {
  margin-top: 0;
  margin-bottom: 20px;
}

.form-row {
  margin-bottom: 18px;
}

.form-row label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  font-size: 0.85rem;
  color: var(--text-secondary, #cdc6ff);
}

.form-row input,
.form-row textarea {
  width: 100%;
  padding: 8px 12px;
  background: var(--input-bg, rgba(0, 0, 0, 0.5));
  border: 1px solid var(--border-glow, rgba(139, 92, 246, 0.5));
  border-radius: var(--radius-md, 20px);
  color: var(--text-primary, white);
  font-size: 0.85rem;
}

.modal-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}

.modal-buttons button {
  padding: 6px 18px;
  border-radius: var(--radius-full, 30px);
  border: none;
  cursor: pointer;
  transition: all var(--transition-fast, 0.2s);
}

.modal-buttons button:first-child {
  background: var(--btn-ghost-bg, rgba(255, 255, 255, 0.1));
  color: var(--text-secondary, #e0d6ff);
}

.confirm-btn {
  background: linear-gradient(135deg, var(--accent-purple, #8b5cf6), var(--accent-purple-dark, #6d28d9));
  color: white;
}
</style>
