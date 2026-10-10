<!-- src/features/requirement/components/RequirementDialog.vue -->
<template>
  <el-dialog
    v-model="visible"
    :title="isEdit ? '修改需求' : '录入新需求'"
    width="550px"
    append-to-body
    :close-on-click-modal="false"
  >
    <el-form :model="form" label-width="90px">
      <el-form-item label="需求名称" required>
        <el-input v-model="form.title" placeholder="请输入需求标题..." />
      </el-form-item>
      <el-form-item label="需求背景">
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="3"
          placeholder="请输入核心背景、业务价值或验收指标..."
        />
      </el-form-item>
      <el-form-item label="计划起止">
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="截止日期"
          value-format="YYYY-MM-DD"
          style="width: 100%"
          @change="datesEdited = true"
        />
      </el-form-item>
      <el-form-item label="优先级">
        <el-radio-group v-model="form.priority">
          <el-radio-button value="LOW">低</el-radio-button>
          <el-radio-button value="MEDIUM">中</el-radio-button>
          <el-radio-button value="HIGH">高</el-radio-button>
        </el-radio-group>
      </el-form-item>
      <el-form-item v-if="isEdit" label="主状态">
        <el-select v-model="form.status" style="width: 100%">
          <el-option label="待处理" value="TODO" />
          <el-option label="进行中" value="IN_PROGRESS" />
          <el-option label="测试中" value="TESTING" />
          <el-option label="已上线" value="DONE" />
          <el-option label="已挂起" value="SUSPENDED" />
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button :disabled="saving" @click="visible = false">取消</el-button>
      <el-button
        v-if="!isEdit && capability === 'available'"
        :disabled="saving"
        @click="handleSubmit(true)"
        >创建并定义问题</el-button
      >
      <el-button type="primary" :loading="saving" @click="handleSubmit(false)">{{
        isEdit ? '保存' : '创建需求'
      }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useDefinitionCapability } from '../composables/useDefinitionCapability'
import { createRequirementApi, updateRequirementApi } from '../api'
import { useWorkspaceStore } from '@/store/workspace'
import type { Requirement, PriorityLevel, RequirementStatus } from '@/types'
import { ElMessage } from 'element-plus'

const props = defineProps<{
  modelValue: boolean
  isEdit: boolean
  requirementData: Requirement | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'saved'): void
}>()

const workspaceStore = useWorkspaceStore()
const router = useRouter()
const { capability } = useDefinitionCapability()
const visible = ref(props.modelValue)
const saving = ref(false)
const dateRange = ref<[string, string] | []>([])
const datesEdited = ref(false)

const form = ref<Partial<Requirement>>({
  id: undefined,
  title: '',
  description: '',
  priority: 'MEDIUM' as PriorityLevel,
  status: 'TODO' as RequirementStatus,
  startDate: null,
  endDate: null,
  projectId: undefined
})

watch(
  () => props.modelValue,
  val => {
    visible.value = val
    if (val) {
      datesEdited.value = false
      if (props.isEdit && props.requirementData) {
        form.value = { ...props.requirementData }
        if (props.requirementData.startDate && props.requirementData.endDate) {
          dateRange.value = [props.requirementData.startDate, props.requirementData.endDate]
        } else {
          dateRange.value = []
        }
      } else {
        dateRange.value = []
        form.value = {
          id: undefined,
          title: '',
          description: '',
          priority: 'MEDIUM',
          status: 'TODO',
          startDate: null,
          endDate: null,
          projectId: workspaceStore.activeProjectId || undefined
        }
      }
    }
  }
)

watch(visible, val => {
  emit('update:modelValue', val)
})

const handleSubmit = async (defineAfterCreate = false) => {
  if (saving.value) return
  if (!form.value.title?.trim()) {
    ElMessage.warning('需求标题不能为空')
    return
  }

  if (dateRange.value && dateRange.value.length === 2) {
    form.value.startDate = dateRange.value[0]
    form.value.endDate = dateRange.value[1]
  } else if (!props.isEdit || datesEdited.value) {
    form.value.startDate = null
    form.value.endDate = null
  }

  saving.value = true
  try {
    if (props.isEdit && form.value.id) {
      await updateRequirementApi(form.value.id, form.value)
      ElMessage.success('更新成功')
    } else {
      if (workspaceStore.activeProjectId) {
        form.value.projectId = workspaceStore.activeProjectId
      }
      const created = await createRequirementApi(form.value)
      ElMessage.success('录入成功')
      if (defineAfterCreate) {
        await router.push({
          path: `/requirements/${created.id}`,
          query: { tab: 'overview', define: '1' }
        })
      }
    }
    visible.value = false
    emit('saved')
  } catch (err) {
  } finally {
    saving.value = false
  }
}
</script>
