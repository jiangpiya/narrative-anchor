<template>
  <Teleport to="body">
    <div v-if="visible" class="confirm-overlay" @click.self="cancel">
      <div class="confirm-modal glass-panel">
        <h3>{{ dialogTitle }}</h3>
        <p>{{ dialogMessage }}</p>
        <div class="confirm-buttons">
          <button v-audio:click @click="cancel" class="cancel-btn">🌙 取消</button>
          <button v-audio:click @click="confirm" class="confirm-btn">✨ 确定</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const visible = ref(false);
const dialogTitle = ref('');
const dialogMessage = ref('');
let resolveCallback: ((value: boolean) => void) | null = null;

function open(title: string, message: string): Promise<boolean> {
  return new Promise((resolve) => {
    dialogTitle.value = title;
    dialogMessage.value = message;
    visible.value = true;
    resolveCallback = resolve;
  });
}

function confirm() {
  visible.value = false;
  if (resolveCallback) resolveCallback(true);
  resolveCallback = null;
}

function cancel() {
  visible.value = false;
  if (resolveCallback) resolveCallback(false);
  resolveCallback = null;
}

defineExpose({ open });
</script>

<style scoped>
/* 样式保持不变 */
.confirm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1001;
}

.confirm-modal {
  background: rgba(20, 22, 40, 0.96);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(139, 92, 246, 0.5);
  border-radius: 32px;
  padding: 28px;
  width: 400px;
  max-width: 90%;
  color: #f5f3ff;
  box-shadow: 0 20px 35px rgba(0, 0, 0, 0.5);
}

.confirm-modal h3 {
  margin-top: 0;
  margin-bottom: 16px;
  color: #e0d6ff;
  font-size: 1.3rem;
}

.confirm-modal p {
  margin-bottom: 24px;
  line-height: 1.5;
  color: #cdc6ff;
}

.confirm-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 14px;
}

.confirm-buttons button {
  padding: 8px 24px;
  border-radius: 40px;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
  font-weight: 500;
}

.cancel-btn {
  background: rgba(255, 255, 255, 0.1);
  color: #e0d6ff;
  border: 1px solid rgba(139, 92, 246, 0.5);
}

.confirm-btn {
  background: linear-gradient(135deg, #8b5cf6, #6d28d9);
  color: white;
}

.cancel-btn:hover,
.confirm-btn:hover {
  transform: translateY(-1px);
  filter: brightness(1.05);
}
</style>