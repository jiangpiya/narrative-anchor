import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { StateSchema, SchemaField } from '../../shared/types/stateSchema';

const DEFAULT_SCHEMA: StateSchema = {
  version: 1,
  fields: [
    { name: 'name', type: 'string', default: '未命名', display: '姓名' },
    { name: 'race', type: 'string', default: '人类', display: '种族' },
    { name: 'vital_signs', type: 'string', default: '健康', display: '生命体征' },
    { name: 'mental_state', type: 'string', default: '平静', display: '精神状态' },
    { name: 'strength_level', type: 'string', default: '凡人级', display: '实力水平' },
    { name: 'traits', type: 'array', default: [], display: '特质', item_type: 'string' },
    { name: 'title', type: 'string', default: '', display: '称号' },
    { name: 'gold', type: 'number', default: 0, display: '金币' },
    { name: 'gold_status', type: 'string', default: '手头拮据', display: '经济状况' },
    { name: 'equipment', type: 'array', default: [], display: '装备', item_type: 'string' },
    { name: 'skills', type: 'array', default: [], display: '技能', item_type: 'string' },
    { name: 'ultimate_skills', type: 'array', default: [], display: '绝技', item_type: 'string' },
    { name: 'friends', type: 'array', default: [], display: '好友列表', item_type: 'object', object_fields: ['name', 'relation'] },
    { name: 'enemies', type: 'array', default: [], display: '仇敌列表', item_type: 'object', object_fields: ['name', 'relation'] },
    { name: 'location', type: 'string', default: '未知', display: '位置' },
    { name: 'date', type: 'string', default: '未知时间', display: '日期' },
    { name: 'main_progress', type: 'string', default: '序章', display: '主线进度' },
    { name: 'chapter_progress', type: 'string', default: '0/0', display: '章节进度' },
  ],
};

// 加载指定存档的 schema（如果不存在则返回默认）
export function loadStateSchema(sessionId: string): StateSchema {
  const sessionDir = path.join(app.getPath('userData'), 'sessions', sessionId);
  const schemaPath = path.join(sessionDir, 'state_schema.json');
  if (fs.existsSync(schemaPath)) {
    try {
      const content = fs.readFileSync(schemaPath, 'utf-8');
      const schema = JSON.parse(content);
      validateSchema(schema);
      return schema;
    } catch (err) {
      console.error(`Failed to load schema for session ${sessionId}:`, err);
      return DEFAULT_SCHEMA;
    }
  }
  return DEFAULT_SCHEMA;
}

// 校验 schema 合法性
function validateSchema(schema: any): asserts schema is StateSchema {
  if (!schema.version || !Array.isArray(schema.fields)) {
    throw new Error('Invalid schema: missing version or fields');
  }
  const fieldNames = new Set<string>();
  for (const field of schema.fields) {
    if (!field.name || !field.type || field.default === undefined || !field.display) {
      throw new Error(`Invalid field: ${JSON.stringify(field)}`);
    }
    if (fieldNames.has(field.name)) {
      throw new Error(`Duplicate field name: ${field.name}`);
    }
    fieldNames.add(field.name);
    // 类型特定校验
    if (field.type === 'array' && !field.item_type) {
      throw new Error(`Array field ${field.name} missing item_type`);
    }
    if (field.type === 'object' && !field.object_pattern && !field.object_fields) {
      // 允许空对象，但最好有定义
    }
  }
}

// 根据 schema 生成初始状态
export function createInitialState(schema: StateSchema): Record<string, any> {
  const state: Record<string, any> = {};
  for (const field of schema.fields) {
    // 深拷贝默认值（防止引用共享）
    state[field.name] = cloneDefault(field.default);
  }
  return state;
}

function cloneDefault(value: any): any {
  if (Array.isArray(value)) return [...value];
  if (typeof value === 'object' && value !== null) return { ...value };
  return value;
}

// 合并状态更新（用于 AI 返回的 update_game_state）
// 返回 { newState, errors }
export function mergeStateUpdate(
  currentState: Record<string, any>,
  update: Record<string, any>,
  schema: StateSchema
): { newState: Record<string, any>; errors: string[] } {
  const newState = { ...currentState };
  const errors: string[] = [];

  for (const [key, value] of Object.entries(update)) {
    const field = schema.fields.find(f => f.name === key);
    if (!field) {
      errors.push(`Unknown field: ${key}`);
      continue;
    }
    // 类型校验
    if (!validateValueBySchema(value, field)) {
      errors.push(`Type mismatch for field ${key}: expected ${field.type}, got ${typeof value}`);
      continue;
    }
    // 深拷贝赋值
    newState[key] = cloneDefault(value);
  }
  return { newState, errors };
}

function validateValueBySchema(value: any, field: SchemaField): boolean {
  switch (field.type) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number';
    case 'boolean':
      return typeof value === 'boolean';
    case 'array':
      if (!Array.isArray(value)) return false;
      if (field.item_type === 'string') return value.every(v => typeof v === 'string');
      if (field.item_type === 'number') return value.every(v => typeof v === 'number');
      if (field.item_type === 'object') {
        if (!field.object_fields) return true; // 无约束
        return value.every(v => typeof v === 'object' && field.object_fields!.every(f => f in v));
      }
      return true;
    case 'object':
      if (typeof value !== 'object' || value === null) return false;
      if (field.object_pattern) {
        // 校验每个值的类型
        const patternType = field.object_pattern.valueType;
        for (const val of Object.values(value)) {
          if (patternType === 'string' && typeof val !== 'string') return false;
          if (patternType === 'number' && typeof val !== 'number') return false;
          if (patternType === 'boolean' && typeof val !== 'boolean') return false;
        }
      }
      return true;
    default:
      return false;
  }
}

// 将 schema 转换为文本描述，注入系统提示
export function schemaToSystemText(schema: StateSchema): string {
  let text = '## 状态 Schema 定义\n';
  text += '你可以通过 update_game_state 函数更新以下字段，类型必须匹配：\n';
  for (const field of schema.fields) {
    let typeDesc = field.type;
    if (field.type === 'array' && field.item_type) {
      typeDesc += `<${field.item_type}>`;
    }
    if (field.type === 'object' && field.object_pattern) {
      typeDesc += ` (key: string, value: ${field.object_pattern.valueType})`;
    }
    text += `- ${field.name} (${typeDesc}): ${field.display}。当前值: {当前值}。`;
    if (field.description) text += ` ${field.description}`;
    text += '\n';
  }
  return text;
}