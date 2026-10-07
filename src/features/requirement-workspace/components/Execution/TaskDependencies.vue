<!-- src/features/requirement-workspace/components/Execution/TaskDependencies.vue -->
<template>
  <div class="task-deps-pane">
    <div class="deps-sec">
      <span class="sec-label">📌 当前已绑定的前置任务:</span>
      <div v-if="predecessors.length > 0" class="dep-list">
        <div v-for="dep in predecessors" :key="dep.id" class="dep-item">
          <div class="dep-item-title">
            <span>{{ getTaskTitle(dep.predecessorId) }}</span>
            <el-tag
              size="small"
              :type="getTaskStatus(dep.predecessorId) === 'DONE' ? 'success' : 'warning'"
            >
              {{ getTaskStatus(dep.predecessorId) === 'DONE' ? '已完成' : '阻塞中' }}
            </el-tag>
          </div>
          <el-button type="danger" link size="small" @click="emit('remove-dep', dep.id)">
            解除
          </el-button>
        </div>
      </div>
      <p v-else class="empty-hint">暂无前置依赖，可随时启动</p>
    </div>

    <el-divider style="margin: 12px 0" />

    <div class="add-dep-sec">
      <span class="sec-label">➕ 绑定新前置任务:</span>
      <div class="add-dep-row">
        <el-select
          v-model="selectedPredId"
          placeholder="选择前置依赖..."
          size="small"
          style="flex: 1"
          filterable
        >
          <el-option
            v-for="cand in candidateTasks"
            :key="cand.id"
            :label="cand.title"
            :value="cand.id"
          />
        </el-select>
        <el-button type="primary" size="small" :disabled="!selectedPredId" @click="handleAdd">
          绑定
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { SubTask, TaskDependency } from '@/types'

const props = defineProps<{
  task: SubTask
  allFlatTasks: SubTask[]
  dependencies: TaskDependency[]
}>()

const emit = defineEmits<{
  (e: 'add-dep', predId: number): void
  (e: 'remove-dep', depId: number): void
}>()

const selectedPredId = ref<number | null>(null)

const predecessors = computed(() => {
  return props.dependencies.filter(d => d.successorId === props.task.id)
})

const candidateTasks = computed(() => {
  const bound = new Set(predecessors.value.map(d => d.predecessorId))
  bound.add(props.task.id)
  return props.allFlatTasks.filter(t => !bound.has(t.id))
})

const getTaskTitle = (id: number) => {
  const t = props.allFlatTasks.find(item => item.id === id)
  return t ? t.title : `任务 #${id}`
}

const getTaskStatus = (id: number) => {
  const t = props.allFlatTasks.find(item => item.id === id)
  return t ? t.status : 'TODO'
}

const handleAdd = () => {
  if (!selectedPredId.value) return
  emit('add-dep', selectedPredId.value)
  selectedPredId.value = null
}
</script>

<style scoped>
.task-deps-pane {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 0;
}

.sec-label {
  font-size: 12px;
  font-weight: 600;
  color: #37352f;
  margin-bottom: 6px;
  display: block;
}

.dep-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.dep-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 10px;
  background-color: #fbfbfa;
  border-radius: 4px;
  border: 1px solid rgba(55, 53, 47, 0.08);
}

.dep-item-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #37352f;
}

.empty-hint {
  font-size: 12px;
  color: #8c8c8c;
  margin: 4px 0;
}

.add-dep-row {
  display: flex;
  gap: 8px;
}
</style>
