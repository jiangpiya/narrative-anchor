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
      ✨ {{ opt }}
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
  gap: 10px;
  padding: 12px 20px;
  background: rgba(10, 12, 21, 0.6);
  backdrop-filter: blur(8px);
  border-top: 1px solid rgba(139, 92, 246, 0.3);
  border-bottom: none;
}

.action-btn {
  padding: 6px 16px;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(245, 158, 11, 0.5);
  border-radius: 40px;
  font-size: 0.85rem;
  color: #f0eefc;
  cursor: pointer;
  transition: all 0.2s;
  backdrop-filter: blur(2px);
}

.action-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  border-color: #fbbf24;
  color: #1e1b10;
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(245, 158, 11, 0.3);
}

.action-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>