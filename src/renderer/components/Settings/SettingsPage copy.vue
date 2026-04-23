<template>
  <div class="settings-page">
    <h2>📜 世界编织录</h2>
    <DocUploader @uploaded="refreshList" />
    <div v-if="loading" class="loading">加载梦境碎片...</div>
    <div v-else class="doc-list">
      <div v-for="doc in docs" :key="doc.id" class="doc-card">
        <div class="doc-info">
          <div class="doc-name">
            {{ doc.filename }}
            <span v-if="doc.isCleaned" class="badge">✨已净化</span>
          </div>
          <div class="doc-meta">
            <label class="core-label">
              🌟 核心
              <input type="checkbox" :checked="doc.isCore" @change="setCore(doc.id, !doc.isCore)" />
            </label>
            <label class="enable-label">
              🔮 启用
              <input type="checkbox" :checked="doc.enabled" @change="toggleDoc(doc.id, !doc.enabled)" />
            </label>
          </div>
        </div>
        <div class="doc-actions">
          <button @click="cleanDoc(doc)" :disabled="cleaningId === doc.id">🧹 AI 整理</button>
          <button @click="deleteDoc(doc.id)">🗑️ 删除</button>
        </div>
      </div>
    </div>
    <div v-if="showCleaner" class="modal-overlay" @click.self="closeCleaner">
      <div class="modal-content">
        <h3>✨ 灵思清洗</h3>
        <DocCleaner :initialMarkdown="cleanedMarkdown" :docId="currentDocId" :initialIsCore="currentDocIsCore" @saved="onCleanedSaved" />
        <button class="close-btn" @click="closeCleaner">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import DocUploader from './DocUploader.vue';
import DocCleaner from './DocCleaner.vue';
import { useSettingsStore } from '../../stores/settings';

const settingsStore = useSettingsStore();

interface SettingsDoc {
  id: number;
  filename: string;
  filePath: string;
  isCore: boolean;
  enabled: boolean;
  isCleaned: boolean;
}

const docs = ref<SettingsDoc[]>([]);
const loading = ref(false);
const cleaningId = ref<number | null>(null);
const showCleaner = ref(false);
const cleanedMarkdown = ref('');
const currentDocId = ref(0);
const currentDocIsCore = ref(false);

async function refreshList() {
  loading.value = true;
  try {
    docs.value = await window.electronAPI.settingsDocs.getDocs();
  } catch (err) {
    alert('加载失败');
  } finally {
    loading.value = false;
  }
}

async function toggleDoc(id: number, enabled: boolean) {
  try {
    await window.electronAPI.settingsDocs.toggleDoc(id, enabled);
    await refreshList();
  } catch (err: any) {
    alert(err.message || '切换启用状态失败');
  }
}

async function setCore(id: number, isCore: boolean) {
  try {
    await window.electronAPI.settingsDocs.setCore(id, isCore);
    await refreshList();
    // 刷新核心设定缓存（若 store 中有此方法）
    if (settingsStore.refreshCoreSettings) {
      await settingsStore.refreshCoreSettings();
    }
  } catch (err: any) {
    alert(err.message || '设置核心标记失败');
  }
}

async function deleteDoc(id: number) {
  if (!confirm('永久删除此文档？')) return;
  try {
    await window.electronAPI.settingsDocs.deleteDoc(id);
    await refreshList();
  } catch (err: any) {
    alert(err.message || '删除失败');
  }
}

async function cleanDoc(doc: SettingsDoc) {
  cleaningId.value = doc.id;
  try {
    const { content } = await window.electronAPI.settingsDocs.readDocFile(doc.id);
    const apiKey = settingsStore.apiKey;
    const baseUrl = settingsStore.baseUrl;
    if (!apiKey) {
      alert('请先配置 API Key');
      return;
    }
    const result = await window.electronAPI.cleanSettings(content, apiKey, baseUrl);
    cleanedMarkdown.value = result.markdown;
    currentDocId.value = doc.id;
    currentDocIsCore.value = doc.isCore; // 传递原文档的核心标记
    showCleaner.value = true;// 打开弹窗
  } catch (err: any) {
    alert(err.message|| 'AI 清洗失败');
  } finally {
    cleaningId.value = null;
  }
}

function onCleanedSaved() {
  alert('已保存');
  showCleaner.value = false;
  refreshList();
  // 额外：通知 settingsStore 重新加载核心设定
  settingsStore.refreshCoreSettings();
}

function closeCleaner() {
  showCleaner.value = false;
}

onMounted(() => {
  refreshList();
});
</script>

<style scoped>
.settings-page {
  padding: 30px;
  max-width: 900px;
  margin: 0 auto;
  color: #f0eefc;
}
h2 {
  font-size: 1.8rem;
  margin-bottom: 24px;
  background: linear-gradient(135deg, #c4b5fd, #fbbf24);
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
}
.doc-card {
  background: rgba(20, 22, 40, 0.7);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(139, 92, 246, 0.4);
  border-radius: 24px;
  padding: 16px;
  margin-bottom: 12px;
}
.doc-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 12px;
}
.doc-name {
  font-weight: bold;
  color: #f0eefc;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.badge {
  background: #8b5cf6;
  color: white;
  font-size: 0.7rem;
  padding: 2px 8px;
  border-radius: 30px;
}
.doc-meta {
  display: flex;
  gap: 16px;
  align-items: center;
}
.core-label, .enable-label {
  font-size: 0.75rem;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(0, 0, 0, 0.4);
  padding: 4px 10px;
  border-radius: 30px;
  cursor: pointer;
  transition: background 0.2s;
}
.core-label:hover, .enable-label:hover {
  background: rgba(139, 92, 246, 0.3);
}
.core-label input, .enable-label input {
  margin: 0;
  width: 14px;
  height: 14px;
  accent-color: #8b5cf6;
  cursor: pointer;
}
.doc-actions {
  display: flex;
  gap: 12px;
}
.doc-actions button {
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid #a78bfa;
  color: white;
  border-radius: 30px;
  padding: 6px 16px;
  cursor: pointer;
  transition: all 0.2s;
}
.doc-actions button:first-child:hover {
  background: #8b5cf6;
}
.doc-actions button:last-child:hover {
  background: #b91c1c;
}
.loading {
  text-align: center;
  margin: 20px;
}
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-content {
  background: rgba(20, 22, 40, 0.95);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(139, 92, 246, 0.4);
  border-radius: 28px;
  width: 80%;
  max-width: 900px;
  max-height: 80vh;
  overflow: auto;
  padding: 24px;
  color: white;
}
.close-btn {
  background: #6c757d;
  margin-top: 16px;
  padding: 8px 20px;
  border-radius: 30px;
  border: none;
  color: white;
  cursor: pointer;
}
</style>