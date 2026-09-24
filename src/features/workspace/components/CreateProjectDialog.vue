<!-- src/features/workspace/components/CreateProjectDialog.vue -->
<template>
  <el-dialog
    v-model="visible"
    title="➕ 划分新工程项目"
    width="460px"
    append-to-body
    :close-on-click-modal="false"
  >
    <el-form :model="form" label-width="90px">
      <el-form-item label="项目名称" required>
        <el-input v-model="form.name" placeholder="例如：核心业务中台 / 支付网关系统" />
      </el-form-item>
      <el-form-item label="项目代号" required>
        <el-input
          v-model="form.identifier"
          placeholder="例如: CORE, PAY, FE (大写英文字母)"
          maxlength="10"
        />
      </el-form-item>
      <el-form-item label="项目描述">
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="3"
          placeholder="简要描述该项目的研发范畴与业务边界..."
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">确定创建</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { createProjectApi } from '../api'
import { useWorkspaceStore } from '@/store/workspace'
import { ElMessage } from 'element-plus'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'created'): void
}>()

const workspaceStore = useWorkspaceStore()
const visible = ref(props.modelValue)
const submitting = ref(false)

const form = ref({
  name: '',
  identifier: '',
  description: ''
})

watch(
  () => props.modelValue,
  val => {
    visible.value = val
    if (val) {
      form.value = { name: '', identifier: '', description: '' }
    }
  }
)

watch(visible, val => {
  emit('update:modelValue', val)
})

const handleSubmit = async () => {
  if (!form.value.name.trim()) {
    ElMessage.warning('项目名称不可为空')
    return
  }
  if (!form.value.identifier.trim()) {
    ElMessage.warning('项目标识符不可为空')
    return
  }

  const workspaceId = workspaceStore.activeWorkspaceId || 1
  submitting.value = true
  try {
    const created = await createProjectApi({
      workspaceId,
      name: form.value.name.trim(),
      identifier: form.value.identifier.trim().toUpperCase(),
      description: form.value.description
    })
    ElMessage.success(`项目「${created.name}」已创建`)
    visible.value = false
    emit('created')
  } catch (err) {
  } finally {
    submitting.value = false
  }
}
</script>
