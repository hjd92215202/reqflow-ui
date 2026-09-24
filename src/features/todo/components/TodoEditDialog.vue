<!-- src/features/todo/components/TodoEditDialog.vue -->
<template>
  <el-dialog v-model="visible" title="修改待办事项" width="480px" append-to-body>
    <el-form :model="form" label-width="80px">
      <el-form-item label="待办标题" required>
        <el-input v-model="form.title" placeholder="请输入待办标题..." />
      </el-form-item>
      <el-form-item label="待办状态">
        <el-radio-group v-model="form.status">
          <el-radio-button value="TODO">待处理</el-radio-button>
          <el-radio-button value="IN_PROGRESS">进行中</el-radio-button>
          <el-radio-button value="DONE">已完成</el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item v-if="!form.isProjectTask" label="详细内容">
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="3"
          placeholder="添加待办事项的补充细节、备注说明或步骤清单..."
        />
      </el-form-item>
      <el-form-item v-if="!form.isProjectTask" label="优先级">
        <el-radio-group v-model="form.priority">
          <el-radio-button value="LOW">低</el-radio-button>
          <el-radio-button value="MEDIUM">中</el-radio-button>
          <el-radio-button value="HIGH">高</el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item label="截止日期">
        <el-date-picker
          v-model="form.dueDate"
          type="date"
          placeholder="选择截止时间"
          value-format="YYYY-MM-DD"
          style="width: 100%"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="saving" @click="handleSave">保存</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { updateTodoApi } from '../api'
import type { TodoItem } from '@/types'
import { ElMessage } from 'element-plus'

const props = defineProps<{
  modelValue: boolean
  todoItem: TodoItem | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'updated'): void
}>()

const visible = ref(props.modelValue)
const saving = ref(false)

const form = ref<Partial<TodoItem>>({
  id: undefined,
  title: '',
  description: '',
  priority: 'MEDIUM',
  dueDate: null,
  status: 'IN_PROGRESS',
  isProjectTask: false
})

watch(
  () => props.modelValue,
  val => {
    visible.value = val
    if (val && props.todoItem) {
      form.value = { ...props.todoItem }
    }
  }
)

watch(visible, val => {
  emit('update:modelValue', val)
})

const handleSave = async () => {
  if (!form.value.title?.trim() || !form.value.id) {
    ElMessage.warning('待办内容不可为空')
    return
  }
  saving.value = true
  try {
    await updateTodoApi(form.value.id, form.value)
    ElMessage.success('更新成功')
    visible.value = false
    emit('updated')
  } catch (err) {
  } finally {
    saving.value = false
  }
}
</script>
