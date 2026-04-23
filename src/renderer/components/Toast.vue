<template>
  <Teleport to="body">
    <div class="toast-container">
      <div
        v-for="item in toasts"
        :key="item.id"
        class="toast"
        :class="item.type"
      >
        <span class="toast-icon">{{ iconFor(item.type) }}</span>
        <span class="toast-message">{{ item.message }}</span>
        <button v-audio:click class="toast-close" @click="closeToast(item.id)">✕</button>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useToastStore } from '../stores/toast';

const toastStore = useToastStore();
const { toasts } = toastStore;

function iconFor(type: string) {
  switch (type) {
    case 'success': return '✨';
    case 'error':   return '⚠️';
    case 'warning': return '🌙';
    default:        return '📜';
  }
}

function closeToast(id: number) {
  toastStore.removeToast(id);
}
</script>

<style scoped>
.toast-container {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  pointer-events: none;
}

.toast {
  background: rgba(20, 22, 40, 0.95);
  backdrop-filter: blur(16px);
  border-radius: 60px;
  padding: 10px 16px 10px 20px;
  border-left: 4px solid;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.9rem;
  font-weight: 500;
  color: #f0eefc;
  pointer-events: auto;
  animation: slideUp 0.2s ease-out;
}

.toast.success { border-left-color: #10b981; }
.toast.error   { border-left-color: #ef4444; }
.toast.warning { border-left-color: #f59e0b; }
.toast.info    { border-left-color: #8b5cf6; }

.toast-icon {
  font-size: 1.1rem;
}

.toast-message {
  max-width: 300px;
  word-break: break-word;
}

.toast-close {
  background: none;
  border: none;
  color: #a9a5cf;
  font-size: 1rem;
  cursor: pointer;
  padding: 0 4px;
  margin-left: 4px;
  border-radius: 50%;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
}

.toast-close:hover {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>