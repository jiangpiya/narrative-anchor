import { defineStore } from 'pinia';

export interface ToastItem {
  id: number;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

export const useToastStore = defineStore('toast', {
  state: () => ({
    toasts: [] as ToastItem[],
    nextId: 1,
  }),
  actions: {
    addToast(message: string, type: ToastItem['type'] = 'info', duration = 2000) {
      const id = this.nextId++;
      const toast: ToastItem = { id, message, type };
      this.toasts.push(toast);
      setTimeout(() => {
        this.removeToast(id);
      }, duration);
    },
    removeToast(id: number) {
      const index = this.toasts.findIndex(t => t.id === id);
      if (index !== -1) this.toasts.splice(index, 1);
    },
    success(msg: string) { this.addToast(msg, 'success'); },
    error(msg: string)   { this.addToast(msg, 'error'); },
    warning(msg: string) { this.addToast(msg, 'warning'); },
    info(msg: string)    { this.addToast(msg, 'info'); },
  },
});