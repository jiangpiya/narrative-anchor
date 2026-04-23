<template>
  <div class="message-bubble" :class="[message.role === 'user' ? 'user' : 'assistant']">
    <div class="role-label">{{ message.role === 'user' ? '你' : '✨ 叙事者' }}</div>
    <div class="content" v-html="renderedContent"></div>
    <div class="turn-info">#{{ message.turn }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { marked } from 'marked';
import type { Message } from '@shared/types/store';

marked.setOptions({ breaks: true, gfm: true, headerIds: false, mangle: false });

const props = defineProps<{ message: Message }>();
const htmlContent = ref('');

const parseMarkdown = async (text: string) => {
  if (!text) return '';
  return await marked.parse(text);
};

watch(() => props.message.content, async (newContent) => {
  if (props.message.role === 'assistant') {
    htmlContent.value = await parseMarkdown(newContent);
  } else {
    htmlContent.value = newContent;
  }
}, { immediate: true });

const renderedContent = computed(() => htmlContent.value);
</script>

<style scoped>
.message-bubble {
  max-width: 80%;
  padding: 12px 18px;
  border-radius: 24px;
  position: relative;
  animation: fadeInUp 0.3s ease-out;
  backdrop-filter: blur(2px);
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message-bubble.user {
  align-self: flex-end;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.85), rgba(217, 119, 6, 0.9));
  color: #1e1b10;
  border-bottom-right-radius: 6px;
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.3);
}

.message-bubble.assistant {
  align-self: flex-start;
  background: rgba(30, 32, 48, 0.8);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(139, 92, 246, 0.4);
  color: #f0f3fa;
  border-bottom-left-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.role-label {
  font-size: 0.7rem;
  font-weight: 600;
  margin-bottom: 6px;
  opacity: 0.8;
  letter-spacing: 0.5px;
}

.message-bubble.user .role-label {
  color: #3b2a0f;
}

.message-bubble.assistant .role-label {
  color: #c4b5fd;
}

.content {
  word-wrap: break-word;
  line-height: 1.5;
}

.content :deep(p) {
  margin: 0 0 0.5em;
}
.content :deep(pre) {
  background: #0f111a;
  padding: 10px;
  border-radius: 12px;
  overflow-x: auto;
}
.content :deep(code) {
  font-family: monospace;
  background: #1e1f2c;
  padding: 2px 4px;
  border-radius: 6px;
}
.turn-info {
  font-size: 0.6rem;
  text-align: right;
  margin-top: 6px;
  opacity: 0.6;
}
</style>