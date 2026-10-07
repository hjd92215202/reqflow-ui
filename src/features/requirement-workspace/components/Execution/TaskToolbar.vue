<!-- src/features/requirement-workspace/components/Execution/TaskToolbar.vue -->
<template>
  <div class="task-toolbar-container">
    <div class="toolbar-left">
      <el-input
        :model-value="filters.keyword"
        placeholder="搜索任务标题..."
        size="small"
        clearable
        class="search-input"
        @update:model-value="(val: string) => emit('update-filter', { keyword: val })"
      >
        <template #prefix>🔍</template>
      </el-input>

      <!-- 状态筛选 -->
      <el-select
        :model-value="filters.statuses"
        placeholder="状态筛选"
        size="small"
        multiple
        collapse-tags
        style="width: 130px"
        @update:model-value="(val: TaskStatus[]) => emit('update-filter', { statuses: val })"
      >
        <el-option label="待处理" value="TODO" />
        <el-option label="进行中" value="IN_PROGRESS" />
        <el-option label="已完成" value="DONE" />
      </el-select>

      <el-button size="small" link @click="emit('reset-filters')">重置</el-button>
    </div>

    <div class="toolbar-right">
      <!-- 树形展开 / 收起控制 -->
      <el-button-group size="small">
        <el-button plain title="全部展开" @click="emit('toggle-expand', true)"> 展开 </el-button>
        <el-button plain title="全部收起" @click="emit('toggle-expand', false)"> 收起 </el-button>
      </el-button-group>

      <CustomFieldManager
        :available-columns="allColumns"
        :visible-columns="visibleColumns"
        @update:visible-columns="val => emit('update:visibleColumns', val)"
        @add-new-column="emit('add-new-column')"
      />
      <el-button type="primary" size="small" @click="emit('create-task')"> ➕ 新建任务 </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TaskFilters, TaskStatus } from '@/types'
import CustomFieldManager from './CustomFieldManager.vue'

defineProps<{
  filters: TaskFilters
  allColumns: string[]
  visibleColumns: string[]
}>()

const emit = defineEmits<{
  (e: 'update-filter', payload: Partial<TaskFilters>): void
  (e: 'reset-filters'): void
  (e: 'create-task'): void
  (e: 'add-new-column'): void
  (e: 'toggle-expand', expand: boolean): void
  (e: 'update:visibleColumns', val: string[]): void
}>()
</script>

<style scoped>
.task-toolbar-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  padding: 10px 16px;
  background-color: #ffffff;
  border-bottom: 1px solid rgba(55, 53, 47, 0.08);
  gap: 12px;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.search-input {
  width: 200px;
}

@media (max-width: 760px) {
  .task-toolbar-container {
    align-items: flex-start;
    padding: 10px 12px;
  }

  .toolbar-left,
  .toolbar-right {
    width: 100%;
  }

  .search-input {
    flex: 1;
    min-width: 150px;
  }
}
</style>
