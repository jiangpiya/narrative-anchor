<template>
  <div class="status-panel">
    <header class="panel-header">
      <h3 class="panel-title">角色状态</h3>
      <n-tag
        size="small"
        round
        :bordered="false"
        :color="tagColor"
        class="session-tag"
      >
        <span class="tag-text">{{ currentSessionName || '未知存档' }}</span>
      </n-tag>
    </header>

    <!-- 加载中 -->
    <div v-if="!stateSchema.length" class="panel-loading">
      <n-spin size="medium" description="加载状态中..." />
    </div>

    <!-- 尚未配置分组 -->
    <div v-else-if="!stateGroups.length" class="panel-empty">
      <n-empty description="暂无状态分组，可在「设置 → 状态分组」中配置" />
    </div>

    <!-- 状态分组列表 -->
    <div v-else class="status-list">
      <section
        v-for="group in stateGroups"
        :key="group.group_name"
        class="status-card"
      >
        <div class="card-title">{{ group.group_name }}</div>
        <div class="card-content">
          <div
            v-for="fieldName in group.fields"
            :key="fieldName"
            class="status-item"
          >
            <span class="item-icon">{{ getIcon(fieldName) }}</span>
            <span class="item-label">{{ getLabel(fieldName) }}</span>
            <span
              class="item-value"
              :class="{ highlight: changedFields.has(fieldName) }"
            >
              {{ formatValue(getFieldValue(fieldName), getFieldType(fieldName)) }}
            </span>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onBeforeUnmount } from 'vue';
import { NSpin, NTag, NEmpty } from 'naive-ui';
import { useGameSessionStore } from '../../stores/gameSession';
import { useSettingsStore } from '../../stores/settings';

interface StateGroup {
  group_name: string;
  fields: string[];
}

const gameStore = useGameSessionStore();
const settingsStore = useSettingsStore();

const stateSchema = computed<any[]>(() => settingsStore.stateSchema);
const stateGroups = computed<StateGroup[]>(
  () => settingsStore.stateGroups as StateGroup[]
);

// 存档徽章配色（低调深底 + 紫灰文字）
const tagColor = {
  color: 'rgba(0, 0, 0, 0.35)',
  textColor: '#9ca3cf',
  borderColor: 'transparent',
};

const currentSessionName = ref('');
const changedFields = ref<Set<string>>(new Set());
let highlightTimer: ReturnType<typeof setTimeout> | null = null;

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
      const session = res.data.find(
        (s) => (s.session_uuid || s.sessionUuid) === sessionId
      );
      if (session) {
        currentSessionName.value =
          session.session_name || session.sessionName || sessionId.slice(0, 8);
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
  const field = stateSchema.value.find((f) => f.name === name);
  return state?.[name] ?? field?.defaultValue;
}

function getFieldType(name: string) {
  return stateSchema.value.find((f) => f.name === name)?.type || 'string';
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
    chapterProgress: '章节',
  };
  return labels[key] || key;
}

function getIcon(key: string): string {
  const icons: Record<string, string> = {
    name: '👤', race: '🧬', physicalCondition: '💚', mentalState: '🧠',
    powerLevel: '⚡', gold: '💰', equipment: '⚔️', skills: '✨',
    ultimateSkill: '🌟', traits: '🎭', title: '🏅', friends: '👥',
    enemies: '👿', location: '🗺️', date: '📅', mainQuestProgress: '📌',
    chapterProgress: '📖',
  };
  return icons[key] || '📌';
}

// 会话切换：统一加载存档名 / Schema / 分组（替代原先分散的多个 watcher）
async function refreshForSession() {
  changedFields.value.clear();
  await loadSessionName();
  await settingsStore.loadStateSchema();
  await settingsStore.loadStateGroups();
}

watch(
  () => gameStore.currentSessionId,
  (sessionId) => {
    if (sessionId) void refreshForSession();
  },
  { immediate: true }
);

// 状态变化：高亮发生变化的字段 1 秒
watch(
  () => gameStore.currentState,
  (newState, oldState) => {
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
  },
  { deep: true }
);

onBeforeUnmount(() => {
  if (highlightTimer) clearTimeout(highlightTimer);
});
</script>

<style scoped>
.status-panel {
  flex: 1;
  min-height: 0;
  margin: var(--space-4);
  padding: var(--space-5);
  overflow-y: auto;
  display: flex;
  flex-direction: column;

  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur));
  -webkit-backdrop-filter: blur(var(--glass-blur));
  border: 1px solid var(--glass-border);
  border-radius: var(--r-lg);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35);
}

/* 头部 */
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-5);
  padding-bottom: var(--space-3);
  border-bottom: 1px solid rgba(139, 92, 246, 0.25);
}

.panel-title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 600;
  background: linear-gradient(135deg, #c4b5fd, #fbbf24);
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  white-space: nowrap;
}

.session-tag {
  flex-shrink: 0;
}

.tag-text {
  display: inline-block;
  max-width: 132px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: bottom;
}

/* 加载 / 空状态 */
.panel-loading,
.panel-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-6) 0;
}

/* 分组卡片 */
.status-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.status-card {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid transparent;
  border-radius: 12px;
  padding: var(--space-3) var(--space-4);
  transition: all var(--transition-fast);
}

.status-card:hover {
  background: rgba(139, 92, 246, 0.12);
  border-color: rgba(167, 139, 250, 0.4);
}

.card-title {
  font-weight: 600;
  font-size: 0.85rem;
  color: #c4b5fd;
  margin-bottom: var(--space-3);
  border-left: 3px solid var(--accent-warm);
  padding-left: var(--space-2);
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.status-item {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  font-size: 0.8rem;
  line-height: 1.45;
}

.item-icon {
  width: 18px;
  text-align: center;
  font-size: 0.85rem;
  opacity: 0.85;
  flex-shrink: 0;
}

.item-label {
  width: 40px;
  flex-shrink: 0;
  color: #cdc6ff;
  font-weight: 500;
}

.item-value {
  flex: 1;
  min-width: 0;
  color: var(--text-primary);
  word-break: break-word;
  border-radius: 8px;
  transition: background-color var(--transition-fast);
}

.highlight {
  background-color: rgba(255, 235, 140, 0.38);
  padding: 0 var(--space-1);
}
</style>
