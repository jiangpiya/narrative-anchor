<template>
  <div class="msg-row" :class="message.role === 'user' ? 'is-user' : 'is-ai'">
    <!-- AI 头像 -->
    <div v-if="isAI" class="avatar avatar-ai">✨</div>

    <div class="bubble-wrap">
      <div class="role-label">{{ isAI ? '叙事者' : '你' }}</div>
      <div class="bubble" :class="isAI ? 'bubble-ai' : 'bubble-user'">
        <div class="content" v-html="renderedContent"></div>
      </div>
      <!-- 悬浮操作条 -->
      <div class="bubble-tools">
        <button
          v-if="isAI"
          v-audio:click
          class="tool-btn"
          title="标记为关键事件"
          @click="$emit('mark', message)"
        >⭐</button>
        <button
          v-audio:click
          class="tool-btn"
          title="复制内容"
          @click="copyContent"
        >📋</button>
        <span class="turn-tag">#{{ message.turn }}</span>
      </div>
    </div>

    <!-- 用户头像 -->
    <div v-if="!isAI" class="avatar avatar-user">你</div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { marked } from 'marked';
import type { Message } from '@shared/types/store';
import { useToast } from '../composables/useToast';

marked.setOptions({ breaks: true, gfm: true });

const props = defineProps<{ message: Message }>();
defineEmits<{ (e: 'mark', message: Message): void }>();

const toast = useToast();
const isAI = computed(() => props.message.role !== 'user');
const htmlContent = ref('');

watch(() => props.message.content, async (newContent) => {
  if (isAI.value && newContent) {
    htmlContent.value = await marked.parse(newContent);
  } else {
    htmlContent.value = newContent;
  }
}, { immediate: true });

const renderedContent = computed(() => htmlContent.value);

async function copyContent() {
  try {
    await navigator.clipboard.writeText(props.message.content);
    toast.success('已复制到剪贴板');
  } catch {
    toast.error('复制失败');
  }
}
</script>

<style scoped>
.msg-row {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  animation: fadeInUp 0.32s ease-out;
}
.msg-row.is-user {
  flex-direction: row;
  justify-content: flex-end;
}
.msg-row.is-ai {
  justify-content: flex-start;
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ===== 头像 ===== */
.avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  flex-shrink: 0;
  margin-top: 22px;
  user-select: none;
}
.avatar-ai {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.85), rgba(109, 40, 217, 0.9));
  border: 1px solid rgba(196, 181, 253, 0.5);
  box-shadow: 0 0 14px rgba(139, 92, 246, 0.45);
}
.avatar-user {
  background: linear-gradient(135deg, #fbbf24, #d97706);
  color: #2b1d08;
  font-size: 0.82rem;
  font-weight: 700;
  border: 1px solid rgba(251, 191, 36, 0.55);
  box-shadow: 0 2px 10px rgba(245, 158, 11, 0.35);
}

/* ===== 气泡容器 ===== */
.bubble-wrap {
  display: flex;
  flex-direction: column;
  min-width: 0;
  max-width: min(720px, 78%);
}
.is-user .bubble-wrap {
  align-items: flex-end;
}

.role-label {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.4px;
  margin: 0 6px 5px;
  opacity: 0.75;
}
.is-ai .role-label { color: #c4b5fd; }
.is-user .role-label { color: #fbbf24; }

.bubble {
  padding: 12px 18px;
  border-radius: var(--r-lg);
  word-wrap: break-word;
  overflow-wrap: anywhere;
}
.bubble-ai {
  background: rgba(30, 32, 48, 0.78);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(139, 92, 246, 0.35);
  color: #eef1fb;
  border-bottom-left-radius: var(--r-sm);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.28);
}
.bubble-user {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.92), rgba(217, 119, 6, 0.95));
  color: #241a09;
  border-bottom-right-radius: var(--r-sm);
  box-shadow: 0 4px 14px rgba(245, 158, 11, 0.28);
}

/* ===== 悬浮工具条 ===== */
.bubble-tools {
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 5px 4px 0;
  opacity: 0;
  transform: translateY(-3px);
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.msg-row:hover .bubble-tools,
.bubble-tools:focus-within {
  opacity: 1;
  transform: translateY(0);
}
.tool-btn {
  width: 28px;
  height: 28px;
  border-radius: var(--r-sm);
  border: 1px solid transparent;
  background: rgba(255, 255, 255, 0.05);
  cursor: pointer;
  font-size: 0.82rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s ease, border-color 0.15s ease;
}
.tool-btn:hover {
  background: rgba(139, 92, 246, 0.22);
  border-color: rgba(167, 139, 250, 0.45);
}
.turn-tag {
  font-size: 0.66rem;
  color: var(--text-muted);
  margin-left: 4px;
  font-variant-numeric: tabular-nums;
}

/* ===== Markdown 排版 ===== */
.content {
  line-height: 1.65;
  font-size: 0.95rem;
}
.content :deep(p) {
  margin: 0 0 0.7em;
}
.content :deep(p:last-child) {
  margin-bottom: 0;
}
.content :deep(h1),
.content :deep(h2),
.content :deep(h3),
.content :deep(h4) {
  margin: 0.9em 0 0.45em;
  line-height: 1.35;
  color: #ddd6fe;
}
.content :deep(h1) { font-size: 1.35rem; }
.content :deep(h2) { font-size: 1.2rem; }
.content :deep(h3) { font-size: 1.08rem; }
.content :deep(ul),
.content :deep(ol) {
  margin: 0.4em 0 0.7em;
  padding-left: 1.5em;
}
.content :deep(li) {
  margin: 0.2em 0;
}
.content :deep(blockquote) {
  margin: 0.6em 0;
  padding: 6px 14px;
  border-left: 3px solid rgba(167, 139, 250, 0.7);
  background: rgba(139, 92, 246, 0.1);
  color: #c9d2e8;
  border-radius: 0 var(--r-sm) var(--r-sm) 0;
}
.content :deep(pre) {
  background: #0d1020;
  border: 1px solid rgba(139, 92, 246, 0.25);
  padding: 12px 14px;
  border-radius: var(--r-md);
  overflow-x: auto;
  margin: 0.6em 0;
}
.content :deep(code) {
  font-family: 'Cascadia Code', Consolas, monospace;
  font-size: 0.88em;
}
.content :deep(:not(pre) > code) {
  background: rgba(139, 92, 246, 0.18);
  color: #d8c8ff;
  padding: 2px 6px;
  border-radius: 6px;
}
.content :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 0.6em 0;
  font-size: 0.88rem;
}
.content :deep(th),
.content :deep(td) {
  border: 1px solid rgba(167, 139, 250, 0.3);
  padding: 7px 12px;
  text-align: left;
}
.content :deep(th) {
  background: rgba(139, 92, 246, 0.18);
}
.content :deep(hr) {
  border: none;
  border-top: 1px solid rgba(167, 139, 250, 0.3);
  margin: 1em 0;
}
.content :deep(a) {
  color: #a78bfa;
}
</style>
