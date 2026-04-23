import { useToastStore } from '../stores/toast';

export function useToast() {
  const store = useToastStore();
  return {
    success: (msg: string) => store.success(msg),
    error:   (msg: string) => store.error(msg),
    warning: (msg: string) => store.warning(msg),
    info:    (msg: string) => store.info(msg),
  };
}