<!-- src/features/requirement-workspace/components/Activity/RequirementActivity.vue -->
<template>
  <div class="req-activity-container">
    <div class="activity-filter-bar">
      <span class="activity-heading">🕒 需求工程活动流水</span>
      <el-radio-group v-model="filterType" size="small">
        <el-radio-button value="ALL">全部动态</el-radio-button>
        <el-radio-button value="STATUS">状态流转</el-radio-button>
        <el-radio-button value="TASK">工作项变更</el-radio-button>
      </el-radio-group>
    </div>

    <div v-loading="loading" class="activity-timeline-wrap">
      <el-alert v-if="loadError" :title="loadError" type="error" show-icon :closable="false">
        <template #default>
          <el-button link type="primary" :loading="loading" @click="loadActivities">重试</el-button>
        </template>
      </el-alert>
      <el-timeline v-if="filteredLogs.length > 0">
        <el-timeline-item
          v-for="item in filteredLogs"
          :key="item.id"
          :timestamp="formatTime(item.createdAt)"
          placement="top"
          :type="getActionColor(item.actionType)"
        >
          <div class="activity-item-card">
            <div class="item-header">
              <span class="item-operator">👤 {{ item.userName }}</span>
              <el-tag size="small" :type="getTargetTag(item.targetType)">
                {{ formatTarget(item.targetType) }}
              </el-tag>
            </div>
            <p class="item-summary">{{ item.summary }}</p>
          </div>
        </el-timeline-item>
      </el-timeline>

      <el-empty v-else-if="!loadError" description="暂无当前需求的相关操作流水" :image-size="80" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getActivityLogsApi } from '@/features/activity/api'
import type { ActivityLog } from '@/types'

const props = defineProps<{
  requirementId: number
}>()

const loading = ref(false)
const loadError = ref('')
const logs = ref<ActivityLog[]>([])
const filterType = ref<'ALL' | 'STATUS' | 'TASK'>('ALL')

const loadActivities = async () => {
  loading.value = true
  loadError.value = ''
  try {
    const res = await getActivityLogsApi({ requirementId: props.requirementId, page: 0, size: 50 })
    const list: ActivityLog[] = Array.isArray(res) ? res : (res as any)?.content || []
    logs.value = list
  } catch {
    loadError.value = logs.value.length
      ? '活动加载失败，仍显示上次成功的记录。'
      : '活动流水加载失败，请检查网络后重试。'
  } finally {
    loading.value = false
  }
}

const filteredLogs = computed(() => {
  if (filterType.value === 'STATUS') {
    return logs.value.filter(l => l.actionType.includes('STATUS'))
  }
  if (filterType.value === 'TASK') {
    return logs.value.filter(l => l.targetType === 'SUB_TASK')
  }
  return logs.value
})

const formatTime = (iso?: string) => {
  if (!iso) return ''
  return iso.replace('T', ' ').substring(0, 16)
}

const getActionColor = (action: string): 'primary' | 'success' | 'warning' | 'info' => {
  if (action.includes('CREATE')) return 'primary'
  if (action.includes('STATUS')) return 'success'
  if (action.includes('DELETE')) return 'warning'
  return 'info'
}

const getTargetTag = (target: string): 'primary' | 'success' | 'warning' | 'info' => {
  if (target === 'REQUIREMENT') return 'primary'
  if (target === 'SUB_TASK') return 'success'
  return 'info'
}

const formatTarget = (target: string): string => {
  const map: Record<string, string> = {
    REQUIREMENT: '需求',
    STAGE: '阶段',
    SUB_TASK: '任务',
    WIKI: 'Wiki'
  }
  return map[target] || target
}

onMounted(() => {
  loadActivities()
})
</script>

<style scoped>
.req-activity-container {
  flex: 1;
  width: 100%;
  min-width: 0;
  padding: 24px 32px;
  height: 100%;
  overflow-y: auto;
  box-sizing: border-box;
}

.activity-filter-bar {
  max-width: 1080px;
  margin-right: auto;
  margin-left: auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.activity-heading {
  font-size: 15px;
  font-weight: 600;
  color: #37352f;
}

.activity-timeline-wrap {
  max-width: 1080px;
  margin: 0 auto;
}

.activity-item-card {
  max-width: 900px;
  background-color: #fcfcfb;
  border: 1px solid rgba(55, 53, 47, 0.08);
  border-radius: 6px;
  padding: 10px 14px;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.item-operator {
  font-size: 12px;
  font-weight: 600;
  color: #37352f;
}

.item-summary {
  margin: 0;
  font-size: 13px;
  color: #5f5e5b;
  line-height: 1.5;
}
</style>
