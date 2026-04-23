<template>
  <div class="message-list" ref="listRef">
    <MessageBubble v-for="msg in messages" :key="msg.turn" :message="msg" />
    <div ref="bottomRef"></div>

    <!-- 自定义关键事件对话框 -->
    <div v-if="showDialog" class="modal-overlay" @click.self="closeDialog">
      <div class="modal-content">
        <h3>标记关键事件</h3>
        <div class="form-row">
          <label>事件名称（简短）</label>
          <input type="text" v-model="eventName" placeholder="例如：获得神器" />
        </div>
        <div class="form-row">
          <label>事件描述（可选）</label>
          <textarea v-model="eventDesc" rows="4" placeholder="详细描述..."></textarea>
        </div>
        <div class="modal-buttons">
          <button v-audio:click @click="closeDialog">取消</button>
          <button v-audio:click @click="confirmAddKeyEvent" class="confirm-btn">确定</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted ,onActivated} from 'vue';
import MessageBubble from './MessageBubble.vue';
import { useGameSessionStore } from '../stores/gameSession';
import type { Message } from '@shared/types/store';

const props = defineProps<{ messages: Message[] }>();
const gameStore = useGameSessionStore();
const listRef = ref<HTMLElement | null>(null);
const bottomRef = ref<HTMLElement | null>(null);

// 对话框状态
const showDialog = ref(false);
const eventName = ref('');
const eventDesc = ref('');
let currentMessage: Message | null = null;

// 滚动到底部（使用 scrollIntoView 更可靠）
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

// 监听消息数量变化
watch(() => props.messages.length, () => {
  scrollToBottom();
}, { immediate: true });

// 监听最后一条消息的内容变化（AI 流式回复时可能需要）
watch(() => props.messages[props.messages.length - 1]?.content, () => {
  scrollToBottom();
}, { immediate: true });

// 组件挂载后滚动到底部
onMounted(() => {
  scrollToBottom();
});

onActivated(() => {
  scrollToBottom();
});

function openKeyEventDialog(msg: Message) {
  currentMessage = msg;
  eventName.value = msg.content.slice(0, 30);
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
    alert('当前没有活动会话');
    closeDialog();
    return;
  }
  const name = eventName.value.trim();
  if (!name) {
    alert('事件名称不能为空');
    return;
  }
  try {
    const res = await window.electronAPI.game.addKeyEvent(sessionId, name, eventDesc.value);
    if (res.success) {
      alert(`已标记关键事件：“${name}”`);
      closeDialog();
    } else {
      alert(`标记失败：${res.error}`);
    }
  } catch (err: any) {
    alert('标记失败，请查看控制台');
    console.error(err);
  }
}
</script>

<style scoped>
.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  scroll-behavior: smooth;
}

.message-wrapper {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.message-wrapper.is-assistant {
  justify-content: flex-start;
}

.star-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.1rem;
  opacity: 0.3;
  transition: opacity 0.2s;
  padding: 0 4px;
  margin-top: 4px;
  flex-shrink: 0;
}

.star-btn:hover {
  opacity: 1;
}

/* 模态框样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-content {
  background: rgba(20, 22, 40, 0.95);
  backdrop-filter: blur(12px);
  border-radius: 24px;
  padding: 24px;
  width: 400px;
  max-width: 90%;
  color: white;
  border: 1px solid rgba(139, 92, 246, 0.4);
}
.modal-content h3 {
  margin-top: 0;
  margin-bottom: 16px;
}
.form-row {
  margin-bottom: 16px;
}
.form-row label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  font-size: 0.85rem;
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
.modal-buttons button {
  padding: 6px 16px;
  border-radius: 20px;
  border: none;
  cursor: pointer;
}
.modal-buttons button:first-child {
  background: rgba(255, 255, 255, 0.1);
  color: #e0d6ff;
}
.confirm-btn {
  background: linear-gradient(135deg, #8b5cf6, #6d28d9);
  color: white;
}
</style>