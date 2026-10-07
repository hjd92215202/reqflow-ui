<!-- src/features/requirement-workspace/components/Execution/TaskActivity.vue -->
<template>
  <div class="task-act-pane">
    <el-empty description="暂无当前任务的操作流水" :image-size="56" />
  </div>
</template>

<script setup lang="ts">
import type { SubTask } from '@/types'

defineProps<{
  task: SubTask
}>()
</script>

<style scoped>
.task-act-pane {
  padding: 12px 4px;
}
.act-text {
  font-size: 12px;
  color: #5f5e5b;
}
</style>
