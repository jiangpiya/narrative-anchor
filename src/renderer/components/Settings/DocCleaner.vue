<template>
  <div class="doc-cleaner">
    <div class="editor">
      <textarea v-model="editableMarkdown" rows="20" placeholder="清洗后的 Markdown 内容"></textarea>
    </div>
    <div class="actions">
      <label class="core-checkbox">
        <input type="checkbox" v-model="isCore" />
        <span>🌟 标记为新文档为核心设定</span>
      </label>
      <button v-audio:click @click="validateFormat" class="btn-secondary">🔍 验证格式</button>
      <button v-audio:click @click="save" :disabled="saving" class="btn-primary">{{ saving ? '💾 保存中...' : '✨ 保存' }}</button>
    </div>
    <p v-if="formatError" class="error">{{ formatError }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useToast } from '../../composables/useToast';

const props = defineProps<{
  initialMarkdown: string;
  docId: number;
  initialIsCore?: boolean;
}>();
const emit = defineEmits<{ (e: 'saved', newDoc: any): void }>();

const toast = useToast();
const editableMarkdown = ref(props.initialMarkdown);
const saving = ref(false);
const formatError = ref('');
const isCore = ref(props.initialIsCore ?? false);

function validateFormat() {
  const required = ['## 核心设定', '## 角色列表', '## 剧情背景', '## 重要物品/地点'];
  const missing = required.filter(title => !editableMarkdown.value.includes(title));
  formatError.value = missing.length ? `缺少章节: ${missing.join(', ')}` : '';
  if (!formatError.value) toast.success('格式验证通过！');
  else toast.warning(formatError.value);
}

async function save() {
  saving.value = true;
  try {
    const newDoc = await window.electronAPI.settingsDocs.saveCleaned(props.docId, editableMarkdown.value, isCore.value);
    emit('saved', newDoc);
    toast.success('文档已保存');
  } catch (err: any) {
    toast.error(err.message || '保存失败');
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.doc-cleaner {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.editor textarea {
  width: 100%;
  background: var(--input-bg, #0f111a);
  border: 1px solid var(--border-glow, #6b63a0);
  color: var(--text-primary, #eef2ff);
  border-radius: var(--radius-md, 20px);
  padding: 14px;
  font-family: monospace;
  font-size: 0.9rem;
  resize: vertical;
  transition: all var(--transition-fast, 0.2s);
}

.editor textarea:focus {
  border-color: var(--accent-purple-light, #a78bfa);
  box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.25);
  outline: none;
}

.actions {
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.core-checkbox {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--bg-glass-light, rgba(30, 32, 48, 0.6));
  padding: 6px 14px;
  border-radius: var(--radius-full, 40px);
  border: 1px solid var(--border-glow, rgba(139, 92, 246, 0.4));
  cursor: pointer;
  font-size: 0.8rem;
  transition: all var(--transition-fast, 0.2s);
  margin-right: auto;
}

.core-checkbox:hover {
  border-color: var(--accent-purple-light, #a78bfa);
  background: rgba(139, 92, 246, 0.2);
}

.core-checkbox input {
  margin: 0;
  width: 16px;
  height: 16px;
  accent-color: var(--accent-purple, #8b5cf6);
  cursor: pointer;
}

.core-checkbox span {
  color: var(--text-secondary, #e0d6ff);
}

.btn-primary, .btn-secondary {
  padding: 8px 20px;
  border-radius: var(--radius-full, 40px);
  border: none;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast, 0.2s);
}

.btn-primary {
  background: linear-gradient(135deg, var(--accent-purple, #8b5cf6), var(--accent-purple-dark, #6d28d9));
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  filter: brightness(1.05);
  box-shadow: var(--shadow-glow, 0 6px 14px rgba(139, 92, 246, 0.4));
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: var(--btn-secondary-bg, #2d2f44);
  color: var(--text-primary, white);
  border: 1px solid var(--border-glow, #6b63a0);
}

.btn-secondary:hover {
  background: var(--btn-secondary-hover, #3d3f5e);
  transform: translateY(-1px);
}

.error {
  color: var(--error-color, #f97316);
  font-size: 0.75rem;
  margin-top: 4px;
}
</style>