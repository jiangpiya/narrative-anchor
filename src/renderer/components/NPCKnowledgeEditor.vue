<template>
  <div class="npc-editor-page">
    <div class="page-header">
      <h2>📖 NPC 知识库编辑器</h2>
      <div class="header-actions">
        <button v-audio:click class="btn btn-back-to-game" @click="goToGame">返回游戏</button>
        <div class="current-session">🌙 当前存档：{{ currentSessionName }}</div>
      </div>
    </div>

    <div class="editor-layout">
      <div class="npc-list-panel glass-panel">
        <div class="search-wrapper">
          <input type="text" v-model="searchQuery" placeholder="🔍 搜索 NPC..." class="search-input" />
        </div>
        <div v-if="loadingNPCs" class="loading"><div class="spinner"></div><span>加载梦境碎片...</span></div>
        <div v-else class="npc-list">
          <div v-for="npc in filteredNPCs" :key="npc.name" class="npc-item" :class="{ active: selectedNPC?.name === npc.name }" @click="selectNPC(npc)">
            <div class="npc-name">{{ npc.name }}</div>
            <div class="npc-relation">关系: {{ npc.relation }} ({{ npc.relation_value }})</div>
          </div>
          <div v-if="filteredNPCs.length === 0" class="empty-hint">✨ 暂无 NPC，请先在游戏中创建。</div>
        </div>
      </div>

      <div class="npc-detail-panel glass-panel" v-if="selectedNPC">
        <div class="info-section">
          <h3>✨ 基本信息</h3>
          <div class="form-row"><label>关系描述</label><input type="text" v-model="editForm.relation" /></div>
          <div class="form-row"><label>好感度 (-100~100)</label><input type="number" v-model.number="editForm.relationValue" min="-100" max="100" /></div>
          <div class="form-row"><label>备注</label><textarea v-model="editForm.notes" rows="3"></textarea></div>
          <button v-audio:click class="btn btn-success" @click="saveNPCInfo" :disabled="saving">💾 保存修改</button>
        </div>

        <div class="memories-section">
          <div class="memories-header">
            <h3>📜 记忆库</h3>
            <div class="memories-actions">
              <button v-audio:click class="btn btn-primary" @click="openAddMemoryDialog">+ 添加记忆</button>
              <button v-audio:click class="btn btn-danger" @click="resetAllMemories" :disabled="memories.length === 0">重置所有记忆</button>
            </div>
          </div>
          <div v-if="loadingMemories" class="loading"><div class="spinner"></div><span>唤醒记忆中...</span></div>
          <div v-else class="memories-list">
            <div v-for="mem in memories" :key="mem.id" class="memory-card card">
              <div class="memory-content">
                <div class="memory-text">{{ mem.memory_text }}</div>
                <div class="memory-meta">🌟 轮次: {{ mem.turn }} | 重要性: {{ mem.importance || 1 }}</div>
              </div>
              <div class="memory-actions">
                <button v-audio:click class="btn btn-ghost" @click="editMemory(mem)">✏️ 编辑</button>
                <button v-audio:click class="btn btn-danger" @click="deleteMemory(mem.id)">🗑️ 删除</button>
              </div>
            </div>
            <div v-if="memories.length === 0" class="empty-hint">🌙 暂无记忆，可点击“添加记忆”手动录入。</div>
          </div>
        </div>
      </div>
      <div v-else class="empty-state glass-panel">🌟 请从左侧选择一个 NPC</div>
    </div>

    <!-- 添加/编辑记忆弹窗 -->
    <div v-if="showMemoryDialog" class="modal-overlay" @click.self="closeMemoryDialog">
      <div class="modal-content">
        <h3>{{ editingMemory ? '✏️ 编辑记忆' : '✨ 添加记忆' }}</h3>
        <div class="form-row"><label>记忆内容</label><textarea v-model="memoryForm.text" rows="4" placeholder="描述 NPC 知道的事情..."></textarea></div>
        <div class="form-row"><label>重要性 (1-10)</label><input type="number" v-model.number="memoryForm.importance" min="1" max="10" /></div>
        <div class="form-row"><label>发生轮次</label><input type="number" v-model.number="memoryForm.turn" min="1" /></div>
        <div class="modal-buttons">
          <button v-audio:click class="btn btn-ghost" @click="closeMemoryDialog">🌙 取消</button>
          <button v-audio:click class="btn btn-primary" @click="saveMemory" :disabled="savingMemory">✨ 确定</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed, nextTick ,inject} from 'vue';
import { useGameSessionStore } from '../stores/gameSession';
import { useToast } from '../composables/useToast';
import { useConfirm } from '../composables/useConfirm';

const gameStore = useGameSessionStore();
const toast = useToast();
const currentSessionId = computed(() => gameStore.currentSessionId);
const currentSessionName = ref('');
const confirm = useConfirm();
const switchToChat = inject<() => void>('switchToChat');
// 左侧 NPC 列表
const npcs = ref<any[]>([]);
const selectedNPC = ref<any>(null);
const searchQuery = ref('');
const loadingNPCs = ref(false);

// 基本信息编辑表单
const editForm = ref({ relation: '', relationValue: 0, notes: '' });
const saving = ref(false);

// 记忆相关
const memories = ref<any[]>([]);
const loadingMemories = ref(false);
const showMemoryDialog = ref(false);
const editingMemory = ref<any>(null);
const memoryForm = ref({ text: '', importance: 3, turn: 1 });
const savingMemory = ref(false);



// 计算过滤后的 NPC
const filteredNPCs = computed(() => {
  if (!searchQuery.value) return npcs.value;
  const q = searchQuery.value.toLowerCase();
  return npcs.value.filter(npc => npc.name.toLowerCase().includes(q));
});

// 加载 NPC 列表
async function loadNPCs() {
  if (!currentSessionId.value) return;
  loadingNPCs.value = true;
  try {
    const res = await window.electronAPI.game.getNPCsBySession({ sessionUuid: currentSessionId.value });
    if (res.success && res.npcs) {
      npcs.value = res.npcs.sort((a: any, b: any) => {
        const valA = a.relation_value ?? 0;
        const valB = b.relation_value ?? 0;
        return valB - valA;
      });
    } else {
      npcs.value = [];
    }
  } catch (err) {
    console.error('加载 NPC 列表失败:', err);
    toast.error('加载 NPC 列表失败');
    npcs.value = [];
  } finally {
    loadingNPCs.value = false;
  }
}

// 加载记忆
async function loadMemories(npc_name: string) {
  if (!currentSessionId.value) return;
  loadingMemories.value = true;
  try {
    const res = await window.electronAPI.game.getNPCMemories({
      sessionUuid: currentSessionId.value,
      npc_name,
      limit: 100,
    });
    if (res.success && res.memories) {
      memories.value = res.memories.sort((a: any, b: any) => {
        const impA = a.importance ?? 0;
        const impB = b.importance ?? 0;
        if (impA !== impB) return impB - impA;
        return (b.turn ?? 0) - (a.turn ?? 0);
      });
    } else {
      memories.value = [];
    }
  } catch (err) {
    console.error('加载记忆失败:', err);
    toast.error('加载记忆失败');
    memories.value = [];
  } finally {
    loadingMemories.value = false;
  }
}

// 选择 NPC
async function selectNPC(npc: any) {
  selectedNPC.value = npc;
  editForm.value = {
    relation: npc.relation || '',
    relationValue: npc.relation_value ?? 0,
    notes: npc.notes || '',
  };
  await loadMemories(npc.name);
}

// 保存 NPC 基本信息
async function saveNPCInfo() {
  if (!currentSessionId.value || !selectedNPC.value) return;
  saving.value = true;
  try {
    const res = await window.electronAPI.npcEditor.updateNPC({
      sessionUuid: currentSessionId.value,
      npcName: selectedNPC.value.name,
      relation: editForm.value.relation,
      relationValue: editForm.value.relationValue,
      notes: editForm.value.notes,
    });
    if (res.success) {
      // 本地更新
      const idx = npcs.value.findIndex(n => n.name === selectedNPC.value.name);
      if (idx !== -1) {
        npcs.value[idx].relation = editForm.value.relation;
        npcs.value[idx].relation_value = editForm.value.relationValue;
        npcs.value[idx].notes = editForm.value.notes;
        selectedNPC.value = npcs.value[idx];
      }
      toast.success('保存成功');
    } else {
      toast.error(res.error || '保存失败');
    }
  } catch (err: any) {
    toast.error(err.message);
  } finally {
    saving.value = false;
    await nextTick();
    // 保持焦点
    const active = document.activeElement;
    if (!active || (active.tagName !== 'INPUT' && active.tagName !== 'TEXTAREA')) {
      const searchInput = document.querySelector('.search-input');
      if (searchInput) (searchInput as HTMLElement).focus();
    }
  }
}

// 打开添加记忆弹窗
function openAddMemoryDialog() {
  editingMemory.value = null;
  memoryForm.value = { text: '', importance: 3, turn: gameStore.turnNumber + 1 };
  showMemoryDialog.value = true;
}

// 编辑记忆
function editMemory(memory: any) {
  editingMemory.value = memory;
  memoryForm.value = {
    text: memory.memory_text,
    importance: memory.importance || 3,
    turn: memory.turn,
  };
  showMemoryDialog.value = true;
}

// 保存记忆
async function saveMemory() {
  if (!currentSessionId.value || !selectedNPC.value) return;
  if (!memoryForm.value.text.trim()) {
    toast.warning('记忆内容不能为空');
    return;
  }
  savingMemory.value = true;
  try {
    if (editingMemory.value) {
      const res = await window.electronAPI.npcEditor.updateMemory({
        memoryId: editingMemory.value.id,
        memoryText: memoryForm.value.text,
        turn: memoryForm.value.turn,
        importance: memoryForm.value.importance,
      });
      if (res.success) {
        await loadMemories(selectedNPC.value.name);
        toast.success('更新成功');
        closeMemoryDialog();
      } else {
        toast.error(res.error || '更新失败');
      }
    } else {
      const res = await window.electronAPI.npcEditor.addMemory({
        sessionUuid: currentSessionId.value,
        npcName: selectedNPC.value.name,
        memoryText: memoryForm.value.text,
        eventTurn: memoryForm.value.turn,
        importance: memoryForm.value.importance,
        timestamp: Date.now(),
      });
      if (res.success) {
        await loadMemories(selectedNPC.value.name);
        toast.success('添加成功');
        closeMemoryDialog();
      } else {
        toast.error(res.error || '添加失败');
      }
    }
  } catch (err: any) {
    toast.error(err.message);
  } finally {
    savingMemory.value = false;
  }
}

// 删除记忆
async function deleteMemory(memoryId: number) {
  const ok = await confirm('删除记忆', '确定删除这条记忆吗？');
  if (!ok) return;
  try {
    const res = await window.electronAPI.npcEditor.deleteMemory({ memoryId });
    if (res.success) {
      await loadMemories(selectedNPC.value.name);
      toast.success('删除成功');
    } else {
      toast.error(res.error || '删除失败');
    }
  } catch (err: any) {
    toast.error(err.message);
  }
}

// 重置所有记忆
async function resetAllMemories() {
  if (!currentSessionId.value || !selectedNPC.value) return;
  const ok = await confirm('重置所有记忆', `确定清空 ${selectedNPC.value.name} 的所有记忆吗？不可恢复。`);
  if (!ok) return;
  try {
    const res = await window.electronAPI.npcEditor.resetNPCMemories({
      sessionUuid: currentSessionId.value,
      npcName: selectedNPC.value.name,
    });
    if (res.success) {
      await loadMemories(selectedNPC.value.name);
      toast.success('已清空所有记忆');
    } else {
      toast.error(res.error || '重置失败');
    }
  } catch (err: any) {
    toast.error(err.message);
  }
}

function closeMemoryDialog() {
  showMemoryDialog.value = false;
  editingMemory.value = null;
  memoryForm.value = { text: '', importance: 3, turn: 1 };
  nextTick(() => {
    const searchInput = document.querySelector('.search-input');
    if (searchInput) (searchInput as HTMLElement).focus();
  });
}

// 监听会话切换
watch(currentSessionId, async (newId, oldId) => {
  if (newId && newId !== oldId) {
    try {
      const sessions = await window.electronAPI.game.getSessions();
      if (sessions.success && sessions.data) {
        const cur = sessions.data.find(s => s.session_uuid === newId);
        currentSessionName.value = cur?.session_name || '';
      }
    } catch (err) {
      toast.error('获取会话信息失败');
    }
    await loadNPCs();
    selectedNPC.value = null;
    memories.value = [];
  }
});

onMounted(async () => {
  if (currentSessionId.value) {
    try {
      const sessions = await window.electronAPI.game.getSessions();
      if (sessions.success && sessions.data) {
        const cur = sessions.data.find(s => s.session_uuid === currentSessionId.value);
        currentSessionName.value = cur?.session_name || '';
      }
    } catch (err) {
      toast.error('获取会话信息失败');
    }
    await loadNPCs();
  }
});
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

</script>

<style scoped>
.npc-editor-page {
  padding: 30px;
  height: 100%;
  overflow-y: auto;
  background: radial-gradient(ellipse at 30% 20%, rgba(30, 25, 60, 0.6), rgba(10, 8, 20, 0.9));
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
  align-items: center;
  gap: 16px;
}

.current-session {
  font-size: 0.85rem;
  color: #b9b3e0;
  background: rgba(0, 0, 0, 0.4);
  padding: 6px 16px;
  border-radius: 40px;
}

.editor-layout {
  display: flex;
  gap: 24px;
  height: calc(100% - 70px);
}

.npc-list-panel {
  width: 300px;
  padding: 20px;
  display: flex;
  flex-direction: column;
}

.search-wrapper {
  margin-bottom: 20px;
}

.npc-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.npc-item {
  padding: 12px 18px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 24px;
  cursor: pointer;
  transition: all var(--transition-normal);
  border: 1px solid transparent;
}

.npc-item:hover {
  background: rgba(139, 92, 246, 0.2);
  border-color: var(--border-glow);
  transform: translateX(4px);
}

.npc-item.active {
  background: rgba(139, 92, 246, 0.35);
  border-color: var(--accent-purple-light);
  box-shadow: var(--shadow-glow);
}

.npc-name {
  font-weight: 600;
  margin-bottom: 6px;
}

.npc-relation {
  font-size: 0.7rem;
  color: #a7a3d0;
}

.npc-detail-panel {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  color: #c4b5fd;
}

.info-section, .memories-section {
  margin-bottom: 32px;
}

.info-section h3, .memories-header h3 {
  font-size: 1.25rem;
  color: #e0d6ff;
  margin-bottom: 18px;
  border-left: 4px solid #fbbf24;
  padding-left: 14px;
}

.form-row {
  margin-bottom: 20px;
}

.form-row label {
  display: block;
  margin-bottom: 8px;
  color: #cdc6ff;
  font-size: 0.85rem;
}

.memories-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.memories-actions {
  display: flex;
  gap: 12px;
}

.memories-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.memory-card {
  padding: 14px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.memory-content {
  flex: 1;
}

.memory-text {
  margin-bottom: 8px;
  line-height: 1.4;
}

.memory-meta {
  font-size: 0.7rem;
  color: #a9a5cf;
}

.memory-actions {
  display: flex;
  gap: 10px;
}

.empty-hint {
  text-align: center;
  color: #a9a5cf;
  margin-top: 30px;
  font-style: italic;
}
</style>