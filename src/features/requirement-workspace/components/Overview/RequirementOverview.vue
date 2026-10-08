<!-- src/features/requirement-workspace/components/Overview/RequirementOverview.vue -->
<template>
  <div class="overview-container">
    <div class="overview-grid">
      <!-- 左栏：需求目标与业务范畴 -->
      <section class="overview-card main-info-card">
        <h3 class="card-title">🎯 需求目标与背景</h3>
        <div class="desc-content">
          {{
            requirement.description || '暂无详细背景说明，可通过【编辑】完善业务目标与验收准则。'
          }}
        </div>

        <el-divider style="margin: 16px 0" />

        <h3 class="card-title">📊 快速执行入口</h3>
        <div class="quick-nav-actions">
          <el-button type="primary" size="default" @click="emit('switch-tab', 'execution')">
            ⚡ 进入执行工作区 ({{ stages.length }} 阶段)
          </el-button>
          <el-button plain size="default" @click="emit('switch-tab', 'plan')">
            🗺️ 查看/编排执行计划
          </el-button>
          <el-button plain size="default" @click="emit('switch-tab', 'knowledge')">
            📖 查阅关联 Wiki
          </el-button>
        </div>
      </section>

      <!-- 右栏：执行概览与阶段完成度状态卡片 -->
      <section class="overview-card stage-summary-card">
        <h3 class="card-title">📍 阶段推进状态 ({{ stages.length }})</h3>

        <div v-if="stages.length > 0" class="mini-stage-list">
          <button
            v-for="(st, idx) in stages"
            :key="st.id"
            type="button"
            class="mini-stage-row"
            @click="emit('go-stage-execution', st.id)"
          >
            <div class="mini-stage-left">
              <span class="stage-seq">0{{ idx + 1 }}</span>
              <span class="stage-name">{{ st.title }}</span>
            </div>
            <div class="mini-stage-right">
              <el-tag size="small" :type="getStStatusType(st.status)">
                {{ formatStStatus(st.status) }}
              </el-tag>
              <span class="stage-chevron">➔</span>
            </div>
          </button>
        </div>

        <el-empty v-else description="尚未划分任何执行阶段" :image-size="60">
          <el-button type="primary" size="small" @click="emit('switch-tab', 'plan')">
            立即制定计划
          </el-button>
        </el-empty>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Requirement, Stage, TaskStatus } from '@/types'

defineProps<{
  requirement: Requirement
  stages: Stage[]
}>()

const emit = defineEmits<{
  (e: 'switch-tab', tab: string): void
  (e: 'go-stage-execution', stageId: number): void
}>()

const getStStatusType = (s: TaskStatus) => {
  if (s === 'DONE') return 'success'
  if (s === 'IN_PROGRESS') return 'warning'
  return 'info'
}

const formatStStatus = (s: TaskStatus) => {
  if (s === 'DONE') return '已完成'
  if (s === 'IN_PROGRESS') return '进行中'
  return '待处理'
}
</script>

<style scoped>
.overview-container {
  flex: 1;
  width: 100%;
  min-width: 0;
  padding: 24px;
  height: 100%;
  overflow-y: auto;
  box-sizing: border-box;
}

.overview-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(320px, 1fr);
  gap: 20px;
  max-width: 1440px;
  margin: 0 auto;
}

.overview-card {
  background: #ffffff;
  border: 1px solid rgba(55, 53, 47, 0.08);
  border-radius: 6px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.02);
}

.card-title {
  margin: 0 0 14px 0;
  font-size: 14px;
  font-weight: 600;
  color: #37352f;
}

.desc-content {
  font-size: 13.5px;
  line-height: 1.7;
  color: #4b4a47;
  white-space: pre-wrap;
  min-height: 80px;
}

.quick-nav-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.mini-stage-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mini-stage-row {
  width: 100%;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  border-radius: 4px;
  border: 1px solid rgba(55, 53, 47, 0.06);
  background-color: #fcfcfb;
  cursor: pointer;
  transition: all 0.15s ease;
}

.mini-stage-row:focus-visible {
  outline: 2px solid rgba(35, 131, 226, 0.55);
  outline-offset: 1px;
}

.mini-stage-row:hover {
  border-color: #2383e2;
  background-color: #f7fbff;
  transform: translateX(2px);
}

.mini-stage-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.stage-seq {
  font-family: ui-monospace, monospace;
  font-size: 11px;
  color: #8c8c8c;
  font-weight: 600;
}

.stage-name {
  font-size: 13px;
  color: #37352f;
  font-weight: 500;
}

@media (max-width: 900px) {
  .overview-container {
    padding: 16px;
  }

  .overview-grid {
    grid-template-columns: 1fr;
    gap: 14px;
  }
}

@media (max-width: 620px) {
  .overview-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

.mini-stage-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stage-chevron {
  font-size: 11px;
  color: #8c8c8c;
}
</style>
