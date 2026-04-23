<template>
  <div class="chat-window">
    <MessageList :messages="gameStore.messages" />
    <LoadingIndicator />
    <ActionButtons
      v-audio:click
      v-if="gameStore.suggestedOptions.length > 0"
      :options="gameStore.suggestedOptions"
      :disabled="gameStore.isLoading"
      @select="handleSuggestionClick"
    />
    <InputArea
      :is-sending="gameStore.isLoading"
      @send="handleSend"
    />
  </div>
</template>

<script setup lang="ts">
import { useGameSessionStore } from '../stores/gameSession';
import { useToast } from '../composables/useToast';
import MessageList from './MessageList.vue';
import InputArea from './InputArea.vue';
import ActionButtons from './ActionButtons.vue';
import LoadingIndicator from './LoadingIndicator.vue';

const gameStore = useGameSessionStore();
const toast = useToast();

async function handleSend(userInput: string) {
  try {
    await gameStore.sendMessage(userInput);
  } catch (error: any) {
    toast.error(`发送失败: ${error.message}`);
  }
}

function handleSuggestionClick(option: string) {
  handleSend(option);
}
</script>

<style scoped>
.chat-window {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: radial-gradient(ellipse at 50% 100%, rgba(245, 158, 11, 0.08), transparent 60%),
              radial-gradient(circle at 20% 30%, rgba(59, 130, 246, 0.05), transparent 70%);
  position: relative;
  overflow: hidden;
}

/* 动态星空点缀 */

</style>