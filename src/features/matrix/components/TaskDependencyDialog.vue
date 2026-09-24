<!-- src/features/matrix/components/TaskDependencyDialog.vue -->
<template>
  <el-dialog
    v-model="visible"
    :title="`🔗 任务依赖管理 · ${task?.title || ''}`"
    width="520px"
    append-to-body
    :close-on-click-modal="false"
  >
    <div v-if="task" class="dep-dialog-content">
      <div class="dep-section">
        <span class="dep-section-title">📌 当前已绑定的前置任务:</span>
        <div v-if="currentPredecessors.length > 0" class="dep-list">
          <div v-for="dep in currentPredecessors" :key="dep.id" class="dep-item-row">
            <div class="dep-item-info">
              <span class="dep-task-title">{{ getTaskTitle(dep.predecessorId) }}</span>
              <el-tag
                size="small"
                :type="getTaskStatus(dep.predecessorId) === 'DONE' ? 'success' : 'warning'"
              >
                {{ getTaskStatus(dep.predecessorId) === 'DONE' ? '已完成' : '未完成' }}
              </el-tag>
            </div>
            <el-button type="danger" link size="small" @click="handleRemoveDep(dep.id)">
              解除依赖
            </el-button>
          </div>
        </div>
        <p v-else class="dep-empty-hint">暂无前置任务（该任务可随时启动）</p>
      </div>

      <el-divider style="margin: 16px 0" />

      <!-- 添加新前置任务 -->
      <div class="dep-add-box">
        <span class="dep-section-title">➕ 关联新前置依赖:</span>
        <div class="add-row">
          <el-select
            v-model="selectedPredecessorId"
            placeholder="选择必须先完成的前置任务..."
            style="flex: 1"
            size="default"
            filterable
          >
            <el-option
              v-for="cand in candidateTasks"
              :key="cand.id"
              :label="cand.title"
              :value="cand.id"
            >
              <div class="cand-option">
                <span>{{ cand.title }}</span>
                <span class="cand-assignee">👤 {{ cand.assignee || '未分配' }}</span>
              </div>
            </el-option>
          </el-select>
          <el-button type="primary" :disabled="!selectedPredecessorId" @click="handleAddDep">
            确认绑定
          </el-button>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { createDependencyApi, deleteDependencyApi } from '../api/dependency'
import type { SubTask, TaskDependency } from '@/types'
import { ElMessage } from 'element-plus'

const props = defineProps<{
  modelValue: boolean
  stageId: number
  task: SubTask | null
  allTasks: SubTask[]
  dependencies: TaskDependency[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'updated'): void
}>()

const visible = ref(props.modelValue)
watch(
  () => props.modelValue,
  val => {
    visible.value = val
  }
)
watch(visible, val => {
  emit('update:modelValue', val)
})

const selectedPredecessorId = ref<number | null>(null)

// 查找当前任务的所有前置依赖
const currentPredecessors = computed(() => {
  if (!props.task) return []
  return props.dependencies.filter(d => d.successorId === props.task!.id)
})

// 候选的前置任务（排除自身、排除已存在依赖）
const candidateTasks = computed(() => {
  if (!props.task) return []
  const alreadyPreIds = new Set(currentPredecessors.value.map(d => d.predecessorId))
  alreadyPreIds.add(props.task.id) // 排除自身防止死锁

  return props.allTasks.filter(t => !alreadyPreIds.has(t.id))
})

const getTaskTitle = (taskId: number): string => {
  const target = props.allTasks.find(t => t.id === taskId)
  return target ? target.title : `任务 #${taskId}`
}

const getTaskStatus = (taskId: number): string => {
  const target = props.allTasks.find(t => t.id === taskId)
  return target ? target.status : 'TODO'
}

const handleAddDep = async () => {
  if (!props.task || !selectedPredecessorId.value) return
  try {
    await createDependencyApi({
      stageId: props.stageId,
      predecessorId: selectedPredecessorId.value,
      successorId: props.task.id,
      type: 'FINISH_TO_START'
    })
    ElMessage.success('已绑定前置依赖任务')
    selectedPredecessorId.value = null
    emit('updated')
  } catch (err) {}
}

const handleRemoveDep = async (depId: number) => {
  try {
    await deleteDependencyApi(props.stageId, depId)
    ElMessage.success('已解除依赖关系')
    emit('updated')
  } catch (err) {}
}
</script>

<style scoped>
.dep-dialog-content {
  padding: 4px 0;
}

.dep-section-title {
  font-size: 13px;
  font-weight: 600;
  color: #37352f;
  display: block;
  margin-bottom: 8px;
}

.dep-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.dep-item-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background-color: #fcfcfb;
  border: 1px solid rgba(55, 53, 47, 0.08);
  border-radius: 4px;
}

.dep-item-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dep-task-title {
  font-size: 13px;
  color: #37352f;
}

.dep-empty-hint {
  font-size: 12px;
  color: #8c8c8c;
  margin: 4px 0;
}

.dep-add-box {
  margin-top: 10px;
}

.add-row {
  display: flex;
  gap: 10px;
  margin-top: 6px;
}

.cand-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.cand-assignee {
  font-size: 11px;
  color: #8c8c8c;
}
</style>
