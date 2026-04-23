<template>
  <div class="status-panel">
    <div class="panel-header">
      <h3>角色状态</h3>
      <div class="session-badge">当前存档：{{ currentSessionName || '未知' }}</div>
    </div>
    <div v-if="!stateSchema.length" class="loading">加载中...</div>
    <div v-else class="status-grid">
      <div v-for="group in stateGroups" :key="group.group_name" class="status-card">
        <div class="card-title">{{ group.group_name }}</div>
        <div class="card-content">
          <div v-for="fieldName in group.fields" :key="fieldName" class="status-item">
            <span class="item-icon">{{ getIcon(fieldName) }}</span>
            <span class="item-label">{{ getLabel(fieldName) }}：</span>
            <span class="item-value" :class="{ highlight: changedFields.has(fieldName) }">
              {{ formatValue(getFieldValue(fieldName), getFieldType(fieldName)) }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, onMounted, ref } from 'vue';
import { useGameSessionStore } from '../../stores/gameSession';
import { useSettingsStore } from '../../stores/settings';
import { gameService } from '../../services/gameService';

const gameStore = useGameSessionStore();
const settingsStore = useSettingsStore();

const stateSchema = computed(() => settingsStore.stateSchema);
const stateGroups = computed(() => settingsStore.stateGroups);
const changedFields = ref<Set<string>>(new Set());
let highlightTimer: any = null;
const currentSessionName = ref('');

async function loadSessionName() {
  const sessionId = gameStore.currentSessionId;
  if (!sessionId) {
    currentSessionName.value = '';
    return;
  }
  try {
    // 直接调用 IPC 获取会话列表，避免 service 层字段映射问题
    const res = await window.electronAPI.game.getSessions();
    if (res.success && res.data) {
      // 兼容两种字段名（优先下划线）
      const session = res.data.find(s => (s.session_uuid || s.sessionUuid) === sessionId);
      if (session) {
        currentSessionName.value = session.session_name || session.sessionName || sessionId.slice(0, 8);
      } else {
        currentSessionName.value = sessionId.slice(0, 8);
      }
    } else {
      currentSessionName.value = sessionId.slice(0, 8);
    }
  } catch (err) {
    console.error('获取会话名称失败:', err);
    currentSessionName.value = sessionId.slice(0, 8);
  }
}


function getFieldValue(name: string) {
  const state = gameStore.currentState;
  const field = stateSchema.value.find(f => f.name === name);
  return state?.[name] ?? field?.defaultValue;
}

function getFieldType(name: string) {
  return stateSchema.value.find(f => f.name === name)?.type || 'string';
}

function formatValue(value: any, type: string) {
  if (value === undefined || value === null) return '无';
  if (type === 'array') return Array.isArray(value) ? value.join(', ') : String(value);
  if (type === 'object') return JSON.stringify(value);
  return String(value);
}

function getLabel(key: string): string {
  const labels: Record<string, string> = {
    name: '姓名', race: '种族', physicalCondition: '体征', mentalState: '精神',
    powerLevel: '战力', gold: '金币', equipment: '装备', skills: '技能',
    ultimateSkill: '绝技', traits: '特性', title: '称号', friends: '好友',
    enemies: '仇敌', location: '位置', date: '日期', mainQuestProgress: '主线',
    chapterProgress: '章节'
  };
  return labels[key] || key;
}

function getIcon(key: string): string {
  const icons: Record<string, string> = {
    name: '👤', race: '🧬', physicalCondition: '💚', mentalState: '🧠',
    powerLevel: '⚡', gold: '💰', equipment: '⚔️', skills: '✨',
    ultimateSkill: '🌟', traits: '🎭', title: '🏅', friends: '👥',
    enemies: '👿', location: '🗺️', date: '📅', mainQuestProgress: '📌',
    chapterProgress: '📖'
  };
  return icons[key] || '📌';
}

async function loadGroups() {
  await settingsStore.refreshGroups();
}
watch(() => gameStore.currentSessionId, () => {
  loadGroups();
}, { immediate: true });

// 可选：监听 groupsVersion 变化（如果 store 中使用 groupsVersion 触发更新）
watch(() => settingsStore.groupsVersion, () => {
  // 由于 stateGroups 已经是 computed，理论上不需要额外操作，但可保留以强制刷新
});
watch(() => gameStore.currentState, (newState, oldState) => {
  if (!newState) return;
  const changed = new Set<string>();
  for (const field of stateSchema.value) {
    const oldVal = oldState?.[field.name];
    const newVal = newState[field.name];
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changed.add(field.name);
    }
  }
  if (changed.size) {
    changedFields.value = changed;
    if (highlightTimer) clearTimeout(highlightTimer);
    highlightTimer = setTimeout(() => changedFields.value.clear(), 1000);
  }
}, { deep: true });

watch(() => gameStore.currentSessionId, async (newId) => {
  if (newId) {
    await loadSessionName();
    await settingsStore.loadStateSchema();
    await settingsStore.loadStateGroups();
  }
}, { immediate: true });

onMounted(() => {
  if (gameStore.currentSessionId) {
    settingsStore.loadStateSchema();
    settingsStore.loadStateGroups();
  }
});
// 可选：监听 groupsVersion 强制刷新
watch(() => settingsStore.groupsVersion, () => {
  // 由于 stateGroups 是 computed，会自动更新，无需额外操作
});
</script>

<style scoped>
.status-panel {
  background: rgba(20, 22, 40, 0.6);
  backdrop-filter: blur(12px);
  border-radius: 28px;
  padding: 20px;
  margin: 16px;
  border: 1px solid rgba(139, 92, 246, 0.4);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
  transition: all 0.2s;
  /* 新增：允许纵向滚动 */
  flex: 1;
  overflow-y: auto;
  /* 确保滚动时不破坏布局 */
  min-height: 0;
}

/* 自定义滚动条（与全局保持一致） */
.status-panel::-webkit-scrollbar {
  width: 0px;
}
.status-panel::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 10px;
}
.status-panel::-webkit-scrollbar-thumb {
  background: #8b5cf6;
  border-radius: 10px;
}
.status-panel::-webkit-scrollbar-thumb:hover {
  background: #a78bfa;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  flex-wrap: wrap;        /* 允许徽章换行 */
  gap: 8px;
  margin-bottom: 20px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(139, 92, 246, 0.3);
}

.panel-header h3 {
  margin: 0;
  font-size: 2rem;
  background: linear-gradient(135deg, #c4b5fd, #fbbf24);
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  white-space: nowrap;    /* 强制标题不换行 */
}

.session-badge {
  font-size: 0.7rem;
  color: #9ca3cf;
  background: rgba(0, 0, 0, 0.3);
  padding: 4px 12px;
  border-radius: 30px;
  flex-shrink: 0;         /* 防止徽章被压缩 */
  white-space: nowrap;    /* 徽章内容不换行 */
  overflow: hidden;
  text-overflow: ellipsis; /* 如果过长则显示省略号 */
  max-width: 245px;
}


.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}

.status-card {
  background: rgba(0, 0, 0, 0.35);
  border-radius: 20px;
  padding: 12px 16px;
  transition: all 0.2s;
}
.status-card:hover {
  background: rgba(139, 92, 246, 0.15);
  border-color: #a78bfa;
}
.card-title {
  font-weight: 600;
  font-size: 0.9rem;
  color: #c4b5fd;
  margin-bottom: 12px;
  border-left: 3px solid #fbbf24;
  padding-left: 8px;
}
.card-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.status-item {
  display: flex;
  align-items: baseline;
  font-size: 0.8rem;
  line-height: 1.4;
}
.item-icon {
  width: 24px;
  font-size: 0.9rem;
  opacity: 0.8;
}
.item-label {
  width: 70px;
  color: #cdc6ff;
  font-weight: 500;
}
.item-value {
  flex: 1;
  color: #f0eefc;
  word-break: break-word;
  transition: background-color 0.2s ease;
}
.highlight {
  background-color: rgba(255, 235, 140, 0.4);
  border-radius: 12px;
  padding: 0 4px;
}
.loading {
  text-align: center;
  padding: 40px;
  color: #9ca3cf;
}
</style>