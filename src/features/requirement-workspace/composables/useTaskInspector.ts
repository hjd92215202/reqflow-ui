import { ref } from 'vue'

export type InspectorSubTab = 'detail' | 'subtasks' | 'dependencies' | 'activity'

export function useTaskInspector() {
  const activeInspectorTab = ref<InspectorSubTab>('detail')

  const setInspectorTab = (tab: InspectorSubTab) => {
    activeInspectorTab.value = tab
  }

  return {
    activeInspectorTab,
    setInspectorTab
  }
}
