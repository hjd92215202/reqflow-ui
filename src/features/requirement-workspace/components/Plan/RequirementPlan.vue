<!-- src/features/requirement-workspace/components/Plan/RequirementPlan.vue -->
<template>
  <div class="plan-page-container">
    <div class="plan-header-toolbar">
      <div class="plan-title-block">
        <h3 class="plan-heading">🗺️ 执行计划与阶段安排</h3>
        <span class="plan-sub">建立清晰的递进阶段，再开始向下拆解工作事项。</span>
      </div>
      <el-button type="primary" size="default" @click="openEditor(null)">
        ➕ 新增执行阶段
      </el-button>
    </div>

    <el-divider style="margin: 16px 0" />
    <el-alert
      v-if="countsError"
      title="部分工作项统计加载失败，请重试。"
      type="warning"
      :closable="false"
    >
      <el-button link :loading="countsLoading" @click="emit('retry-counts')"
        >重新加载统计</el-button
      >
    </el-alert>

    <StageList
      :stages="stages"
      :tasks-by-stage="tasksByStage"
      :counts-loading="countsLoading"
      @edit-stage="openEditor"
      @update-stage="handleUpdateStage"
      @delete-stage="handleDeleteStage"
      @go-execution="id => emit('go-execution', id)"
    />

    <StageEditor v-model="editorVisible" :stage="editingStage" @submit="handleSubmitStage" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Stage, StageFormPayload, SubTask } from '@/types'
import { ElMessageBox, ElMessage } from 'element-plus'
import StageList from './StageList.vue'
import StageEditor from './StageEditor.vue'

defineProps<{
  stages: Stage[]
  tasksByStage: Record<number, SubTask[]>
  countsLoading?: boolean
  countsError?: string
}>()

const emit = defineEmits<{
  (e: 'create-stage', payload: StageFormPayload, complete: (saved: boolean) => void): void
  (e: 'update-stage', id: number, data: Partial<Stage>, complete?: (saved: boolean) => void): void
  (e: 'delete-stage', id: number): void
  (e: 'go-execution', stageId: number): void
  (e: 'retry-counts'): void
}>()

const editorVisible = ref(false)
const editingStage = ref<Stage | null>(null)
const openEditor = (stage: Stage | null) => {
  editingStage.value = stage
  editorVisible.value = true
}

const handleSubmitStage = (payload: StageFormPayload, complete: (saved: boolean) => void) => {
  if (editingStage.value) emit('update-stage', editingStage.value.id, payload, complete)
  else emit('create-stage', payload, complete)
}

const handleUpdateStage = (id: number, data: Partial<Stage>) => {
  emit('update-stage', id, data)
}

const handleDeleteStage = (id: number) => {
  ElMessageBox.confirm(
    '确定要删除该执行阶段吗？该阶段所属的所有任务项及其依赖边将一并清除。',
    '提示',
    { type: 'warning' }
  )
    .then(() => {
      emit('delete-stage', id)
    })
    .catch(error => {
      if (error !== 'cancel' && error !== 'close') ElMessage.error('无法确认删除操作，请重试')
    })
}
</script>

<style scoped>
.plan-page-container {
  flex: 1;
  width: 100%;
  max-width: 1440px;
  min-width: 0;
  margin: 0 auto;
  padding: 24px;
  height: 100%;
  overflow-y: auto;
  box-sizing: border-box;
}

.plan-header-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.plan-heading {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #37352f;
}

.plan-sub {
  font-size: 12px;
  color: #8c8c8c;
}
</style>
