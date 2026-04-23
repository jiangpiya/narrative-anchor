<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <h2>⚙️ 设置</h2>
      <div class="settings-tabs">
        <button v-audio:click
          v-for="tab in tabs"
          :key="tab.key"
          @click="activeTab = tab.key"
          :class="{ active: activeTab === tab.key }"
        >
          {{ tab.label }}
        </button>
      </div>

      <div v-if="activeTab === 'audio'" class="settings-panel">
        <div class="setting-row">
          <label>背景音乐音量</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            :value="bgmVolume"
            @input="onBgmVolumeChange"
          />
          <span>{{ Math.round(bgmVolume * 100) }}%</span>
        </div>
        <div class="setting-row">
          <label>环境音效音量</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            :value="ambientVolume"
            @input="onAmbientVolumeChange"
          />
          <span>{{ Math.round(ambientVolume * 100) }}%</span>
        </div>
      </div>

      <!-- 视频设置 -->
      <div v-if="activeTab === 'video'" class="settings-panel">
        <div class="setting-row">
          <label>全屏模式</label>
          <button v-audio:click @click="toggleFullscreen" class="fullscreen-btn">
            {{ isFullscreen ? '退出全屏' : '进入全屏' }}
          </button>
        </div>
      </div>

      <div class="modal-buttons">
        <button v-audio:click @click="$emit('close')">取消</button>
        <button v-audio:click @click="saveAllSettings" class="confirm-btn">保存</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted ,computed} from 'vue';
import { audioService } from '../services/audioService';
import { useSettingsStore } from '../stores/settings';

const settingsStore = useSettingsStore();
const emit = defineEmits(['close']);

const tabs = [
  { key: 'audio', label: '音频' },
  { key: 'video', label: '视频' },
];
const activeTab = ref('audio');

// 全屏状态
const isFullscreen = ref(false);

// 本地音量状态（用于显示和实时调整）
const bgmVolume = ref(settingsStore.bgmVolume);
const ambientVolume = ref(settingsStore.ambientVolume);

// 实时改变背景音乐音量（立即生效，不等待保存）
function onBgmVolumeChange(e: Event) {
  const target = e.target as HTMLInputElement;
  const newVal = parseFloat(target.value);
  bgmVolume.value = newVal;
  audioService.setBgmVolume(newVal);  // 实时更新正在播放的音乐
}

// 实时改变环境音效音量
function onAmbientVolumeChange(e: Event) {
  const target = e.target as HTMLInputElement;
  const newVal = parseFloat(target.value);
  ambientVolume.value = newVal;
  audioService.setAmbientVolume(newVal);
}


async function toggleFullscreen() {
  // 使用实际暴露的方法名
  if (!window.electronAPI.setWindowFullscreen) {
    alert('全屏功能未支持');
    return;
  }
  const newState = await window.electronAPI.setWindowFullscreen(!isFullscreen.value);
  isFullscreen.value = newState;
}

// 保存所有设置到持久化存储（仅在关闭弹窗或点击保存时调用）
async function saveAllSettings() {
  await settingsStore.saveBgmVolume(bgmVolume.value);
  await settingsStore.saveAmbientVolume(ambientVolume.value);
  emit('close');
}

async function loadSettings() {
  // 从 audioService 获取当前音量（如果有 getter 可以调用，否则使用默认值）
  // 这里简单使用默认值，实际可以从 settingsStore 读取
}

onMounted(async () => {
  // 加载已保存的音量到本地状态
  bgmVolume.value = settingsStore.bgmVolume;
  ambientVolume.value = settingsStore.ambientVolume;
  // 应用一次音量（确保当前音频使用存储的值）
  audioService.setBgmVolume(bgmVolume.value);
  audioService.setAmbientVolume(ambientVolume.value);
  // 获取全屏状态
  if (window.electronAPI.isWindowFullscreen) {
    isFullscreen.value = await window.electronAPI.isWindowFullscreen();
  }
});
</script>
<style scoped>
/* ========== 多主题变量 ========== */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: var(--overlay-bg, rgba(0, 0, 0, 0.8));
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
}

.modal-content {
  background: var(--modal-bg, rgba(20, 22, 40, 0.98));
  backdrop-filter: blur(12px);
  border: 1px solid var(--border-glow, rgba(139, 92, 246, 0.5));
  border-radius: var(--radius-xl, 32px);
  width: 500px;
  max-width: 90%;
  padding: 24px;
  color: var(--text-primary, #ffffff);
  box-shadow: var(--shadow-lg, 0 15px 35px rgba(0, 0, 0, 0.5));
}

.modal-content h2 {
  margin-top: 0;
  text-align: center;
  background: linear-gradient(135deg, var(--grad-start, #c4b5fd), var(--grad-end, #fbbf24));
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
}

.settings-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  border-bottom: 1px solid var(--border-glow, rgba(139, 92, 246, 0.3));
  padding-bottom: 8px;
}

.settings-tabs button {
  background: none;
  border: none;
  padding: 6px 12px;
  border-radius: var(--radius-full, 40px);
  cursor: pointer;
  color: var(--text-secondary, #cdc6ff);
  transition: all var(--transition-fast, 0.2s);
}

.settings-tabs button.active {
  background: linear-gradient(135deg, var(--accent-purple, #8b5cf6), var(--accent-purple-dark, #6d28d9));
  color: white;
}

.settings-panel {
  max-height: 400px;
  overflow-y: auto;
  padding: 4px;
}

.setting-row {
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.setting-row label {
  width: 100px;
  font-weight: 500;
  color: var(--text-secondary, #cdc6ff);
}

.setting-row input[type="range"] {
  flex: 1;
  min-width: 150px;
  accent-color: var(--accent-purple, #8b5cf6);
}

.fullscreen-btn {
  background: var(--btn-secondary-bg, #2d2f44);
  border: 1px solid var(--border-glow, #6b63a0);
  padding: 6px 16px;
  border-radius: var(--radius-full, 40px);
  color: var(--text-primary, white);
  cursor: pointer;
  transition: all var(--transition-fast, 0.2s);
}

.fullscreen-btn:hover {
  background: var(--btn-secondary-hover, #3d3f5e);
  transform: translateY(-1px);
}

.modal-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
}

.modal-buttons button {
  padding: 6px 16px;
  border-radius: var(--radius-full, 40px);
  border: none;
  cursor: pointer;
  transition: all var(--transition-fast, 0.2s);
}

.modal-buttons button:first-child {
  background: var(--btn-ghost-bg, rgba(255, 255, 255, 0.1));
  color: var(--text-secondary, #e0d6ff);
  border: 1px solid var(--border-glow, rgba(139, 92, 246, 0.5));
}

.modal-buttons button:first-child:hover {
  background: var(--btn-ghost-hover, rgba(255, 255, 255, 0.2));
  transform: translateY(-1px);
}

.confirm-btn {
  background: linear-gradient(135deg, var(--accent-purple, #8b5cf6), var(--accent-purple-dark, #6d28d9));
  color: white;
}

.confirm-btn:hover {
  transform: translateY(-1px);
  filter: brightness(1.05);
}
</style>