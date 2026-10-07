<!-- src/features/requirement-workspace/components/Execution/TaskDetail.vue -->
<template>
  <div class="task-detail-pane">
    <el-form label-position="top">
      <el-form-item label="任务名称">
        <el-input
          v-model="form.title"
          size="default"
          @blur="handleSaveField"
          @keyup.enter="handleSaveField"
        />
      </el-form-item>

      <el-form-item label="任务状态">
        <el-select
          v-model="form.status"
          size="default"
          style="width: 100%"
          @change="handleSaveField"
        >
          <el-option label="待处理" value="TODO" />
          <el-option label="进行中" value="IN_PROGRESS" />
          <el-option label="已完成" value="DONE" />
        </el-select>
      </el-form-item>

      <el-form-item label="负责人">
        <el-input
          v-model="form.assignee"
          placeholder="填写负责人姓名..."
          size="default"
          @blur="handleSaveField"
          @keyup.enter="handleSaveField"
        />
      </el-form-item>

      <el-form-item label="执行排期">
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始"
          end-placeholder="截止"
          size="default"
          value-format="YYYY-MM-DD"
          style="width: 100%"
          @change="handleDateChange"
        />
      </el-form-item>

      <!-- 动态自定义字段一览及行内添加 -->
      <div class="custom-fields-section">
        <div class="custom-sec-header">
          <span class="custom-sec-title">扩展属性 (JSONB)</span>
          <el-button link type="primary" size="small" @click="promptAddProperty">
            + 增加属性
          </el-button>
        </div>

        <div v-if="customKeys.length > 0" class="custom-keys-list">
          <div v-for="key in customKeys" :key="key" class="custom-field-row">
            <span class="custom-key-label" :title="key">{{ key }}</span>
            <el-input
              v-model="form.customFields[key]"
              size="small"
              style="flex: 1"
              @blur="handleSaveField"
              @keyup.enter="handleSaveField"
            />
            <el-button
              link
              type="danger"
              size="small"
              class="remove-key-btn"
              title="移除该属性"
              @click="handleRemoveProperty(key)"
            >
              ✕
            </el-button>
          </div>
        </div>

        <span v-else class="empty-custom-tip">暂无专属扩展属性</span>
      </div>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { ElMessageBox, ElMessage } from 'element-plus'
import type { SubTask, TaskStatus } from '@/types'

const props = defineProps<{
  task: SubTask
}>()

const emit = defineEmits<{
  (e: 'update-task', task: SubTask): void
}>()

const dateRange = ref<[string, string] | []>([])

const form = ref<{
  id: number
  title: string
  status: TaskStatus
  assignee: string
  startDate: string | null | undefined
  endDate: string | null | undefined
  customFields: Record<string, any>
}>({
  id: props.task.id,
  title: props.task.title,
  status: props.task.status,
  assignee: props.task.assignee || '',
  startDate: props.task.startDate,
  endDate: props.task.endDate,
  customFields: { ...(props.task.customFields || {}) }
})

watch(
  () => props.task,
  newTask => {
    form.value = {
      id: newTask.id,
      title: newTask.title,
      status: newTask.status,
      assignee: newTask.assignee || '',
      startDate: newTask.startDate,
      endDate: newTask.endDate,
      customFields: { ...(newTask.customFields || {}) }
    }
    dateRange.value =
      newTask.startDate && newTask.endDate ? [newTask.startDate, newTask.endDate] : []
  },
  { immediate: true, deep: true }
)

const customKeys = computed(() => {
  return form.value.customFields ? Object.keys(form.value.customFields) : []
})

const handleSaveField = () => {
  emit('update-task', {
    ...props.task,
    title: form.value.title,
    status: form.value.status,
    assignee: form.value.assignee,
    startDate: form.value.startDate,
    endDate: form.value.endDate,
    customFields: { ...form.value.customFields }
  })
}

const handleDateChange = () => {
  if (dateRange.value && dateRange.value.length === 2) {
    form.value.startDate = dateRange.value[0]
    form.value.endDate = dateRange.value[1]
  } else {
    form.value.startDate = null
    form.value.endDate = null
  }
  handleSaveField()
}

const promptAddProperty = () => {
  ElMessageBox.prompt('请输入属性名称（例如：接口协议、提测分支）', '添加扩展属性', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    inputPattern: /\S+/,
    inputErrorMessage: '属性名不能为空'
  })
    .then(({ value }) => {
      const trimmed = value.trim()
      if (!form.value.customFields) {
        form.value.customFields = {}
      }
      if (form.value.customFields[trimmed] !== undefined) {
        ElMessage.warning(`属性「${trimmed}」已存在`)
        return
      }
      form.value.customFields[trimmed] = ''
      handleSaveField()
    })
    .catch(() => {})
}

const handleRemoveProperty = (key: string) => {
  delete form.value.customFields[key]
  handleSaveField()
  ElMessage.success(`属性「${key}」已移除`)
}
</script>

<style scoped>
.task-detail-pane {
  padding: 8px 0;
}

.custom-fields-section {
  margin-top: 14px;
  border-top: 1px dashed rgba(55, 53, 47, 0.09);
  padding-top: 12px;
}

.custom-sec-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.custom-sec-title {
  font-size: 12px;
  font-weight: 600;
  color: #8c8c8c;
}

.custom-keys-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.custom-field-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.custom-key-label {
  width: 76px;
  font-size: 12px;
  color: #5f5e5b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.remove-key-btn {
  padding: 0 4px;
  color: #a8abb2;
}

.remove-key-btn:hover {
  color: #f56c6c;
}

.empty-custom-tip {
  font-size: 12px;
  color: #a8abb2;
  font-style: italic;
}
</style>
