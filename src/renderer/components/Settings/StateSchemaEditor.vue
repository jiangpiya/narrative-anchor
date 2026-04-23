<template>
  <div class="schema-editor">
    <div class="header">
      <h3>📐 游戏状态条目</h3>
      <button v-audio:click class="btn-add" @click="addField">+ 添加字段</button>
    </div>
    <div class="field-list">
      <div v-for="(field, index) in fields" :key="index" class="field-card">
        <div class="field-header">
          <input v-model="field.name" placeholder="字段名" class="field-name" />
          <select v-model="field.type" class="field-type">
            <option value="string">字符串</option>
            <option value="number">数字</option>
            <option value="boolean">布尔值</option>
            <option value="array">数组</option>
            <option value="object">对象</option>
          </select>
          <!-- 分组选择器 -->
          <div class="group-select-wrapper">
            <select v-model="field.group" class="field-group">
              <option v-for="g in groupOptions" :key="g" :value="g">{{ g }}</option>
              <option value="__new__">+ 新建分组</option>
            </select>
            <input
              v-if="field.group === '__new__'"
              v-model="field.newGroupName"
              placeholder="新分组名称"
              class="new-group-input"
            />
            <button v-audio:click
              v-if="field.group && field.group !== '__new__'"
              class="btn-edit-group"
              @click="editGroupName(field.group)"
              title="编辑此分组名称"
            >
              ✏️
            </button>
          </div>
          <button v-audio:click class="btn-remove" @click="removeField(index)">🗑️</button>
        </div>
        <div class="field-default">
          <label>初始值：</label>
          <input v-if="field.type === 'string'" v-model="field.defaultValue" type="text" />
          <input v-else-if="field.type === 'number'" v-model.number="field.defaultValue" type="number" />
          <input v-else-if="field.type === 'boolean'" type="checkbox" v-model="field.defaultValue" />
          <textarea v-else-if="field.type === 'array'" v-model="field.defaultValue" placeholder='["item1", "item2"]' />
          <textarea v-else-if="field.type === 'object'" v-model="field.defaultValue" placeholder='{"key": "value"}' />
        </div>
      </div>
      <div v-if="fields.length === 0" class="empty-hint">暂无字段，点击“添加字段”开始定义游戏状态。</div>
    </div>
    <div class="actions">
      <button v-audio:click class="btn-save" @click="saveSchema">💾 保存 </button>
      <button v-audio:click class="btn-reset" @click="resetToDefault">↺ 恢复默认</button>
    </div>

    <!-- 编辑分组名称对话框 -->
    <div v-if="showGroupNameDialog" class="modal-overlay" @click.self="closeGroupNameDialog">
      <div class="modal-content">
        <h3>编辑分组名称</h3>
        <div class="form-row">
          <label>新名称</label>
          <input type="text" v-model="newGroupName" placeholder="输入新的分组名称" @keyup.enter="confirmGroupNameChange" />
        </div>
        <div class="modal-buttons">
          <button v-audio:click @click="closeGroupNameDialog">取消</button>
          <button v-audio:click @click="confirmGroupNameChange" class="confirm-btn">确定</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useToast } from '../../composables/useToast';
import { useSettingsStore } from '../../stores/settings';

const props = defineProps<{
  sessionId: string;
}>();

const emit = defineEmits<{
  (e: 'saved'): void;
  (e: 'cancel'): void;
}>();

const toast = useToast();
const settingsStore = useSettingsStore();

const fields = ref<any[]>([]);
const groupOptions = ref<string[]>([]);
const showGroupNameDialog = ref(false);
const oldGroupName = ref('');
const newGroupName = ref('');

const defaultSchema = [
  { name: 'name', type: 'string', defaultValue: '无名旅者', group: '基础' },
  { name: 'race', type: 'string', defaultValue: '人类', group: '基础' },
  { name: 'physicalCondition', type: 'string', defaultValue: '健康', group: '基础' },
  { name: 'mentalState', type: 'string', defaultValue: '平静', group: '基础' },
  { name: 'powerLevel', type: 'number', defaultValue: 1, group: '属性与资源' },
  { name: 'traits', type: 'array', defaultValue: [], group: '属性与资源' },
  { name: 'title', type: 'string', defaultValue: '', group: '基础' },
  { name: 'gold', type: 'number', defaultValue: 10, group: '属性与资源' },
  { name: 'equipment', type: 'array', defaultValue: [], group: '属性与资源' },
  { name: 'skills', type: 'array', defaultValue: [], group: '属性与资源' },
  { name: 'ultimateSkill', type: 'string', defaultValue: null, group: '属性与资源' },
  { name: 'friends', type: 'array', defaultValue: [], group: '社交' },
  { name: 'enemies', type: 'array', defaultValue: [], group: '社交' },
  { name: 'location', type: 'string', defaultValue: '新手村', group: '进度与位置' },
  { name: 'date', type: 'string', defaultValue: '第1天', group: '进度与位置' },
  { name: 'mainQuestProgress', type: 'string', defaultValue: '未开始', group: '进度与位置' },
  { name: 'chapterProgress', type: 'number', defaultValue: 0, group: '进度与位置' },
];

async function loadGroups() {
  try {
    const res = await window.electronAPI.game.getStateGroups(props.sessionId);
    if (res.success && res.groups) {
      groupOptions.value = res.groups.map((g: any) => g.group_name);
    } else {
      groupOptions.value = ['基础', '属性与资源', '社交', '进度与位置', '其他'];
    }
  } catch (err) {
    console.error('加载分组失败', err);
    groupOptions.value = ['基础', '属性与资源', '社交', '进度与位置', '其他'];
  }
}

async function loadSchema() {
  await loadGroups();
  try {
    const res = await window.electronAPI.game.getStateSchema(props.sessionId);
    if (res.success && res.schema && res.schema.length > 0) {
      fields.value = JSON.parse(JSON.stringify(defaultSchema));
      fields.value.forEach((f: any) => {
        if (!f.group) f.group = '其他';
        if (!f.defaultValue && f.defaultValue !== 0 && f.defaultValue !== false) f.defaultValue = '';
      });
    } else {
      fields.value = JSON.parse(JSON.stringify(defaultSchema));
    }
  } catch (err) {
    console.error(err);
    toast.error('加载 Schema 失败');
    fields.value = JSON.parse(JSON.stringify(defaultSchema));
  }

}


function addField() {
  fields.value.push({
    name: '',
    type: 'string',
    defaultValue: '',
    group: '其他',
    newGroupName: '',
  });
}

function removeField(index: number) {
  fields.value.splice(index, 1);
}

async function saveSchema() {
  const names = fields.value.map((f: any) => f.name);
  if (names.some((n: string) => !n || !n.trim())) {
    toast.error('所有字段必须有名称');
    return;
  }
  if (new Set(names).size !== names.length) {
    toast.error('字段名称不能重复');
    return;
  }

  for (const field of fields.value) {
    if (field.group === '__new__') {
      if (!field.newGroupName || !field.newGroupName.trim()) {
        toast.error('请填写新分组名称');
        return;
      }
      field.group = field.newGroupName.trim();
      if (!groupOptions.value.includes(field.group)) {
        groupOptions.value.push(field.group);
      }
      delete field.newGroupName;
    }
    if (!field.group) field.group = '其他';
  }

  const groupMap = new Map<string, string[]>();
  for (const field of fields.value) {
    const g = field.group;
    if (!groupMap.has(g)) groupMap.set(g, []);
    groupMap.get(g)!.push(field.name);
  }
  const groups = Array.from(groupMap.entries()).map(([name, fieldNames], idx) => ({
    group_name: name,
    fields: fieldNames,
    sort_order: idx,
  }));

  const serializableSchema = JSON.parse(JSON.stringify(fields.value));
  const schemaRes = await window.electronAPI.game.saveStateSchema(props.sessionId, serializableSchema);
  if (!schemaRes.success) {
    toast.error(schemaRes.error || '保存 Schema 失败');
    return;
  }
  const groupRes = await window.electronAPI.game.saveStateGroups(props.sessionId, groups);
  if (groupRes.success) {
    toast.success('Schema 和分组已保存');
    await settingsStore.loadStateSchema();
    await settingsStore.loadStateGroups();
    emit('saved');
  } else {
    toast.error(groupRes.error || '分组保存失败');
  }
}

function resetToDefault() {
  fields.value = JSON.parse(JSON.stringify(defaultSchema));
  toast.info('已恢复默认 Schema，记得点击保存');
}

function editGroupName(name: string) {
  oldGroupName.value = name;
  newGroupName.value = name;
  showGroupNameDialog.value = true;
}

function confirmGroupNameChange() {
  const newName = newGroupName.value.trim();
  if (!newName) {
    toast.error('分组名称不能为空');
    return;
  }
  if (newName === oldGroupName.value) {
    closeGroupNameDialog();
    return;
  }
  if (groupOptions.value.includes(newName)) {
    toast.error(`分组名称“${newName}”已存在`);
    return;
  }
  for (const field of fields.value) {
    if (field.group === oldGroupName.value) {
      field.group = newName;
    }
  }
  const index = groupOptions.value.indexOf(oldGroupName.value);
  if (index !== -1) groupOptions.value[index] = newName;
  toast.success(`已将分组“${oldGroupName.value}”重命名为“${newName}”`);
  closeGroupNameDialog();
}

function closeGroupNameDialog() {
  showGroupNameDialog.value = false;
  oldGroupName.value = '';
  newGroupName.value = '';
}

onMounted(() => {
  loadSchema();
});
</script>

<style scoped>
.schema-editor {
  padding: 16px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.btn-add {
  background: linear-gradient(135deg, var(--accent-purple, #8b5cf6), var(--accent-purple-dark, #6d28d9));
  border: none;
  color: white;
  padding: 6px 16px;
  border-radius: var(--radius-full, 30px);
  cursor: pointer;
  transition: all var(--transition-fast, 0.2s);
}

.btn-add:hover {
  transform: translateY(-1px);
  filter: brightness(1.05);
}

.field-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 500px;
  overflow-y: auto;
  padding-right: 8px;
}

.field-card {
  background: var(--bg-card, rgba(0, 0, 0, 0.3));
  border: 1px solid var(--border-glow, rgba(139, 92, 246, 0.4));
  border-radius: var(--radius-md, 20px);
  padding: 12px;
}

.field-header {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.field-name {
  flex: 2;
  min-width: 120px;
  background: var(--input-bg, rgba(0, 0, 0, 0.5));
  border: 1px solid var(--border-glow, #a78bfa);
  border-radius: var(--radius-full, 20px);
  padding: 6px 12px;
  color: var(--text-primary, white);
}

.field-type {
  flex: 1;
  min-width: 80px;
  background: var(--input-bg, rgba(0, 0, 0, 0.5));
  border: 1px solid var(--border-glow, #a78bfa);
  border-radius: var(--radius-full, 20px);
  padding: 6px 12px;
  color: var(--text-primary, white);
}

.group-select-wrapper {
  display: flex;
  gap: 6px;
  align-items: center;
  flex: 1.5;
  min-width: 150px;
}

.field-group {
  background: var(--input-bg, rgba(0, 0, 0, 0.5));
  border: 1px solid var(--border-glow, #a78bfa);
  border-radius: var(--radius-full, 20px);
  padding: 6px 12px;
  color: var(--text-primary, white);
  flex: 1;
}

.new-group-input {
  background: var(--input-bg, rgba(0, 0, 0, 0.5));
  border: 1px solid var(--border-glow, #a78bfa);
  border-radius: var(--radius-full, 20px);
  padding: 6px 12px;
  color: var(--text-primary, white);
  width: 100px;
}

.btn-remove {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  opacity: 0.7;
  color: var(--text-secondary, #e0d6ff);
}

.btn-remove:hover { opacity: 1; }

.field-default {
  margin-top: 8px;
}

.field-default label {
  font-size: 0.8rem;
  color: var(--text-secondary, #cdc6ff);
  margin-right: 8px;
}

.field-default input,
.field-default textarea {
  width: 100%;
  background: var(--input-bg, rgba(0, 0, 0, 0.5));
  border: 1px solid var(--border-glow, #a78bfa);
  border-radius: var(--radius-md, 16px);
  padding: 6px 12px;
  color: var(--text-primary, white);
}

.actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;
  justify-content: flex-end;
}

.btn-save, .btn-reset {
  padding: 6px 16px;
  border-radius: var(--radius-full, 30px);
  border: none;
  cursor: pointer;
  transition: all var(--transition-fast, 0.2s);
}

.btn-save {
  background: linear-gradient(135deg, var(--accent-success, #10b981), #059669);
  color: white;
}

.btn-save:hover {
  transform: translateY(-1px);
  filter: brightness(1.05);
}

.btn-reset {
  background: var(--btn-ghost-bg, rgba(255, 255, 255, 0.1));
  color: var(--text-secondary, #e0d6ff);
  border: 1px solid var(--border-glow, #a78bfa);
}

.btn-reset:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
}

.empty-hint {
  text-align: center;
  color: var(--text-muted, #9ca3cf);
  margin: 20px;
}

.btn-edit-group {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.9rem;
  opacity: 0.6;
  transition: opacity 0.2s;
  margin-left: 4px;
  color: var(--text-secondary, #e0d6ff);
}

.btn-edit-group:hover { opacity: 1; }

/* 模态框（编辑分组名称） */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--overlay-bg, rgba(0, 0, 0, 0.7));
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: var(--modal-bg, rgba(20, 22, 40, 0.95));
  backdrop-filter: blur(12px);
  border: 1px solid var(--border-glow, rgba(139, 92, 246, 0.4));
  border-radius: var(--radius-xl, 28px);
  padding: 24px;
  width: 400px;
  max-width: 90%;
  color: var(--text-primary, white);
}

.modal-content h3 {
  margin-top: 0;
  margin-bottom: 16px;
}

.form-row {
  margin-bottom: 18px;
}

.form-row label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
  font-size: 0.85rem;
  color: var(--text-secondary, #cdc6ff);
}

.form-row input {
  width: 100%;
  padding: 8px 12px;
  background: var(--input-bg, rgba(0, 0, 0, 0.5));
  border: 1px solid var(--border-glow, rgba(139, 92, 246, 0.5));
  border-radius: var(--radius-md, 20px);
  color: var(--text-primary, white);
}

.modal-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 20px;
}

.modal-buttons button {
  padding: 6px 18px;
  border-radius: var(--radius-full, 30px);
  border: none;
  cursor: pointer;
  transition: all var(--transition-fast, 0.2s);
}

.modal-buttons button:first-child {
  background: var(--btn-ghost-bg, rgba(255, 255, 255, 0.1));
  color: var(--text-secondary, #e0d6ff);
}

.confirm-btn {
  background: linear-gradient(135deg, var(--accent-purple, #8b5cf6), var(--accent-purple-dark, #6d28d9));
  color: white;
}
.btn-cancel {
  background: rgba(255, 255, 255, 0.1);
  color: #e0d6ff;
  border: 1px solid #a78bfa;
  padding: 6px 16px;
  border-radius: 30px;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-cancel:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
}
</style>
