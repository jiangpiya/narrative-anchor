import { useDialog } from 'naive-ui';

export function useConfirm() {
  const dialog = useDialog();

  return function confirm(title: string, message: string): Promise<boolean> {
    return new Promise((resolve) => {
      dialog.warning({
        title,
        content: message,
        positiveText: '确定',
        negativeText: '取消',
        maskClosable: false,
        onPositiveClick: () => resolve(true),
        onNegativeClick: () => resolve(false),
        onClose: () => resolve(false),
      });
    });
  };
}
