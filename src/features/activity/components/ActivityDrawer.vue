<!-- src/features/activity/components/ActivityDrawer.vue -->
<template>
  <el-drawer
    v-model="visible"
    title="🕒 工程操作审计流水"
    size="380px"
    append-to-body
    destroy-on-close
  >
    <div v-loading="loading" class="activity-drawer-body">
      <el-alert v-if="loadError" :title="loadError" type="warning" :closable="false" show-icon />

      <el-timeline v-else-if="activities.length > 0">
        <el-timeline-item
          v-for="act in activities"
          :key="act.id"
          :timestamp="formatTime(act.createdAt)"
          placement="top"
          :type="getActivityType(act.actionType)"
        >
          <div class="activity-card">
            <div class="act-header">
              <span class="act-user">👤 {{ act.userName }}</span>
              <el-tag size="small" :type="getTargetTagType(act.targetType)">
                {{ formatTarget(act.targetType) }}
              </el-tag>
            </div>
            <p class="act-summary">{{ act.summary }}</p>
          </div>
        </el-timeline-item>
      </el-timeline>

      <el-empty v-else-if="!loading" description="暂无最近的操作流水" :image-size="80" />
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { getActivityLogsApi } from '../api'
import { useWorkspaceStore } from '@/store/workspace'
import type { ActivityLog } from '@/types'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
}>()

const workspaceStore = useWorkspaceStore()
const visible = ref(props.modelValue)
const loading = ref(false)
const activities = ref<ActivityLog[]>([])
const loadError = ref('')

watch(
  () => props.modelValue,
  val => {
    visible.value = val
    if (val) {
      loadActivities()
    }
  }
)

watch(visible, val => {
  emit('update:modelValue', val)
})

const loadActivities = async () => {
  loading.value = true
  loadError.value = ''
  try {
    const res = await getActivityLogsApi({
      workspaceId: workspaceStore.activeWorkspaceId || 1,
      page: 0,
      size: 20
    })
    if (Array.isArray(res)) {
      activities.value = res
    } else if (res && (res as any).content) {
      activities.value = (res as any).content
    }
  } catch {
    activities.value = []
    loadError.value = '当前服务器暂不支持操作流水，或服务暂时不可用。'
  } finally {
    loading.value = false
  }
}

const formatTime = (timeStr?: string) => {
  if (!timeStr) return ''
  return timeStr.replace('T', ' ').substring(0, 16)
}

const getActivityType = (action: string): 'primary' | 'success' | 'warning' | 'info' => {
  if (action === 'CREATE') return 'primary'
  if (action === 'STATUS_CHANGE') return 'success'
  if (action === 'DELETE') return 'warning'
  return 'info'
}

const getTargetTagType = (target: string): 'primary' | 'success' | 'warning' | 'info' => {
  if (target === 'REQUIREMENT') return 'primary'
  if (target === 'SUB_TASK') return 'success'
  if (target === 'WIKI') return 'warning'
  return 'info'
}

const formatTarget = (target: string): string => {
  const map: Record<string, string> = {
    REQUIREMENT: '需求',
    STAGE: '阶段',
    SUB_TASK: '任务',
    WIKI: 'Wiki',
    PROJECT: '项目'
  }
  return map[target] || target
}
</script>

<style scoped>
.activity-drawer-body {
  padding: 8px 4px;
}

.activity-card {
  background: #fcfcfb;
  border: 1px solid rgba(55, 53, 47, 0.08);
  border-radius: 6px;
  padding: 8px 12px;
  margin-top: 4px;
}

.act-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.act-user {
  font-size: 12px;
  font-weight: 600;
  color: #37352f;
}

.act-summary {
  margin: 0;
  font-size: 12.5px;
  color: #5f5e5b;
  line-height: 1.5;
}
</style>
