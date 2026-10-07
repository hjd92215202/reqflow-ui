<!-- src/features/requirement-workspace/components/Execution/CustomFieldManager.vue -->
<template>
  <el-popover placement="bottom-end" :width="220" trigger="click">
    <template #reference>
      <el-button size="small" plain>⚙ 字段</el-button>
    </template>
    <div class="column-manager-box">
      <span class="box-title">自定义显示列</span>
      <div class="col-checkboxes">
        <el-checkbox
          v-for="col in availableColumns"
          :key="col"
          :model-value="visibleColumns.includes(col)"
          @change="handleCheckboxChange(col, $event)"
        >
          {{ col }}
        </el-checkbox>
      </div>

      <el-divider style="margin: 8px 0" />

      <el-button link type="primary" size="small" @click="emit('add-new-column')">
        ➕ 追加新扩展列...
      </el-button>
    </div>
  </el-popover>
</template>

<script setup lang="ts">
import type { CheckboxValueType } from 'element-plus'

const props = defineProps<{
  availableColumns: string[]
  visibleColumns: string[]
}>()

const emit = defineEmits<{
  (e: 'update:visibleColumns', val: string[]): void
  (e: 'add-new-column'): void
}>()

const toggleColumn = (col: string, isChecked: boolean) => {
  if (isChecked) {
    emit('update:visibleColumns', [...props.visibleColumns, col])
  } else {
    emit(
      'update:visibleColumns',
      props.visibleColumns.filter(c => c !== col)
    )
  }
}

const handleCheckboxChange = (col: string, val: CheckboxValueType) => {
  toggleColumn(col, Boolean(val))
}
</script>

<style scoped>
.column-manager-box {
  display: flex;
  flex-direction: column;
}

.box-title {
  font-size: 12px;
  font-weight: 600;
  color: #37352f;
  margin-bottom: 6px;
}

.col-checkboxes {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 200px;
  overflow-y: auto;
}
</style>
