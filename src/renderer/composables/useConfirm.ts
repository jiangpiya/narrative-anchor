import { inject } from 'vue';

export function useConfirm() {
  const confirm = inject('confirm');
  if (!confirm) throw new Error('Confirm dialog not provided');
  return confirm;
}