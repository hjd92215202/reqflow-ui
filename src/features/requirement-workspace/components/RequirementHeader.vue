<!-- src/features/requirement-workspace/components/RequirementHeader.vue -->
<template>
  <header class="req-header-workspace">
    <div class="header-top-nav">
      <el-button link class="back-link-btn" @click="goBackHub"> ← 返回需求事项库 </el-button>
      <span class="nav-divider">/</span>
      <span class="nav-req-id">REQ-{{ requirement.id }}</span>
    </div>

    <div class="header-main-row">
      <div class="header-left-info">
        <div class="title-status-line">
          <h1 class="req-main-title">{{ requirement.title }}</h1>
          <el-tag size="small" :type="getPriorityTag(requirement.priority)">
            {{ requirement.priority }} 优先级
          </el-tag>
          <el-tag size="small" :type="getStatusTag(requirement.status)">
            {{ formatStatus(requirement.status) }}
          </el-tag>
        </div>
        <p v-if="requirement.description" class="req-main-desc">
          {{ requirement.description }}
        </p>
      </div>

      <div class="header-right-metrics">
        <div class="metric-card">
          <span class="metric-label">📅 整体排期</span>
          <span class="metric-val">
            {{ requirement.startDate || '未定' }} 至 {{ requirement.endDate || '未定' }}
          </span>
        </div>

        <div class="metric-card">
          <div class="metric-header-sub">
            <span class="metric-label">阶段完成度</span>
            <span class="metric-number">{{ stageDoneCount }} / {{ stageTotalCount }}</span>
          </div>
          <el-progress
            :percentage="stagePercent"
            :stroke-width="5"
            :show-text="false"
            :status="stagePercent === 100 ? 'success' : ''"
          />
        </div>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import type { Requirement, PriorityLevel, RequirementStatus } from '@/types'

const props = defineProps<{
  requirement: Requirement
  stageTotalCount: number
  stageDoneCount: number
}>()

const router = useRouter()

const stagePercent = computed(() => {
  if (props.stageTotalCount === 0) return 0
  return Math.round((props.stageDoneCount / props.stageTotalCount) * 100)
})

const goBackHub = () => {
  router.push('/requirements')
}

const getPriorityTag = (p: PriorityLevel) => {
  if (p === 'HIGH') return 'danger'
  if (p === 'MEDIUM') return 'warning'
  return 'info'
}

const getStatusTag = (s: RequirementStatus) => {
  if (s === 'DONE') return 'success'
  if (s === 'IN_PROGRESS') return 'warning'
  if (s === 'TESTING') return 'primary'
  if (s === 'SUSPENDED') return 'danger'
  return 'info'
}

const formatStatus = (s: RequirementStatus) => {
  const map: Record<RequirementStatus, string> = {
    TODO: '待处理',
    IN_PROGRESS: '进行中',
    TESTING: '测试中',
    DONE: '已完成',
    SUSPENDED: '已挂起'
  }
  return map[s] || s
}
</script>

<style scoped>
.req-header-workspace {
  background: #ffffff;
  border-bottom: 1px solid rgba(55, 53, 47, 0.08);
  padding: 14px 24px 10px 24px;
  flex-shrink: 0;
}

.header-top-nav {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #8c8c8c;
  margin-bottom: 6px;
}

.back-link-btn {
  font-size: 12px;
  color: #5f5e5b;
  padding: 0;
}

.back-link-btn:hover {
  color: #2383e2;
}

.nav-divider {
  color: rgba(55, 53, 47, 0.2);
}

.nav-req-id {
  font-family: ui-monospace, monospace;
  font-weight: 500;
}

.header-main-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
}

.title-status-line {
  display: flex;
  align-items: center;
  gap: 10px;
}

.req-main-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #37352f;
  line-height: 1.3;
}

.req-main-desc {
  margin: 6px 0 0 0;
  font-size: 13px;
  color: rgba(55, 53, 47, 0.65);
  line-height: 1.5;
  max-width: 800px;
}

.header-right-metrics {
  display: flex;
  align-items: center;
  gap: 24px;
}

.metric-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 140px;
}

.metric-header-sub {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.metric-label {
  font-size: 11px;
  color: #8c8c8c;
  font-weight: 500;
}

.metric-val {
  font-size: 12.5px;
  color: #37352f;
  font-weight: 500;
}

.metric-number {
  font-size: 11px;
  color: #37352f;
  font-weight: 600;
}

@media (max-width: 900px) {
  .req-header-workspace {
    padding: 12px 16px;
  }

  .header-main-row {
    flex-wrap: wrap;
  }

  .title-status-line {
    flex-wrap: wrap;
  }

  .header-right-metrics {
    width: 100%;
    justify-content: flex-start;
    gap: 16px;
  }
}
</style>
