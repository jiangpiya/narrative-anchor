<template>
  <div class="group-editor">
    <div class="header">
      <h3>📁 状态分组管理</h3>
      <button v-audio:click class="btn-add" @click="addGroup">+ 新建分组</button>
    </div>
    <div v-if="loading" class="loading">加载中...</div>
    <div v-else class="groups-list">
      <div v-for="(group, idx) in groups" :key="idx" class="group-card">
        <div class="group-header">
          <input v-model="group.group_name" placeholder="分组名称" class="group-name" />
          <button v-audio:click class="btn-remove" @click="removeGroup(idx)" :disabled="groups.length === 1">🗑️</button>
        </div>
        <div class="fields-list">
          <div
            v-for="field in allFields"
            :key="field.name"
            class="field-chip"
            :class="{ selected: group.fields.includes(field.name) }"
            @click="toggleField(group, field.name)"
          >
            {{ field.name }}
          </div>
        </div>
      </div>
    </div>
    <div class="actions">
      <button v-audio:click class="btn-save" @click="saveGroups" :disabled="saving">💾 保存分组</button>
      <button v-audio:click class="btn-reset" @click="resetToDefault">↺ 恢复默认</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useSettingsStore } from '../../stores/settings';
import { useToast } from '../../composables/useToast';

const props = defineProps<{ sessionId: string }>();
const emit = defineEmits(['saved']);

const settingsStore = useSettingsStore();
const toast = useToast();

const groups = ref<any[]>([]);
const allFields = ref<{ name: string }[]>([]);
const loading = ref(false);
const saving = ref(false);

// 从 settingsStore 获取字段列表
function loadFields() {
  allFields.value = settingsStore.stateSchema.map(f => ({ name: f.name }));
}

// 构建默认分组（根据字段名映射）
function buildDefaultGroups(fieldNames: string[]): any[] {
  const map: Record<string, string[]> = {
    '基础': [],
    '属性与资源': [],
    '社交': [],
    '进度与位置': [],
    '其他': []
  };
  const fieldMap: Record<string, string> = {
    name: '基础', race: '基础', physicalCondition: '基础', mentalState: '基础', title: '基础',
    powerLevel: '属性与资源', gold: '属性与资源', equipment: '属性与资源', skills: '属性与资源',
    ultimateSkill: '属性与资源', traits: '属性与资源',
    friends: '社交', enemies: '社交',
    location: '进度与位置', date: '进度与位置', mainQuestProgress: '进度与位置', chapterProgress: '进度与位置'
  };
  for (const name of fieldNames) {
    const group = fieldMap[name] || '其他';
    map[group].push(name);
  }
  return Object.entries(map).filter(([, f]) => f.length).map(([name, f], idx) => ({
    group_name: name,
    fields: f,
    sort_order: idx,
  }));
}

// 加载已有分组，如果没有则创建默认分组
async function loadGroups() {
  loading.value = true;
  try {
    const res = await window.electronAPI.game.getStateGroups(props.sessionId);
    if (res.success && res.groups && res.groups.length > 0) {
      groups.value = res.groups;
    } else {
      const fieldNames = allFields.value.map(f => f.name);
      groups.value = buildDefaultGroups(fieldNames);
    }
  } catch (err) {
    console.error(err);
    toast.error('加载分组失败');
    const fieldNames = allFields.value.map(f => f.name);
    groups.value = buildDefaultGroups(fieldNames);
  } finally {
    loading.value = false;
  }
}

// 添加分组
function addGroup() {
  groups.value.push({
    group_name: '新分组',
    fields: [],
    sort_order: groups.value.length
  });
}

// 删除分组（至少保留一个）
function removeGroup(idx: number) {
  if (groups.value.length === 1) {
    toast.warning('至少保留一个分组');
    return;
  }
  groups.value.splice(idx, 1);
  groups.value.forEach((g, i) => g.sort_order = i);
}

// 切换字段归属（保证每个字段只属于一个分组）
function toggleField(group: any, fieldName: string) {
  // 1. 如果当前分组已经包含该字段，则直接移除（取消选中）
  if (group.fields.includes(fieldName)) {
    group.fields = group.fields.filter((f: string) => f !== fieldName);
    return;
  }
  // 2. 否则，将该字段从所有其他分组中移除
  for (const g of groups.value) {
    if (g !== group && g.fields.includes(fieldName)) {
      g.fields = g.fields.filter((f: string) => f !== fieldName);
    }
  }
  // 3. 添加到当前分组
  group.fields.push(fieldName);
}

// 保存分组
async function saveGroups() {
  if (saving.value) return;
  // 校验分组名称不能为空
  for (const g of groups.value) {
    if (!g.group_name.trim()) {
      toast.error('分组名称不能为空');
      return;
    }
  }
  // 确保所有字段都有归属（自动将未归属的字段放入“其他”分组）
  const allFieldNames = allFields.value.map(f => f.name);
  const groupedFields = new Set(groups.value.flatMap(g => g.fields));
  const ungrouped = allFieldNames.filter(f => !groupedFields.has(f));
  if (ungrouped.length) {
    let otherGroup = groups.value.find(g => g.group_name === '其他');
    if (!otherGroup) {
      otherGroup = { group_name: '其他', fields: [], sort_order: groups.value.length };
      groups.value.push(otherGroup);
    }
    for (const f of ungrouped) {
      if (!otherGroup.fields.includes(f)) otherGroup.fields.push(f);
    }
  }

  const payload = groups.value.map((g, idx) => ({
    group_name: g.group_name,
    fields: g.fields,
    sort_order: idx,
  }));
  
  // 深拷贝，移除 Vue 响应式代理（关键修复）
  const serializablePayload = JSON.parse(JSON.stringify(payload));
  console.log('[StateGroupEditor] 准备保存分组:', serializablePayload);
  
  saving.value = true;
  try {
    const res = await window.electronAPI.game.saveStateGroups(props.sessionId, serializablePayload);
    console.log('[StateGroupEditor] 保存响应:', res);
    if (res.success) {
      toast.success('分组已保存');
      // 刷新 store 中的分组数据，以便状态面板更新
      if (settingsStore.refreshGroups) await settingsStore.refreshGroups();
      emit('saved');
    } else {
      toast.error(res.error || '保存失败');
    }
  } catch (err: any) {
    console.error('[StateGroupEditor] 保存异常:', err);
    toast.error(err.message);
  } finally {
    saving.value = false;
  }
}

// 恢复默认分组
async function resetToDefault() {
  const fieldNames = allFields.value.map(f => f.name);
  groups.value = buildDefaultGroups(fieldNames);
  toast.info('已恢复默认分组，记得保存');
}

onMounted(async () => {
  if (settingsStore.stateSchema.length === 0) {
    await settingsStore.loadStateSchema();
  }
  loadFields();
  await loadGroups();
});
</script>

<style scoped>
.group-editor {
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
  color: white;
  border: none;
  padding: 6px 16px;
  border-radius: var(--radius-full, 20px);
  cursor: pointer;
  transition: all var(--transition-fast, 0.2s);
}

.btn-add:hover {
  transform: translateY(-1px);
  filter: brightness(1.05);
}

.groups-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-height: 500px;
  overflow-y: auto;
  padding-right: 8px;
}

.group-card {
  background: var(--bg-card, rgba(0, 0, 0, 0.3));
  border: 1px solid var(--border-glow, rgba(139, 92, 246, 0.4));
  border-radius: var(--radius-md, 20px);
  padding: 12px;
}

.group-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
}

.group-name {
  background: var(--input-bg, rgba(0, 0, 0, 0.5));
  border: 1px solid var(--border-glow, #a78bfa);
  border-radius: var(--radius-full, 20px);
  padding: 4px 12px;
  color: var(--text-primary, white);
  width: 200px;
  transition: all var(--transition-fast, 0.2s);
}

.group-name:focus {
  border-color: var(--accent-purple-light, #c084fc);
  outline: none;
  box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.25);
}

.btn-remove {
  background: none;
  border: none;
  font-size: 1rem;
  cursor: pointer;
  opacity: 0.6;
  transition: opacity 0.2s;
  color: var(--text-secondary, #e0d6ff);
}

.btn-remove:hover { opacity: 1; }

.fields-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.field-chip {
  background: var(--chip-bg, rgba(0, 0, 0, 0.5));
  border: 1px solid var(--border-glow, #a78bfa);
  border-radius: var(--radius-full, 30px);
  padding: 4px 12px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all var(--transition-fast, 0.2s);
  color: var(--text-secondary, #e0d6ff);
}

.field-chip.selected {
  background: linear-gradient(135deg, var(--accent-purple, #8b5cf6), var(--accent-purple-dark, #6d28d9));
  border-color: var(--accent-purple-light, #c084fc);
  color: white;
}

.actions {
  margin-top: 20px;
  display: flex;
  gap: 12px;
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

.btn-save:hover:not(:disabled) {
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

.loading {
  text-align: center;
  padding: 40px;
  color: var(--text-secondary, #c4b5fd);
}
</style>