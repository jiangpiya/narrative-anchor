<template>
  <div v-if="step" class="loading-row">
    <div class="loading-avatar">✨</div>
    <div class="loading-pill">
      <n-spin size="small" />
      <span class="loading-text">{{ step }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { NSpin } from 'naive-ui';
import { useGameSessionStore } from '../stores/gameSession';

const store = useGameSessionStore();
const step = computed(() => store.currentAgentStep);
</script>

<style scoped>
.loading-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: 0 var(--space-7) var(--space-2);
  animation: fadeInUp 0.3s ease-out;
}

.loading-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  flex-shrink: 0;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.85), rgba(109, 40, 217, 0.9));
  border: 1px solid rgba(196, 181, 253, 0.5);
  box-shadow: 0 0 14px rgba(139, 92, 246, 0.45);
}

.loading-pill {
  display: inline-flex;
  align-items: center;
  gap: var(--space-3);
  padding: 10px 18px;
  background: rgba(30, 32, 48, 0.78);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(139, 92, 246, 0.35);
  border-radius: 40px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.28);
}

.loading-text {
  font-size: 0.88rem;
  color: #c4b5fd;
  letter-spacing: 0.3px;
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
</style>
