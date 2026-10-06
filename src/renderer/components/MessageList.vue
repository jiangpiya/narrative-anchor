<template>
  <div class="message-list" ref="listRef">
    <!-- 空状态：新存档尚未开始 -->
    <div v-if="messages.length === 0" class="chat-empty">
      <div class="empty-moon">🌙</div>
      <h3>夜色已深，故事待启</h3>
      <p>在下方写下你的第一个行动，开启这段叙事。</p>
    </div>

    <MessageBubble
      v-for="msg in messages"
      :key="msg.turn"
      :message="msg"
      @mark="openKeyEventDialog"
    />
    <div ref="bottomRef"></div>

    <!-- 标记关键事件弹窗 -->
    <n-modal
      v-model:show="showDialog"
      preset="card"
      title="⭐ 标记关键事件"
      class="key-event-modal"
      :bordered="false"
      style="width: 520px; max-width: calc(100vw - 48px)"
      :mask-closable="false"
    >
      <div class="ke-form">
        <div class="ke-field">
          <label>事件名称（简短）</label>
          <n-input
            v-model:value="eventName"
            placeholder="例如：获得神器"
            maxlength="50"
            show-count
          />
        </div>
        <div class="ke-field">
          <label>事件描述（可选）</label>
          <n-input
            v-model:value="eventDesc"
            type="textarea"
            :rows="4"
            placeholder="详细描述..."
          />
        </div>
      </div>
      <template #footer>
        <div class="ke-foot">
          <n-button v-audio:click @click="closeDialog">取消</n-button>
          <n-button
            v-audio:click
            type="primary"
            :disabled="!eventName.trim()"
            @click="confirmAddKeyEvent"
          >确定标记</n-button>
        </div>
      </template>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onActivated } from 'vue';
import MessageBubble from './MessageBubble.vue';
import { NModal, NInput, NButton } from 'naive-ui';
import { useGameSessionStore } from '../stores/gameSession';
import { useToast } from '../composables/useToast';
import type { Message } from '@shared/types/store';

const props = defineProps<{ messages: Message[] }>();
const gameStore = useGameSessionStore();
const toast = useToast();
const listRef = ref<HTMLElement | null>(null);
const bottomRef = ref<HTMLElement | null>(null);

// 对话框状态
const showDialog = ref(false);
const eventName = ref('');
const eventDesc = ref('');
let currentMessage: Message | null = null;

// 滚动到底部
function scrollToBottom() {
  nextTick(() => {
    if (bottomRef.value) {
      bottomRef.value.scrollIntoView({ behavior: 'smooth', block: 'end' });
    } else if (listRef.value) {
      listRef.value.scrollTop = listRef.value.scrollHeight;
    }
    // 二次保险
    setTimeout(() => {
      if (bottomRef.value) {
        bottomRef.value.scrollIntoView({ behavior: 'smooth', block: 'end' });
      } else if (listRef.value) {
        listRef.value.scrollTop = listRef.value.scrollHeight;
      }
    }, 100);
  });
}

watch(() => props.messages.length, () => {
  scrollToBottom();
}, { immediate: true });

watch(() => props.messages[props.messages.length - 1]?.content, () => {
  scrollToBottom();
}, { immediate: true });

onMounted(() => {
  scrollToBottom();
});

onActivated(() => {
  scrollToBottom();
});

function openKeyEventDialog(msg: Message) {
  currentMessage = msg;
  eventName.value = msg.content.replace(/[#*`>\n]/g, '').slice(0, 30);
  eventDesc.value = msg.content;
  showDialog.value = true;
}

function closeDialog() {
  showDialog.value = false;
  currentMessage = null;
  eventName.value = '';
  eventDesc.value = '';
}

async function confirmAddKeyEvent() {
  const sessionId = gameStore.currentSessionId;
  if (!sessionId) {
    toast.error('当前没有活动会话');
    closeDialog();
    return;
  }
  const name = eventName.value.trim();
  if (!name) {
    toast.error('事件名称不能为空');
    return;
  }
  try {
    const res = await window.electronAPI.game.addKeyEvent(sessionId, name, eventDesc.value);
    if (res.success) {
      toast.success(`已标记关键事件：“${name}”`);
      closeDialog();
    } else {
      toast.error(`标记失败：${res.error}`);
    }
  } catch (err: any) {
    toast.error('标记失败，请查看控制台');
    console.error(err);
  }
}
</script>

<style scoped>
.message-list {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-6) var(--space-7);
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  scroll-behavior: smooth;
}

/* 空状态 */
.chat-empty {
  margin: auto;
  text-align: center;
  color: var(--text-secondary);
  animation: fadeInUp 0.4s ease-out;
}
.empty-moon {
  font-size: 3.4rem;
  margin-bottom: var(--space-3);
  filter: drop-shadow(0 0 18px rgba(167, 139, 250, 0.5));
}
.chat-empty h3 {
  margin: 0 0 var(--space-2);
  font-size: 1.2rem;
  color: var(--text-primary);
  font-weight: 600;
}
.chat-empty p {
  margin: 0;
  font-size: 0.9rem;
  opacity: 0.8;
}

/* 标记弹窗 */
.ke-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.ke-field label {
  display: block;
  font-size: 0.84rem;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: var(--space-2);
}
.ke-foot {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
}
</style>
