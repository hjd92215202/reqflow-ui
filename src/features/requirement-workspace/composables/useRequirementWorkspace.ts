import { computed } from 'vue'
import { useRoute, useRouter, type LocationQueryRaw } from 'vue-router'
import type { RequirementWorkspaceTab, Stage } from '@/types'

export function useRequirementWorkspace() {
  const route = useRoute()
  const router = useRouter()

  const requirementId = computed(() => Number(route.params.id))

  const activeTab = computed<RequirementWorkspaceTab>({
    get() {
      const tab = route.query.tab as string
      if (['overview', 'plan', 'execution', 'activity', 'knowledge'].includes(tab)) {
        return tab as RequirementWorkspaceTab
      }
      return 'overview'
    },
    set(newTab) {
      router.replace({
        query: {
          ...route.query,
          tab: newTab
        }
      })
    }
  })

  const currentStageId = computed<number | null>(() => {
    return route.query.stageId ? Number(route.query.stageId) : null
  })

  const currentTaskId = computed<number | null>(() => {
    return route.query.taskId ? Number(route.query.taskId) : null
  })

  const setStageId = (stageId: number | null) => {
    const newQuery = { ...route.query }
    if (stageId) {
      newQuery.stageId = String(stageId)
    } else {
      delete newQuery.stageId
    }
    // 切换 Stage 时自动关闭当前任务面板，避免不一致
    delete newQuery.taskId
    router.replace({ query: newQuery })
  }

  const openStageExecution = (stageId: number) => {
    const newQuery: LocationQueryRaw = {
      ...route.query,
      tab: 'execution',
      stageId: String(stageId)
    }
    // Stage 跳转必须在同一次路由更新中切换 Tab 和选中阶段，避免互相覆盖。
    delete newQuery.taskId
    router.replace({ query: newQuery })
  }

  const setTaskId = (taskId: number | null) => {
    const newQuery = { ...route.query }
    if (taskId) {
      newQuery.taskId = String(taskId)
    } else {
      delete newQuery.taskId
    }
    router.replace({ query: newQuery })
  }

  /**
   * Stage 自动容错推导规则：
   * 1. 若当前 URL stageId 合法，维持原样
   * 2. 否则选择第一个非 DONE 的 Stage
   * 3. 若全部 DONE，选择最后一个 Stage
   */
  const resolveInitialStageId = (stages: Stage[]): number | null => {
    if (!stages || stages.length === 0) return null
    if (currentStageId.value && stages.some(s => s.id === currentStageId.value)) {
      return currentStageId.value
    }
    const notDone = stages.find(s => s.status !== 'DONE')
    return notDone ? notDone.id : stages[stages.length - 1].id
  }

  return {
    requirementId,
    activeTab,
    currentStageId,
    currentTaskId,
    setStageId,
    openStageExecution,
    setTaskId,
    resolveInitialStageId
  }
}
