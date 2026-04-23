<template>
  <div class="summary-viewer">
    <div class="header">
      <h3>📜 剧情摘要记录</h3>
      <p class="hint">每 20 条对话自动生成一次剧情总结</p>
    </div>
    <div v-if="loading" class="loading">加载中...</div>
    <div v-else-if="summaries.length === 0" class="empty">暂无摘要，请继续游戏。</div>
    <div v-else class="summary-list">
      <div v-for="summary in summaries" :key="summary.id" class="summary-card">
        <div class="summary-meta">
          <span>📅 {{ formatDate(summary.created_at) }}</span>
          <span>🎭 对话范围: {{ summary.start_dialogue_id }} ~ {{ summary.end_dialogue_id }}</span>
        </div>
        <div class="summary-text">{{ summary.summary_text }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useGameSessionStore } from '../../stores/gameSession';

const gameStore = useGameSessionStore();
const summaries = ref<any[]>([]);
const loading = ref(false);

async function loadSummaries() {
  const sessionId = gameStore.currentSessionId;
  if (!sessionId) return;
  loading.value = true;
  try {
    const res = await window.electronAPI.game.getRecentSummaries(sessionId, 100); // 获取最多100条
    if (res.success && res.summaries) {
      summaries.value = res.summaries.sort((a, b) => b.id - a.id); // 最新的在前
    } else {
      summaries.value = [];
    }
  } catch (err) {
    console.error(err);
  } finally {
    loading.value = false;
  }
}

function formatDate(timestamp?: string) {
  if (!timestamp) return '';
  try {
    return new Date(timestamp).toLocaleString();
  } catch {
    return timestamp;
  }
}

watch(() => gameStore.currentSessionId, () => {
  loadSummaries();
}, { immediate: true });
</script>

<style scoped>
.summary-viewer {
  padding: 20px;
}
.header {
  margin-bottom: 20px;
}
.summary-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.summary-card {
  background: rgba(20, 22, 40, 0.6);
  border: 1px solid rgba(139, 92, 246, 0.4);
  border-radius: 20px;
  padding: 16px;
}
.summary-meta {
  display: flex;
  gap: 16px;
  font-size: 0.7rem;
  color: #9ca3cf;
  margin-bottom: 8px;
}
.summary-text {
  color: #f0eefc;
  line-height: 1.4;
}
.loading, .empty {
  text-align: center;
  color: #9ca3cf;
  padding: 40px;
}
</style>