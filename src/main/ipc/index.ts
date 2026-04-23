import { registerGameHandlers } from './game';
import { registerAIHandlers } from './ai';
import { registerSettingsHandlers } from './settings';
import { registerSettingsDocsHandlers } from './settingsDocs';
import { registerNPCEditorHandlers } from './npcEditor';
import { registerAppHandlers } from './app';

export function registerIpcHandlers() {
  registerGameHandlers();
  registerAIHandlers();
  registerSettingsHandlers();
  registerSettingsDocsHandlers();
  registerNPCEditorHandlers();
  registerAppHandlers();
}

