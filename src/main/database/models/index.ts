export { GameSessionModel } from './GameSessionModel';
export { GameStateModel } from './GameStateModel';
export { DialogueModel } from './DialogueModel';
export { SummaryModel } from './SummaryModel';
export { KeyEventModel } from './KeyEventModel';
export { SettingsDocModel } from './SettingsDocModel';
export { NPCModel } from './NPCModel';
export { NPCMemoryModel } from './NPCMemoryModel';

// 重新导出类型方便外部使用
export type {
  GameSessionRow,
  GameStateRow,
  DialogueRow,
  SummaryRow,
  KeyEventRow,
  SettingsDocRow,
  NPCRow,
  NPCMemoryRow,
} from '@shared/types/database';