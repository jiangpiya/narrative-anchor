<template>
  <div class="settings-page">
    <div class="page-header">
      <h2>⚙️ 设置</h2>
      <button v-audio:click class="btn btn-back-to-game" @click="goToGame">返回游戏</button>
    </div>

    <!-- 标签页（保持不变，仅调整类名） -->
    <div class="tabs">
      <button v-audio:click @click="activeTab = 'audio'" :class="{ active: activeTab === 'audio' }">🎵 音频</button>
      <button v-audio:click @click="activeTab = 'video'" :class="{ active: activeTab === 'video' }">📺 视频</button>
      <button v-audio:click @click="activeTab = 'docs'" :class="{ active: activeTab === 'docs' }">📄 设定文档</button>
      <button v-audio:click @click="activeTab = 'schema'" :class="{ active: activeTab === 'schema' }">📐 状态条目</button>
      <button v-audio:click @click="activeTab = 'groups'" :class="{ active: activeTab === 'groups' }">📁 状态分组</button>
      <button v-audio:click @click="activeTab = 'summary'" :class="{ active: activeTab === 'summary' }">📜 剧情摘要</button>
      <button v-audio:click @click="activeTab = 'npc'" :class="{ active: activeTab === 'npc' }">👥 NPC 知识库</button>
      <button v-audio:click @click="activeTab = 'ai'" :class="{ active: activeTab === 'ai' }">🤖 AI 配置</button>
    </div>

    <!-- 各标签页内容（精简样式，保留功能） -->
    <div v-if="activeTab === 'audio'" class="tab-content">
      <div class="settings-panel glass-panel">
        <div class="setting-row">
          <label>背景音乐音量</label>
          <input type="range" min="0" max="1" step="0.01" v-model="bgmVolume" @input="saveBgmVolume" />
          <span>{{ Math.round(bgmVolume * 100) }}%</span>
        </div>
        <div class="setting-row">
          <label>环境音效音量</label>
          <input type="range" min="0" max="1" step="0.01" v-model="ambientVolume" @input="saveAmbientVolume" />
          <span>{{ Math.round(ambientVolume * 100) }}%</span>
        </div>
        <div class="setting-row">
          <label>静音</label>
          <input type="checkbox" v-model="muted" @change="toggleMute" />
        </div>
      </div>
    </div>

    <div v-else-if="activeTab === 'video'" class="tab-content">
      <div class="settings-panel glass-panel">
        <div class="setting-row">
          <label>全屏模式</label>
          <button v-audio:click @click="toggleFullscreen" class="btn btn-primary">
            {{ isFullscreen ? '退出全屏' : '进入全屏' }}
          </button>
        </div>
      </div>
    </div>

    <div v-else-if="activeTab === 'docs'" class="tab-content">
      <DocUploader @uploaded="refreshList" />
      <div v-if="loading" class="loading">加载梦境碎片...</div>
      <div v-else class="doc-list">
        <div v-for="doc in docs" :key="doc.id" class="doc-card card">
          <div class="doc-info">
            <div class="doc-name">
              {{ doc.filename }}
              <span v-if="doc.isCleaned" class="badge">✨已净化</span>
            </div>
            <div class="doc-meta">
              <label class="core-label">🌟 核心 <input type="checkbox" :checked="doc.isCore" @change="setCore(doc.id, !doc.isCore)" /></label>
              <label class="enable-label">🔮 启用 <input type="checkbox" :checked="doc.enabled" @change="toggleDoc(doc.id, !doc.enabled)" /></label>
            </div>
          </div>
          <div class="doc-actions">
            <button v-audio:click class="btn btn-ghost" @click="editDoc(doc)">✏️ 编辑</button>
            <button v-audio:click class="btn btn-ghost" @click="cleanDoc(doc)" :disabled="cleaningId === doc.id">
              <span v-if="cleaningId === doc.id" class="spinner-small"></span>
              <span v-else>🧹 AI 整理</span>
            </button>
            <button v-audio:click class="btn btn-danger" @click="deleteDoc(doc.id)">🗑️ 删除</button>
          </div>
        </div>
      </div>
      <!-- 弹窗部分保留原逻辑，类名已全局 -->
    </div>
<div v-if="showEditDialog" class="modal-overlay" @click.self="closeEditDialog">
  <div class="modal-content edit-doc-modal">
    <div class="modal-header">
      <h3>✏️ 编辑文档</h3>
    </div>
    <div class="form-row">
      <label>文件名（只读）</label>
      <input type="text" :value="editDocName" disabled class="readonly-input" />
    </div>
    <div class="form-row">
      <label>文档内容（Markdown）</label>
      <textarea v-model="editDocContent" rows="15" placeholder="输入 Markdown 格式的内容..."></textarea>
    </div>
    <div class="modal-buttons">
      <button v-audio:click class="btn btn-ghost" @click="closeEditDialog">取消</button>
      <button v-audio:click class="btn btn-primary" @click="saveEdit" :disabled="savingEdit">💾 保存</button>
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
    <div v-else-if="activeTab === 'summary'" class="tab-content">
      <SummaryViewer />
    </div>
    <!-- 其余标签页内容不变，仅调整类名 -->
    <div v-else-if="activeTab === 'schema'" class="tab-content">
      <StateSchemaEditor v-if="gameStore.currentSessionId" :sessionId="gameStore.currentSessionId" @saved="refreshStateSchema" />
      <div v-else class="loading">等待会话加载...</div>
    </div>

    <div v-else-if="activeTab === 'groups'" class="tab-content">
      <StateGroupEditor :sessionId="gameStore.currentSessionId" @saved="refreshGroups" />
    </div>

    <div v-else-if="activeTab === 'npc'" class="tab-content">
      <NPCKnowledgeEditor />
    </div>

    <div v-else-if="activeTab === 'events'" class="tab-content">
      <KeyEventsManager />
    </div>

    <div v-else-if="activeTab === 'ai'" class="tab-content">
      <AISettings />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, inject } from 'vue';
import DocUploader from './DocUploader.vue';
import DocCleaner from './DocCleaner.vue';
import NPCKnowledgeEditor from '../../components/NPCKnowledgeEditor.vue';
import KeyEventsManager from './KeyEventsManager.vue';
import StateSchemaEditor from './StateSchemaEditor.vue';
import AISettings from './AISettings.vue';
import { useSettingsStore } from '../../stores/settings';
import { useGameSessionStore } from '../../stores/gameSession';
import { useToast } from '../../composables/useToast';
import { useConfirm } from '../../composables/useConfirm';
import StateGroupEditor from './StateGroupEditor.vue';
import { audioService } from '../../services/audioService';
import SummaryViewer from './SummaryViewer.vue';

const gameStore = useGameSessionStore();
const settingsStore = useSettingsStore();
const toast = useToast();
const confirm = useConfirm();

// 音频设置
const bgmVolume = ref(0.6);
const ambientVolume = ref(0.4);
const muted = ref(false);

function saveBgmVolume() {
  audioService.setBgmVolume(bgmVolume.value);
}
function saveAmbientVolume() {
  audioService.setAmbientVolume(ambientVolume.value);
}
function toggleMute() {
  audioService.mute(muted.value);
}

// 视频设置
const isFullscreen = ref(false);
async function toggleFullscreen() {
  if (!window.electronAPI.setWindowFullscreen) {
    alert('全屏功能未支持');
    return;
  }
  const newState = await window.electronAPI.setWindowFullscreen(!isFullscreen.value);
  isFullscreen.value = newState;
}

// 标签页激活状态
const activeTab = ref<'audio' | 'video' | 'docs' | 'schema' | 'groups' | 'npc' | 'summary' | 'events' | 'ai'>('docs');

// 设定文档相关状态
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
const showEditDialog = ref(false);
const editDocId = ref(0);
const editDocName = ref('');
const editDocContent = ref('');
const savingEdit = ref(false);
const switchToChat = inject<() => void>('switchToChat');

function goToGame() {
  if (switchToChat) {
    switchToChat();
  } else {
    console.error('无法返回游戏：切换方法未提供');
    if (typeof window !== 'undefined' && (window as any).__switchToChat) {
      (window as any).__switchToChat();
    }
  }
}

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
  console.log('[cleanDoc] 开始清洗文档:', doc.id);
  cleaningId.value = doc.id;
  try {
    const { content } = await window.electronAPI.settingsDocs.readDocFile(doc.id);
    console.log('[cleanDoc] 读取文档内容成功，长度:', content.length);
    const apiKey = settingsStore.apiKey;
    const baseUrl = settingsStore.baseUrl;
    if (!apiKey) {
      toast.warning('请先配置 API Key');
      console.log('[cleanDoc] API Key 缺失，退出');
      return;
    }
    console.log('[cleanDoc] 调用 cleanSettings...');
    const result = await window.electronAPI.cleanSettings(content, apiKey, baseUrl);
    console.log('[cleanDoc] cleanSettings 返回:', result);
    cleanedMarkdown.value = result.markdown;
    currentDocId.value = doc.id;
    currentDocIsCore.value = doc.isCore;
    showCleaner.value = true;
    console.log('[cleanDoc] showCleaner 已设置为 true');
  } catch (err: any) {
    console.error('[cleanDoc] 清洗失败:', err);
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

async function editDoc(doc: SettingsDoc) {
  try {
    const result = await window.electronAPI.settingsDocs.readDocFile(doc.id);
    if (result && result.content) {
      editDocId.value = doc.id;
      editDocName.value = doc.filename;
      editDocContent.value = result.content;
      showEditDialog.value = true;
    } else {
      toast.error('文档内容为空');
    }
  } catch (err: any) {
    toast.error('读取文档内容失败: ' + err.message);
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

async function refreshStateSchema() {
  await settingsStore.loadStateSchema();
  toast.success('状态 Schema 已更新');
}

function refreshGroups() {
  console.log('分组已保存');
}

onMounted(() => {
  refreshList();
  // 修正：使用 isWindowFullscreen 代替 isFullscreen
  if (window.electronAPI.isWindowFullscreen) {
    window.electronAPI.isWindowFullscreen().then((state: boolean) => {
      isFullscreen.value = state;
    });
  }
});
</script>

<style scoped>
.settings-page {
  padding: 30px;
  margin: 0 auto;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-header h2 {
  font-size: 1.8rem;
  background: linear-gradient(135deg, #c4b5fd, #fbbf24);
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  margin: 0;
}

.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 24px;
  border-bottom: 1px solid var(--border-glow);
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
  background: linear-gradient(135deg, var(--accent-purple), var(--accent-purple-dark));
  color: white;
}

.tab-content {
  flex: 1;
  overflow-y: auto;
}

.settings-panel {
  padding: 20px;
}

.setting-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.setting-row label {
  width: 140px;
  font-weight: 500;
}

.setting-row input[type="range"] {
  flex: 1;
  min-width: 200px;
}

.doc-list {
  margin-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.doc-card {
  padding: 16px;
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
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.badge {
  background: var(--accent-purple);
  color: white;
  font-size: 0.7rem;
  padding: 2px 8px;
  border-radius: 30px;
}

.doc-meta {
  display: flex;
  gap: 16px;
}

.core-label, .enable-label {
  font-size: 0.75rem;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: center;
  gap: 6px;
  background: rgba(0,0,0,0.4);
  padding: 4px 10px;
  border-radius: 30px;
  cursor: pointer;
}

.doc-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
/* 编辑文档弹窗专属样式 */
.edit-doc-modal {
  width: 700px;
  max-width: 90vw;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  padding: 0;
  overflow: hidden;
}

.edit-doc-modal .modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px 12px 24px;
  border-bottom: 1px solid var(--border-glow, rgba(139, 92, 246, 0.3));
}

.edit-doc-modal .modal-header h3 {
  margin: 0;
  font-size: 1.3rem;
  background: linear-gradient(135deg, #c4b5fd, #fbbf24);
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
}

.edit-doc-modal .close-icon {
  width: 32px;
  height: 32px;
  padding: 0;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid var(--border-glow, rgba(139, 92, 246, 0.5));
  color: var(--text-secondary, #e0d6ff);
}

.edit-doc-modal .close-icon:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: rotate(90deg);
}

.edit-doc-modal .form-row {
  padding: 0 24px;
  margin-bottom: 20px;
}

.edit-doc-modal .form-row:first-of-type {
  margin-top: 16px;
}

.edit-doc-modal label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  font-size: 0.85rem;
  color: var(--text-secondary, #cdc6ff);
}

.edit-doc-modal input,
.edit-doc-modal textarea {
  width: 100%;
  background: var(--input-bg, rgba(0, 0, 0, 0.45));
  border: 1px solid var(--border-glow, rgba(139, 92, 246, 0.5));
  border-radius: var(--radius-md, 20px);
  padding: 10px 14px;
  color: var(--text-primary, #f0eefc);
  font-size: 0.85rem;
  transition: all var(--transition-fast, 0.2s);
}

.edit-doc-modal input:focus,
.edit-doc-modal textarea:focus {
  border-color: var(--accent-purple-light, #a78bfa);
  box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.25);
  outline: none;
}

.edit-doc-modal .readonly-input {
  opacity: 0.7;
  cursor: not-allowed;
  background: rgba(0, 0, 0, 0.3);
}

.edit-doc-modal textarea {
  resize: vertical;
  font-family: monospace;
}

.edit-doc-modal .modal-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px 24px 24px;
  border-top: 1px solid var(--border-glow, rgba(139, 92, 246, 0.2));
  margin-top: 8px;
}
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--overlay-bg, rgba(0, 0, 0, 0.75));
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-content {
  background: var(--modal-bg, rgba(20, 22, 40, 0.96));
  backdrop-filter: blur(16px);
  border: 1px solid var(--border-glow, rgba(139, 92, 246, 0.5));
  border-radius: var(--radius-xl, 32px);
  width: 80%;
  max-width: 900px;
  max-height: 85vh;
  overflow-y: auto;
  padding: 28px;
  color: var(--text-primary, #f5f3ff);
  box-shadow: var(--shadow-lg, 0 20px 35px rgba(0, 0, 0, 0.5));
  transition: all var(--transition-fast, 0.2s);
}

/* 自定义滚动条（与全局统一） */
.modal-content::-webkit-scrollbar {
  width: 6px;
}
.modal-content::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.3);
  border-radius: 10px;
}
.modal-content::-webkit-scrollbar-thumb {
  background: var(--accent-purple, #8b5cf6);
  border-radius: 10px;
}
.modal-content::-webkit-scrollbar-thumb:hover {
  background: var(--accent-purple-light, #a78bfa);
}

/* 关闭按钮美化 */
.close-btn {
  background: var(--btn-secondary-bg, #2d2f44);
  border: 1px solid var(--border-glow, rgba(139, 92, 246, 0.4));
  margin-top: 20px;
  padding: 8px 24px;
  border-radius: var(--radius-full, 40px);
  color: var(--text-secondary, #e0d6ff);
  cursor: pointer;
  transition: all var(--transition-fast, 0.2s);
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.close-btn:hover {
  background: rgba(139, 92, 246, 0.3);
  border-color: var(--accent-purple-light, #a78bfa);
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm, 0 2px 6px rgba(0, 0, 0, 0.2));
}

.close-btn:active {
  transform: translateY(0);
}

/* 可选：针对不同弹窗尺寸的微调 */
.modal-content.small {
  width: 400px;
  max-width: 90%;
}

.modal-content.large {
  width: 900px;
  max-width: 95%;
}
</style>