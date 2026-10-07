<!-- src/features/requirement-workspace/components/Plan/RequirementPlan.vue -->
<template>
  <div class="plan-page-container">
    <div class="plan-header-toolbar">
      <div class="plan-title-block">
        <h3 class="plan-heading">🗺️ 执行计划与阶段安排</h3>
        <span class="plan-sub">建立清晰的递进阶段，再开始向下拆解工作事项。</span>
      </div>
      <el-button type="primary" size="default" @click="editorVisible = true">
        ➕ 新增执行阶段
      </el-button>
    </div>

    <el-divider style="margin: 16px 0" />

    <StageList
      :stages="stages"
      @update-stage="handleUpdateStage"
      @delete-stage="handleDeleteStage"
      @go-execution="id => emit('go-execution', id)"
    />

    <StageEditor v-model="editorVisible" @submit="handleCreateStage" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Stage } from '@/types'
import { ElMessageBox, ElMessage } from 'element-plus'
import StageList from './StageList.vue'
import StageEditor from './StageEditor.vue'

defineProps<{
  stages: Stage[]
}>()

const emit = defineEmits<{
  (e: 'create-stage', payload: { title: string; dateRange: [string, string] | [] }): void
  (e: 'update-stage', id: number, data: Partial<Stage>): void
  (e: 'delete-stage', id: number): void
  (e: 'go-execution', stageId: number): void
}>()

const editorVisible = ref(false)

const handleCreateStage = (payload: { title: string; dateRange: [string, string] | [] }) => {
  emit('create-stage', payload)
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
      ElMessage.success('阶段已删除')
    })
    .catch(() => {})
}
</script>

<style scoped>
.plan-page-container {
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
