<!-- src/features/todo/components/TodoStatsPanel.vue -->
<template>
  <aside class="sidebar-right">
    <!-- 1. 概览进度卡片 -->
    <div class="sidebar-card">
      <h3 class="card-title">📊 完成进度分析</h3>
      <div class="progress-circle-box">
        <el-progress
          type="circle"
          :percentage="completionPercent"
          :width="110"
          :stroke-width="8"
          :color="customColors"
        />
      </div>
      <div class="stats-grid">
        <div class="stat-cell">
          <span class="stat-val warning-val">{{ inProgressCount }}</span>
          <span class="stat-lbl">进行中</span>
        </div>
        <div class="stat-cell">
          <span class="stat-val">{{ pendingCount }}</span>
          <span class="stat-lbl">待处理</span>
        </div>
        <div class="stat-cell">
          <span class="stat-val success-val">{{ completedCount }}</span>
          <span class="stat-lbl">已完成</span>
        </div>
        <div class="stat-cell">
          <span class="stat-val">{{ totalCount }}</span>
          <span class="stat-lbl">总项数</span>
        </div>
      </div>
    </div>

    <!-- 2. 待办类型分布卡片 -->
    <div class="sidebar-card">
      <h3 class="card-title">📌 待办类型分布</h3>
      <div class="distribution-list">
        <div class="dist-item">
          <div class="dist-row">
            <span class="dist-label">📝 日常个人待办</span>
            <span class="dist-val">{{ personalCount }} 项</span>
          </div>
          <el-progress
            :percentage="totalCount ? Math.round((personalCount / totalCount) * 100) : 0"
            :show-text="false"
            :stroke-width="6"
            color="#e6a23c"
          />
        </div>

        <div class="dist-item" style="margin-top: 14px">
          <div class="dist-row">
            <span class="dist-label">📋 需求派生待办</span>
            <span class="dist-val">{{ projectCount }} 项</span>
          </div>
          <el-progress
            :percentage="totalCount ? Math.round((projectCount / totalCount) * 100) : 0"
            :show-text="false"
            :stroke-width="6"
            color="#2383e2"
          />
        </div>
      </div>
    </div>

    <!-- 3. 高效提示卡片 -->
    <div class="sidebar-card tip-card">
      <div class="tip-header">
        <span class="tip-icon">💡</span>
        <span class="tip-title">联动提示</span>
      </div>
      <p class="tip-body">
        【需求待办】来自协同矩阵分配。新建与重置的待办默认处于【进行中】状态，勾选打勾后将自动同步为【已完成】。
      </p>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { TodoItem } from '@/types'

const props = defineProps<{
  todos: TodoItem[]
}>()

const customColors = [
  { color: '#f56c6c', percentage: 20 },
  { color: '#e6a23c', percentage: 60 },
  { color: '#2383e2', percentage: 100 }
]

const totalCount = computed(() => props.todos.length)
const personalCount = computed(() => props.todos.filter(t => !t.isProjectTask).length)
const projectCount = computed(() => props.todos.filter(t => t.isProjectTask).length)
const pendingCount = computed(() => props.todos.filter(t => t.status === 'TODO').length)
const inProgressCount = computed(() => props.todos.filter(t => t.status === 'IN_PROGRESS').length)
const completedCount = computed(() => props.todos.filter(t => t.status === 'DONE').length)

const completionPercent = computed(() => {
  return totalCount.value > 0 ? Math.round((completedCount.value / totalCount.value) * 100) : 0
})
</script>

<style scoped>
.sidebar-right {
  width: 310px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex-shrink: 0;
}

.sidebar-card {
  background: #ffffff;
  border-radius: 8px;
  padding: 18px 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.card-title {
  margin: 0 0 14px 0;
  font-size: 14px;
  font-weight: 700;
  color: #37352f;
}

.progress-circle-box {
  display: flex;
  justify-content: center;
  padding: 10px 0 16px 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  border-top: 1px solid rgba(55, 53, 47, 0.08);
  padding-top: 12px;
}

.stat-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-val {
  font-size: 15px;
  font-weight: 700;
  color: #37352f;
}

.warning-val {
  color: #e6a23c;
}

.success-val {
  color: #0d7c50;
}

.stat-lbl {
  font-size: 11px;
  color: #8c8c8c;
  margin-top: 2px;
  white-space: nowrap;
}

.dist-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.dist-label {
  font-size: 12px;
  color: #37352f;
}

.dist-val {
  font-size: 12px;
  font-weight: 600;
  color: #8c8c8c;
}

.tip-card {
  background-color: #f7f9fc;
  border: 1px solid #e1e9f5;
}

.tip-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}

.tip-icon {
  font-size: 16px;
}

.tip-title {
  font-size: 13px;
  font-weight: 700;
  color: #2383e2;
}

.tip-body {
  margin: 0;
  font-size: 12px;
  color: #606266;
  line-height: 1.6;
}
</style>
