<template>
  <div class="doc-uploader">
    <div class="upload-controls">
      <label class="core-checkbox">
        <input type="checkbox" v-model="isCore" />
        <span>✨ 标记为核心设定</span>
      </label>
      <button v-audio:click @click="upload" :disabled="uploading" class="upload-btn">
        {{ uploading ? '📄 上传中...' : '📂 上传文档' }}
      </button>
    </div>
    <p v-if="error" class="error">{{ error }}</p>
  </div>
</template>


<script setup lang="ts">
import { ref } from 'vue';

const emit = defineEmits<{
  (e: 'uploaded', doc: any): void;
}>();

const uploading = ref(false);
const error = ref('');
const isCore = ref(false);

async function upload() {
  uploading.value = true;
  error.value = '';
  try {
    // 注意：需要后端 settingsDocs.uploadDoc 支持 isCore 参数
    const doc = await window.electronAPI.settingsDocs.uploadDoc(isCore.value);
    if (doc) {
      emit('uploaded', doc);
      isCore.value = false; // 上传后重置
    }
  } catch (err: any) {
    error.value = err.message || '上传失败';
    console.error(err);
  } finally {
    uploading.value = false;
  }
}
</script>
<style scoped>
.doc-uploader {
  margin-bottom: 24px;
}

.upload-controls {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}

.core-checkbox {
  display: flex;
  align-items: center;
  gap: 18px;
  background: var(--bg-glass-light, rgba(30, 32, 48, 0.6));
  backdrop-filter: blur(4px);
  padding: 6px 14px;
  border-radius: var(--radius-full, 40px);
  border: 1px solid var(--border-glow, rgba(139, 92, 246, 0.4));
  cursor: pointer;
  font-size: 0.85rem;
  transition: all var(--transition-fast, 0.2s);
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

.upload-btn {
  padding: 8px 20px;
  background: linear-gradient(135deg, var(--accent-purple-dark, #6d28d9), var(--accent-purple-darker, #4c1d95));
  border: none;
  border-radius: var(--radius-full, 40px);
  color: white;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast, 0.2s);
  box-shadow: var(--shadow-sm, 0 2px 6px rgba(0, 0, 0, 0.3));
}

.upload-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  filter: brightness(1.05);
  box-shadow: 0 6px 14px rgba(109, 40, 217, 0.4);
}

.upload-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error {
  color: var(--error-color, #f97316);
  font-size: 0.75rem;
  margin-top: 10px;
  padding-left: 8px;
}
</style>