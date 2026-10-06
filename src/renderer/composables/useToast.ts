import { useMessage } from 'naive-ui';

export function useToast() {
  const message = useMessage();
  return {
    success: (msg: string) => message.success(msg),
    error:   (msg: string) => message.error(msg),
    warning: (msg: string) => message.warning(msg),
    info:    (msg: string) => message.info(msg),
  };
}
