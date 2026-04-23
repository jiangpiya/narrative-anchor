<template>
  <div class="input-area">
    <textarea
      ref="textareaRef"
      v-model="inputText"
      :disabled="isSending"
      placeholder="🔥 讲述你的行动... (Enter 发送, Shift+Enter 换行)"
      @keydown="handleKeydown"
      rows="2"
    />
    <button
      v-audio:click
      @click="send"
      :disabled="isSending || !inputText.trim()"
    >
      {{ isSending ? '✨ 编织中...' : '📜 发送' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue';

const props = defineProps<{
  isSending?: boolean;
}>();

const emit = defineEmits<{
  (e: 'send', message: string): void;
}>();

const inputText = ref('');
const textareaRef = ref<HTMLTextAreaElement | null>(null);

async function send() {
  const text = inputText.value.trim();
  if (!text || props.isSending) return;
  emit('send', text);
  inputText.value = '';
  await nextTick();
  if (textareaRef.value) {
    textareaRef.value.style.height = 'auto';
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    send();
  }
}

function resetSending() {
  // 无需额外逻辑，禁用状态由父组件传递的 isSending prop 控制
}

defineExpose({
  resetSending,
});
</script>

<style scoped>
.input-area {
  display: flex;
  gap: 12px;
  padding: 18px 24px;
  background: rgba(10, 12, 21, 0.7);
  backdrop-filter: blur(16px);
  border-top: 1px solid rgba(245, 158, 11, 0.3);
  align-items: flex-end;
  position: relative;
  z-index: 2;
}

textarea {
  flex: 1;
  resize: none;
  background: rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(245, 158, 11, 0.4);
  border-radius: 24px;
  padding: 12px 18px;
  font-family: inherit;
  font-size: 14px;
  color: #fff5e6;
  transition: all 0.2s;
  line-height: 1.4;
}

textarea:focus {
  outline: none;
  border-color: #f59e0b;
  box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.3);
}

textarea::placeholder {
  color: #aaa7c0;
}

textarea:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

button {
  padding: 10px 28px;
  border-radius: 40px;
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: #1e1b10;
  border: none;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.4);
}

button:hover:not(:disabled) {
  transform: translateY(-2px);
  filter: brightness(1.05);
  box-shadow: 0 6px 16px rgba(245, 158, 11, 0.5);
}

button:disabled {
  background: #555;
  box-shadow: none;
  cursor: not-allowed;
  color: #aaa;
}
</style>