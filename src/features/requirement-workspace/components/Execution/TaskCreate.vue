<!-- src/features/requirement-workspace/components/Execution/TaskCreate.vue -->
<template>
  <el-dialog
    v-model="visible"
    title="➕ 新建执行任务"
    width="420px"
    append-to-body
    :close-on-click-modal="false"
    :close-on-press-escape="!loading"
    :show-close="!loading"
  >
    <el-form label-position="top" :disabled="loading">
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
      <el-collapse v-if="available" v-model="expanded">
        <el-collapse-item title="交付物与完成标准（选填）" name="standards">
          <el-form-item label="交付物">
            <el-input
              v-model="deliverable"
              type="textarea"
              :rows="3"
              maxlength="10000"
              placeholder="任务完成时交付什么？"
            />
          </el-form-item>
          <el-form-item label="完成标准">
            <el-input
              v-model="completionCriteria"
              type="textarea"
              :rows="3"
              maxlength="10000"
              placeholder="如何判断工作已完成？"
            />
          </el-form-item>
        </el-collapse-item>
      </el-collapse>
    </el-form>
    <template #footer>
      <el-button :disabled="loading" @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="loading" @click="handleCreate">创建任务</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import type { TaskCreatePayload } from '@/types'
import { useExecutionStandards } from '../../composables/useExecutionStandards'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'submit', payload: TaskCreatePayload, complete: (saved: boolean) => void): void
}>()

const visible = ref(props.modelValue)
const title = ref('')
const assignee = ref('')
const loading = ref(false)
const { available } = useExecutionStandards()
const deliverable = ref('')
const completionCriteria = ref('')
const expanded = ref<string[]>([])

watch(
  () => props.modelValue,
  val => {
    visible.value = val
    if (val) {
      title.value = ''
      assignee.value = ''
      loading.value = false
      deliverable.value = ''
      completionCriteria.value = ''
      expanded.value = []
    }
  }
)

watch(visible, val => {
  emit('update:modelValue', val)
})

const handleCreate = () => {
  if (loading.value) return
  if (!title.value.trim()) {
    ElMessage.warning('任务名称不可为空')
    return
  }
  loading.value = true
  const payload: TaskCreatePayload = { title: title.value.trim(), assignee: assignee.value.trim() }
  if (available.value)
    Object.assign(payload, {
      deliverable: deliverable.value.trim() || null,
      completionCriteria: completionCriteria.value.trim() || null
    })
  emit('submit', payload, saved => {
    loading.value = false
    if (saved) visible.value = false
  })
}
</script>
