<template>
  <el-dialog
    v-model="visible"
    title="新建工作空间"
    width="440px"
    append-to-body
    :close-on-click-modal="false"
  >
    <el-form :model="form" label-width="88px">
      <el-form-item label="空间名称" required>
        <el-input v-model="form.name" maxlength="80" placeholder="例如：产品研发部" />
      </el-form-item>
      <el-form-item label="空间说明">
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="3"
          maxlength="300"
          placeholder="说明这个空间的用途，方便成员识别"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="createWorkspace">创建空间</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { createWorkspaceApi } from '../api'
import type { Workspace } from '@/types'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{
  (event: 'update:modelValue', value: boolean): void
  (event: 'created', workspace: Workspace): void
}>()

const visible = ref(props.modelValue)
const submitting = ref(false)
const form = ref({ name: '', description: '' })

watch(
  () => props.modelValue,
  value => {
    visible.value = value
    if (value) form.value = { name: '', description: '' }
  }
)
watch(visible, value => emit('update:modelValue', value))

const createWorkspace = async () => {
  const name = form.value.name.trim()
  if (!name) {
    ElMessage.warning('请填写工作空间名称')
    return
  }
  submitting.value = true
  try {
    const workspace = await createWorkspaceApi({ name, description: form.value.description.trim() })
    ElMessage.success(`工作空间「${workspace.name}」已创建`)
    visible.value = false
    emit('created', workspace)
  } catch {
    ElMessage.error('工作空间创建失败，请稍后重试')
  } finally {
    submitting.value = false
  }
}
</script>
