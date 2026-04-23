import { ref } from 'vue';

export const confirmHandler = ref<((title: string, message: string) => Promise<boolean>) | null>(null);

export async function showConfirm(title: string, message: string): Promise<boolean> {
  if (confirmHandler.value) {
    return await confirmHandler.value(title, message);
  }
  console.warn('ConfirmDialog not yet registered, using fallback confirm');
  return window.confirm(`${title}\n${message}`);
}