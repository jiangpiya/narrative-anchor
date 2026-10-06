<template>
  <div v-if="options.length > 0" class="action-buttons">
    <button
      v-audio:click
      v-for="opt in options"
      :key="opt"
      class="action-btn"
      :disabled="disabled"
      @click="$emit('select', opt)"
    >
      <span class="btn-spark">✨</span>{{ opt }}
    </button>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  options: string[];
  disabled?: boolean;
}>();

defineEmits<{
  (e: 'select', option: string): void;
}>();
</script>

<style scoped>
.action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-7);
  background: rgba(10, 12, 21, 0.5);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-top: 1px solid rgba(139, 92, 246, 0.18);
}

.action-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 18px;
  background: rgba(139, 92, 246, 0.1);
  border: 1px solid rgba(167, 139, 250, 0.4);
  border-radius: 40px;
  font-size: 0.85rem;
  font-family: inherit;
  color: #d8c8ff;
  cursor: pointer;
  transition: all 0.18s ease;
}

.btn-spark {
  font-size: 0.8rem;
  opacity: 0.85;
}

.action-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  border-color: #fbbf24;
  color: #241a09;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.35);
}
.action-btn:hover:not(:disabled) .btn-spark {
  opacity: 1;
}

.action-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
