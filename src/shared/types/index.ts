// 此处存放主进程和渲染进程共用的 TypeScript 类型定义
// 示例：
// export interface User { id: number; name: string; }
export * from './database';
export * from './ai';
export * from './store';

// Explicitly export SettingsDoc from ipc with an alias
export { SettingsDoc as IpcSettingsDoc } from './ipc';
export * from './ipc';

// Explicitly export SettingsDoc from settings with an alias
export { SettingsDoc as SettingsSettingsDoc } from './settings';