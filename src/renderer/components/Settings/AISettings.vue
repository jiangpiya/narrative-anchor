<template>
  <div class="ai-settings">
    <div class="form-card">
      <h3>🤖 AI 供应商与模型</h3>
      <div class="form-row">
        <label>供应商</label>
        <select v-model="localProvider" @change="onProviderChange">
          <option value="deepseek">DeepSeek</option>
          <option value="openai">OpenAI</option>
          <option value="custom">自定义</option>
        </select>
      </div>
      <div class="form-row">
        <label>模型名称</label>
        <input type="text" v-model="localModelName" placeholder="如 deepseek-chat, gpt-3.5-turbo" />
      </div>
      <div v-if="localProvider === 'custom'" class="form-row">
        <label>自定义 Base URL</label>
        <input type="text" v-model="localCustomBaseUrl" placeholder="https://your-api.com/v1" />
      </div>
      <div class="form-row">
        <label>API Key</label>
        <input type="password" v-model="localApiKey" placeholder="sk-..." />
      </div>
      <div class="actions">
        <button v-audio:click @click="saveSettings" class="btn-save">💾 保存配置</button>
        <button v-audio:click @click="testConnection" class="btn-test">🔌 测试连接</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useSettingsStore } from '../../stores/settings';
import { useToast } from '../../composables/useToast';

const settingsStore = useSettingsStore();
const toast = useToast();

const localProvider = ref(settingsStore.provider);
const localModelName = ref(settingsStore.modelName);
const localCustomBaseUrl = ref(settingsStore.customBaseUrl);
const localApiKey = ref(settingsStore.apiKey);

function onProviderChange() {
  if (localProvider.value === 'deepseek') {
    localModelName.value = 'deepseek-chat';
  } else if (localProvider.value === 'openai') {
    localModelName.value = 'gpt-3.5-turbo';
  }
}

async function saveSettings() {
  try {
    await settingsStore.saveProvider(localProvider.value);
    await settingsStore.saveModelName(localModelName.value);
    await settingsStore.saveCustomBaseUrl(localCustomBaseUrl.value);
    await settingsStore.saveApiKey(localApiKey.value);
    toast.success('AI 配置已保存');
  } catch (err: any) {
    toast.error(err.message);
  }
}

async function testConnection() {
  if (!localApiKey.value) {
    toast.warning('请先输入 API Key');
    return;
  }
  toast.info('测试连接中...');
  try {
    // 简单测试：发送一条空消息或获取模型列表（不同供应商不同，这里简单调用 chat 接口）
    const testMessages = [{ role: 'user', content: 'test' }];
    const response = await fetch(`${getBaseUrl()}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localApiKey.value}`,
      },
      body: JSON.stringify({
        model: localModelName.value,
        messages: testMessages,
        max_tokens: 1,
      }),
    });
    if (response.ok) {
      toast.success('连接成功！');
    } else {
      const err = await response.json();
      toast.error(`连接失败: ${err.error?.message || response.statusText}`);
    }
  } catch (err: any) {
    toast.error(`连接失败: ${err.message}`);
  }
}

function getBaseUrl() {
  if (localProvider.value === 'deepseek') return 'https://api.deepseek.com/v1';
  if (localProvider.value === 'openai') return 'https://api.openai.com/v1';
  if (localProvider.value === 'custom' && localCustomBaseUrl.value) return localCustomBaseUrl.value;
  return 'https://api.deepseek.com/v1';
}

onMounted(() => {
  localProvider.value = settingsStore.provider;
  localModelName.value = settingsStore.modelName;
  localCustomBaseUrl.value = settingsStore.customBaseUrl;
  localApiKey.value = settingsStore.apiKey;
});
</script>

<style scoped>
.ai-settings {
  padding: 20px;
}

.form-card {
  background: var(--bg-glass, rgba(20, 22, 40, 0.6));
  backdrop-filter: blur(8px);
  border: 1px solid var(--border-glow, rgba(139, 92, 246, 0.4));
  border-radius: var(--radius-lg, 24px);
  padding: 24px;
}

.form-card h3 {
  margin-top: 0;
  margin-bottom: 20px;
  color: var(--text-secondary, #cdc6ff);
  font-size: 1.2rem;
  border-left: 4px solid var(--accent-warm, #fbbf24);
  padding-left: 12px;
}

.form-row {
  margin-bottom: 18px;
}

.form-row label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  color: var(--text-secondary, #cdc6ff);
  font-size: 0.85rem;
}

.form-row input,
.form-row select {
  width: 100%;
  padding: 8px 12px;
  background: var(--input-bg, rgba(0, 0, 0, 0.4));
  border: 1px solid var(--border-glow, #a78bfa);
  border-radius: var(--radius-md, 20px);
  color: var(--text-primary, white);
  transition: all var(--transition-fast, 0.2s);
}

.form-row input:focus,
.form-row select:focus {
  border-color: var(--accent-purple-light, #c084fc);
  box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.25);
  outline: none;
}

.actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
  justify-content: flex-end;
}

.btn-save, .btn-test {
  padding: 6px 20px;
  border-radius: var(--radius-full, 40px);
  border: none;
  cursor: pointer;
  transition: all var(--transition-fast, 0.2s);
  font-weight: 500;
}

.btn-save {
  background: linear-gradient(135deg, var(--accent-success, #10b981), #059669);
  color: white;
}

.btn-save:hover {
  transform: translateY(-1px);
  filter: brightness(1.05);
}

.btn-test {
  background: var(--btn-ghost-bg, rgba(255, 255, 255, 0.1));
  color: var(--text-secondary, #e0d6ff);
  border: 1px solid var(--border-glow, #a78bfa);
}

.btn-test:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
}
</style>