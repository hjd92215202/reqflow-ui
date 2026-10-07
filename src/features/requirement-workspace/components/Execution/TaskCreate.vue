<!-- src/features/requirement-workspace/components/Execution/TaskCreate.vue -->
<template>
  <el-dialog
    v-model="visible"
    title="➕ 新建执行任务"
    width="420px"
    append-to-body
    :close-on-click-modal="false"
  >
    <el-form label-position="top">
      <el-form-item label="任务名称" required>
        <el-input
          v-model="title"
          placeholder="输入要执行的任务名称..."
          autofocus
          @keyup.enter="handleCreate"
        />
      </el-form-item>
      <el-form-item label="负责人">
        <el-input v-model="assignee" placeholder="可选输入负责人..." />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="loading" @click="handleCreate"> 创建并开启 </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'submit', payload: { title: string; assignee: string }): void
}>()

const visible = ref(props.modelValue)
const title = ref('')
const assignee = ref('')
const loading = ref(false)

watch(
  () => props.modelValue,
  val => {
    visible.value = val
    if (val) {
      title.value = ''
      assignee.value = ''
    }
  }
)

watch(visible, val => {
  emit('update:modelValue', val)
})

const handleCreate = () => {
  if (!title.value.trim()) {
    ElMessage.warning('任务名称不可为空')
    return
  }
  emit('submit', { title: title.value.trim(), assignee: assignee.value.trim() })
  visible.value = false
}
</script>
