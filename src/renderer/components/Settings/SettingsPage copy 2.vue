<template>
  <div class="settings-page">
    <h2>📜 世界编织录</h2>

    <!-- 标签页切换 -->
    <div class="tabs">
      <button v-audio:click
        @click="activeTab = 'docs'"
        :class="{ active: activeTab === 'docs' }"
      >
        📄 设定文档
      </button>
      <button v-audio:click
        @click="activeTab = 'npc'"
        :class="{ active: activeTab === 'npc' }"
      >
        👥 NPC 知识库
      </button>
      <button v-audio:click
        @click="activeTab = 'events'"
        :class="{ active: activeTab === 'events' }"
      >
        ⭐ 关键事件
      </button>
    </div>

    <!-- 设定文档标签页 -->
    <div v-if="activeTab === 'docs'" class="tab-content">
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
            <button v-audio:click @click="editDoc(doc)">✏️ 编辑</button>
            <button v-audio:click @click="cleanDoc(doc)" :disabled="cleaningId === doc.id">🧹 AI 整理</button>
            <button v-audio:click @click="deleteDoc(doc.id)">🗑️ 删除</button>
          </div>
        </div>
      </div>
      <div v-if="showCleaner" class="modal-overlay" @click.self="closeCleaner">
        <div class="modal-content">
          <h3>✨ 灵思清洗</h3>
          <DocCleaner
            :initialMarkdown="cleanedMarkdown"
            :docId="currentDocId"
            :initialIsCore="currentDocIsCore"
            @saved="onCleanedSaved"
          />
          <button v-audio:click class="close-btn" @click="closeCleaner">关闭</button>
        </div>
      </div>
    </div>

     <!-- 新增：编辑文档弹窗 -->
      <div v-if="showEditDialog" class="modal-overlay" @click.self="closeEditDialog">
        <div class="modal-content">
          <h3>✏️ 编辑文档</h3>
          <div class="form-row">
            <label>文件名（只读）</label>
            <input type="text" :value="editDocName" disabled />
          </div>
          <div class="form-row">
            <label>文档内容（Markdown）</label>
            <textarea v-model="editDocContent" rows="15" placeholder="输入 Markdown 格式的内容..."></textarea>
          </div>
          <div class="modal-buttons">
            <button v-audio:click @click="closeEditDialog">取消</button>
            <button v-audio:click @click="saveEdit" :disabled="savingEdit" class="confirm-btn">保存</button>
          </div>
        </div>
      </div>

    <!-- NPC 知识库标签页 -->
    <div v-else-if="activeTab === 'npc'" class="tab-content">
      <NPCKnowledgeEditor />
    </div>

    <!-- 关键事件标签页 -->
    <div v-else-if="activeTab === 'events'" class="tab-content">
      <KeyEventsManager />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import DocUploader from './DocUploader.vue';
import DocCleaner from './DocCleaner.vue';
import NPCKnowledgeEditor from '../../components/NPCKnowledgeEditor.vue';
import KeyEventsManager from './KeyEventsManager.vue';
import { useSettingsStore } from '../../stores/settings';
import { useToast } from '../../composables/useToast';
import { useConfirm } from '../../composables/useConfirm';


const confirm = useConfirm();
const settingsStore = useSettingsStore();
const toast = useToast();
const showEditDialog = ref(false);
const editDocId = ref(0);
const editDocName = ref('');
const editDocContent = ref('');
const savingEdit = ref(false);


interface SettingsDoc {
  id: number;
  filename: string;
  filePath: string;
  isCore: boolean;
  enabled: boolean;
  isCleaned: boolean;
}

const activeTab = ref<'docs' | 'npc' | 'events'>('docs');
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
    toast.error('加载文档列表失败');
  } finally {
    loading.value = false;
  }
}

async function toggleDoc(id: number, enabled: boolean) {
  try {
    await window.electronAPI.settingsDocs.toggleDoc(id, enabled);
    await refreshList();
    toast.success(`文档已${enabled ? '启用' : '禁用'}`);
  } catch (err: any) {
    toast.error(err.message || '切换启用状态失败');
  }
}

async function setCore(id: number, isCore: boolean) {
  try {
    await window.electronAPI.settingsDocs.setCore(id, isCore);
    await refreshList();
    if (settingsStore.refreshCoreSettings) {
      await settingsStore.refreshCoreSettings();
    }
    toast.success(isCore ? '已标记为核心设定' : '已取消核心标记');
  } catch (err: any) {
    toast.error(err.message || '设置核心标记失败');
  }
}

async function deleteDoc(id: number) {
  const ok = await confirm('删除文档', '永久删除此文档？');
  if (!ok) return;
  try {
    await window.electronAPI.settingsDocs.deleteDoc(id);
    await refreshList();
    toast.success('文档已删除');
  } catch (err: any) {
    toast.error(err.message || '删除失败');
  }
}

async function cleanDoc(doc: SettingsDoc) {
  cleaningId.value = doc.id;
  try {
    const { content } = await window.electronAPI.settingsDocs.readDocFile(doc.id);
    const apiKey = settingsStore.apiKey;
    const baseUrl = settingsStore.baseUrl;
    if (!apiKey) {
      toast.warning('请先配置 API Key');
      return;
    }
    const result = await window.electronAPI.cleanSettings(content, apiKey, baseUrl);
    cleanedMarkdown.value = result.markdown;
    currentDocId.value = doc.id;
    currentDocIsCore.value = doc.isCore;
    showCleaner.value = true;
  } catch (err: any) {
    toast.error(err.message);
  } finally {
    cleaningId.value = null;
  }
}

function onCleanedSaved() {
  toast.success('已保存并更新文档');
  showCleaner.value = false;
  refreshList();
}

function closeCleaner() {
  showCleaner.value = false;
}

onMounted(() => {
  refreshList();
});

async function editDoc(doc: SettingsDoc) {
  // 读取文件内容
  try {
    const { content } = await window.electronAPI.settingsDocs.readDocFile(doc.id);
    editDocId.value = doc.id;
    editDocName.value = doc.filename;
    editDocContent.value = content;
    showEditDialog.value = true;
  } catch (err: any) {
    toast.error('读取文档内容失败');
  }
}

async function saveEdit() {
  if (savingEdit.value) return;
  savingEdit.value = true;
  try {
    const res = await window.electronAPI.settingsDocs.updateDoc(editDocId.value, editDocContent.value);
    if (res.success) {
      toast.success('文档已更新');
      closeEditDialog();
      await refreshList();
      // 如果该文档是核心设定且启用，刷新核心设定内容
      const doc = docs.value.find(d => d.id === editDocId.value);
      if (doc && doc.isCore && doc.enabled && settingsStore.refreshCoreSettings) {
        await settingsStore.refreshCoreSettings();
      }
    } else {
      toast.error(res.error || '保存失败');
    }
  } catch (err: any) {
    toast.error(err.message);
  } finally {
    savingEdit.value = false;
  }
}

function closeEditDialog() {
  showEditDialog.value = false;
  editDocId.value = 0;
  editDocName.value = '';
  editDocContent.value = '';
}

</script>

<style scoped>
.settings-page {
  padding: 30px;
  max-width: 900px;
  margin: 0 auto;
  color: #f0eefc;
  height: 100%;
  display: flex;
  flex-direction: column;
}

h2 {
  font-size: 1.8rem;
  margin-bottom: 24px;
  background: linear-gradient(135deg, #c4b5fd, #fbbf24);
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
}

/* 标签页样式 */
.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  border-bottom: 1px solid rgba(139, 92, 246, 0.3);
  padding-bottom: 8px;
}
.tabs button {
  background: none;
  border: none;
  padding: 8px 16px;
  border-radius: 40px;
  cursor: pointer;
  font-weight: 500;
  color: #cdc6ff;
  transition: all 0.2s;
}
.tabs button.active {
  background: linear-gradient(135deg, #8b5cf6, #6d28d9);
  color: white;
}
.tab-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

/* 文档列表滚动区域 */
.doc-list {
  flex: 1;
  overflow-y: auto;
  margin-top: 20px;
  padding-right: 8px;
  max-height: calc(100vh - 200px);
}
.doc-list::-webkit-scrollbar {
  width: 6px;
}
.doc-list::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 10px;
}
.doc-list::-webkit-scrollbar-thumb {
  background: #8b5cf6;
  border-radius: 10px;
}
.doc-list::-webkit-scrollbar-thumb:hover {
  background: #a78bfa;
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

.form-row {
  margin-bottom: 16px;
}
.form-row label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: #cdc6ff;
}
.form-row input,
.form-row textarea {
  width: 100%;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(139, 92, 246, 0.5);
  border-radius: 16px;
  color: white;
  font-size: 0.85rem;
}
.modal-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}
.confirm-btn {
  background: linear-gradient(135deg, #8b5cf6, #6d28d9);
  color: white;
  border: none;
  padding: 6px 16px;
  border-radius: 20px;
  cursor: pointer;
}
.confirm-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>