<!-- src/features/todo/components/TodoQuickInput.vue -->
<template>
  <div class="quick-input-card">
    <div class="quick-input-row">
      <el-input
        v-model="title"
        placeholder="添加一条日常个人待办，按回车 (Enter) 快速发送..."
        size="large"
        class="quick-todo-input"
        clearable
        @keyup.enter="handleCreate"
      >
        <template #prefix>
          <span class="input-icon">➕</span>
        </template>
      </el-input>

      <div class="quick-todo-tools">
        <el-select v-model="priority" size="large" style="width: 110px" placeholder="优先级">
          <el-option label="高优 🔴" value="HIGH" />
          <el-option label="中优 🟡" value="MEDIUM" />
          <el-option label="低优 🔵" value="LOW" />
        </el-select>

        <el-date-picker
          v-model="dueDate"
          type="date"
          placeholder="截止时间"
          size="large"
          value-format="YYYY-MM-DD"
          style="width: 140px"
        />

        <el-button type="primary" size="large" :loading="loading" @click="handleCreate">
          添 加
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { createTodoApi } from '../api'
import type { PriorityLevel } from '@/types'
import { ElMessage } from 'element-plus'

const emit = defineEmits<{
  (e: 'created'): void
}>()

const title = ref('')
const priority = ref<PriorityLevel>('MEDIUM')
const dueDate = ref<string | null>(null)
const loading = ref(false)

const handleCreate = async () => {
  if (!title.value.trim()) {
    ElMessage.warning('请输入待办事项内容')
    return
  }
  loading.value = true
  try {
    await createTodoApi({
      title: title.value.trim(),
      priority: priority.value,
      dueDate: dueDate.value,
      status: 'IN_PROGRESS'
    })
    ElMessage.success('待办已加入「进行中」')
    title.value = ''
    dueDate.value = null
    priority.value = 'MEDIUM'
    emit('created')
  } catch (err) {
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.quick-input-card {
  background: #ffffff;
  border-radius: 8px;
  padding: 16px 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.quick-input-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.quick-todo-input {
  flex: 1;
}

.quick-todo-tools {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}
</style>
