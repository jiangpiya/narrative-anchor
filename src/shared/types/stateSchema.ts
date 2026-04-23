// 支持的字段类型
export type SchemaFieldType = 'string' | 'number' | 'boolean' | 'array' | 'object';

// 数组项类型
export type ArrayItemType = 'string' | 'number' | 'object';

// 字段定义
export interface SchemaField {
  name: string;               // 字段名（存储键）
  type: SchemaFieldType;
  default: any;               // 默认值
  display: string;            // UI 显示名称
  description?: string;       // 帮助 AI 理解
  // 数组特有
  item_type?: ArrayItemType;
  object_fields?: string[];   // 如果 item_type 为 object，定义对象包含的字段名
  // 对象特有
  object_pattern?: {          // 动态键值对模式，如 {"*": "number"}
    keyType?: string;
    valueType: string;
  };
}

// 完整 Schema
export interface StateSchema {
  version: number;
  fields: SchemaField[];
}

// 状态对象（动态）
export type GameState = Record<string, any>;