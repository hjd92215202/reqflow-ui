import { onScopeDispose, ref, watch } from 'vue'
import { useUserStore } from '@/store/user'
import { supportsDefinitionApi } from '../api/definition'

export const definitionFeatureEnabled = import.meta.env.VITE_ENGINEERING_GROWTH !== 'false'

export function useDefinitionCapability() {
  const userStore = useUserStore()
  const capability = ref<'disabled' | 'checking' | 'available' | 'unavailable' | 'error'>(
    definitionFeatureEnabled ? 'checking' : 'disabled'
  )
  let requestId = 0
  const retryCapability = async () => {
    const currentRequest = ++requestId
    if (!definitionFeatureEnabled) {
      capability.value = 'disabled'
      return
    }
    capability.value = 'checking'
    try {
      const supported = await supportsDefinitionApi()
      if (requestId === currentRequest) {
        capability.value = supported ? 'available' : 'unavailable'
      }
    } catch {
      if (requestId === currentRequest) capability.value = 'error'
    }
  }
  watch(() => userStore.serverUrl, retryCapability, { immediate: true })
  onScopeDispose(() => requestId++)
  return { capability, retryCapability }
}
