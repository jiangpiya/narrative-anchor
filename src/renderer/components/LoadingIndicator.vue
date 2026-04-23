<template>
  <div v-if="step" class="loading-indicator">
    <div class="spinner"></div>
    <span>{{ step }}</span>
    <div class="dots">...</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useGameSessionStore } from '../stores/gameSession';

const store = useGameSessionStore();
const step = computed(() => store.currentAgentStep);
</script>

<style scoped>
.loading-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 10px 20px;
  background: rgba(20, 22, 40, 0.8);
  backdrop-filter: blur(12px);
  border-radius: 60px;
  border: 1px solid rgba(139, 92, 246, 0.5);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3), 0 0 12px rgba(139, 92, 246, 0.3);
  font-size: 0.85rem;
  font-weight: 500;
  color: #e0d6ff;
  letter-spacing: 0.3px;
  margin: 12px auto;
  width: fit-content;
  max-width: 80%;
  animation: fadeInUp 0.3s ease-out;
}

.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(139, 92, 246, 0.3);
  border-top-color: #c084fc;
  border-right-color: #fbbf24;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

.dots {
  font-size: 1.2rem;
  letter-spacing: 2px;
  animation: pulse 1.4s infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 0.4;
  }
  50% {
    opacity: 1;
  }
}
</style>