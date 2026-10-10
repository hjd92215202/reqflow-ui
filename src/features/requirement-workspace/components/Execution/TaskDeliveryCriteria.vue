<template>
  <section v-if="available" class="delivery-criteria" aria-label="交付标准">
    <div class="delivery-header">
      <strong>交付标准</strong>
      <el-button link type="primary" @click="draft.editing = true">{{
        dirty ? '继续编辑' : '编辑'
      }}</el-button>
    </div>
    <p class="label">交付物</p>
    <p>{{ task.deliverable || '尚未填写' }}</p>
    <p class="label">完成标准</p>
    <p>{{ task.completionCriteria || '尚未填写' }}</p>
    <p v-if="dirty" class="draft-hint">有未保存修改</p>
    <el-dialog
      v-model="draft.editing"
      title="编辑交付标准"
      width="min(520px, calc(100vw - 32px))"
      append-to-body
      :close-on-click-modal="false"
      :close-on-press-escape="!draft.saving"
      :show-close="!draft.saving"
      :before-close="closeEditor"
    >
      <el-form label-position="top" :disabled="draft.saving">
        <el-form-item label="交付物（选填）">
          <el-input
            v-model="draft.deliverable"
            type="textarea"
            :rows="4"
            maxlength="10000"
            placeholder="任务完成时交付什么？"
          />
        </el-form-item>
        <el-form-item label="完成标准（选填）">
          <el-input
            v-model="draft.completionCriteria"
            type="textarea"
            :rows="4"
            maxlength="10000"
            placeholder="如何判断工作已完成？"
          />
        </el-form-item>
      </el-form>
      <el-alert v-if="draft.error" :title="draft.error" type="error" :closable="false" show-icon />
      <template #footer>
        <el-button :disabled="draft.saving" @click="closeEditor(() => (draft.editing = false))"
          >取消</el-button
        >
        <el-button type="primary" :loading="draft.saving" :disabled="!dirty" @click="saveDraft"
          >保存交付标准</el-button
        >
      </template>
    </el-dialog>
  </section>
</template>
<script setup lang="ts">
import { computed, watch, onBeforeUnmount } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { SubTask } from '@/types'
import {
  useExecutionStandards,
  type TaskStandardsDraft
} from '../../composables/useExecutionStandards'

const props = defineProps<{ task: SubTask }>()
const { available, save, drafts } = useExecutionStandards()
const normalized = (deliverable?: string | null, completionCriteria?: string | null) =>
  JSON.stringify({
    deliverable: deliverable?.trim() || null,
    completionCriteria: completionCriteria?.trim() || null
  })
const fresh = (): TaskStandardsDraft => ({
  deliverable: props.task.deliverable || '',
  completionCriteria: props.task.completionCriteria || '',
  baseline: normalized(props.task.deliverable, props.task.completionCriteria),
  editing: false,
  saving: false,
  error: ''
})
// Store drafts at workspace scope so resizing the inspector keeps unsaved input.
watch(
  () => props.task.id,
  id => {
    if (!drafts[id]) drafts[id] = fresh()
  },
  { immediate: true, flush: 'sync' }
)
const draft = computed(() => drafts[props.task.id])
const dirty = computed(
  () => normalized(draft.value.deliverable, draft.value.completionCriteria) !== draft.value.baseline
)
watch(
  () => [props.task.id, props.task.deliverable, props.task.completionCriteria],
  () => {
    if (dirty.value || draft.value.saving) return
    Object.assign(draft.value, fresh(), { editing: draft.value.editing })
  },
  { immediate: true }
)
async function allowDiscard() {
  if (draft.value.saving) {
    ElMessage.warning('交付标准正在保存，请稍候')
    return false
  }
  if (!dirty.value) return true
  try {
    await ElMessageBox.confirm('交付标准有未保存修改，离开将丢弃这些修改。', '保留未保存内容', {
      confirmButtonText: '丢弃修改',
      cancelButtonText: '继续编辑',
      type: 'warning'
    })
    Object.assign(draft.value, fresh())
    return true
  } catch {
    return false
  }
}
async function closeEditor(done: () => void) {
  if (await allowDiscard()) done()
}
async function saveDraft() {
  if (!dirty.value || draft.value.saving) return
  const state = draft.value
  const task = props.task
  state.saving = true
  state.error = ''
  try {
    const updated = await save(task, {
      deliverable: state.deliverable.trim() || null,
      completionCriteria: state.completionCriteria.trim() || null
    })
    state.deliverable = updated.deliverable || ''
    state.completionCriteria = updated.completionCriteria || ''
    state.baseline = normalized(updated.deliverable, updated.completionCriteria)
    state.editing = false
    ElMessage.success('交付标准已保存')
  } catch {
    state.error = '保存失败，输入已保留，请检查后重试。'
  } finally {
    state.saving = false
  }
}
onBeforeRouteLeave(allowDiscard)
onBeforeRouteUpdate((to, from) => (to.fullPath !== from.fullPath ? allowDiscard() : true))
const protectWindow = (event: BeforeUnloadEvent) => {
  if (dirty.value || draft.value.saving) {
    event.preventDefault()
    event.returnValue = ''
  }
}
window.addEventListener('beforeunload', protectWindow)
onBeforeUnmount(() => window.removeEventListener('beforeunload', protectWindow))
</script>
<style scoped>
.delivery-criteria {
  margin: 16px 0;
  border-block: 1px solid #ebeef5;
  padding: 12px 0;
}
.delivery-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
}
p {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font-size: 12px;
  color: #606266;
}
.label {
  color: #909399;
  margin-bottom: 4px;
}
.draft-hint {
  color: #b88230;
}
</style>
