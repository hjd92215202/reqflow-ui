<template>
  <el-drawer
    v-model="visible"
    title="决策记录"
    size="min(760px, 100vw)"
    append-to-body
    :close-on-click-modal="false"
    :close-on-press-escape="!saving"
    :show-close="!saving"
    :before-close="closeDrawer"
  >
    <el-alert
      v-if="capability === 'checking'"
      title="正在检查决策能力…"
      type="info"
      :closable="false"
    />
    <el-alert
      v-else-if="capability !== 'available'"
      :title="
        capability === 'error'
          ? '决策能力检测失败，请重试'
          : '当前服务未启用决策记录，请升级后端后使用'
      "
      type="warning"
      :closable="false"
    >
      <el-button v-if="capability === 'error'" link @click="emit('retry-capability')"
        >重试检测</el-button
      >
    </el-alert>
    <template v-else>
      <div class="decision-toolbar">
        <span>{{ contextLabel }}</span>
        <el-button v-if="mode === 'list'" type="primary" @click="begin('create')"
          >记录决策</el-button
        >
        <el-button v-else link :disabled="saving" @click="backToList">返回决策列表</el-button>
      </div>
      <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon />
      <el-skeleton v-if="loading" :rows="5" animated />
      <template v-else-if="mode === 'list'">
        <el-select
          v-model="statusFilter"
          clearable
          placeholder="全部状态"
          aria-label="决策状态筛选"
          @change="changeStatus"
        >
          <el-option
            v-for="(label, key) in decisionStatuses"
            :key="key"
            :label="label"
            :value="key"
          />
        </el-select>
        <el-alert v-if="listError" :title="listError" type="warning" :closable="false"
          ><el-button link :loading="listLoading" @click="loadList">重试加载</el-button></el-alert
        >
        <el-skeleton v-if="listLoading && !list.length" :rows="4" animated />
        <el-empty
          v-else-if="!list.length && !listError"
          description="还没有决策记录，可先保存提案"
          :image-size="64"
        />
        <div class="decision-list" :aria-busy="listLoading">
          <button
            v-for="item in list"
            :key="item.id"
            type="button"
            class="decision-row"
            @click="openRecord(item.id)"
          >
            <span
              ><strong>{{ item.content.title }}</strong
              ><small
                >{{ item.subTaskTitle || item.stageTitle || '需求级决策' }} ·
                {{ item.createdAt.replace('T', ' ').slice(0, 16) }}</small
              ></span
            >
            <el-tag>{{ decisionStatuses[item.content.status] }}</el-tag>
          </button>
        </div>
        <el-pagination
          v-if="total > 20"
          :current-page="page + 1"
          :page-size="20"
          :total="total"
          layout="prev, pager, next"
          :disabled="listLoading"
          @current-change="changePage"
        />
      </template>
      <template v-else-if="editing">
        <el-alert
          v-if="mode === 'replace'"
          title="保存后将保留旧决策并标为已被替代，新决策继承原上下文。"
          type="info"
          :closable="false"
        />
        <DecisionForm
          v-model:draft="draft"
          :disabled="saving || conflict"
          :replacing="mode === 'replace'"
        />
        <div v-if="conflict" class="conflict-actions">
          <el-button :loading="comparing" @click="compareLatest">查看最新版本</el-button>
          <template v-if="latest">
            <DecisionSummary :record="latest" @open-record="openRecord" />
            <el-button @click="useLatest">采用最新内容，丢弃草稿</el-button>
            <el-button
              v-if="
                latest.content.status !== 'SUPERSEDED' &&
                (mode !== 'replace' || latest.content.status === 'ACCEPTED')
              "
              @click="keepDraft"
              >保留草稿，按最新版本继续编辑</el-button
            >
          </template>
        </div>
      </template>
      <template v-else-if="record">
        <DecisionSummary :record="record" @open-record="openRecord" />
        <el-button v-if="record.content.status !== 'SUPERSEDED'" @click="begin('edit')"
          >编辑决策</el-button
        >
        <el-button
          v-if="record.content.status === 'ACCEPTED'"
          type="primary"
          plain
          @click="begin('replace')"
          >记录替代决策</el-button
        >
      </template>
      <el-button v-else-if="requestedId" @click="load(requestedId)">重试加载决策</el-button>
    </template>
    <template #footer>
      <span v-if="dirty" class="unsaved-hint">有未保存修改</span>
      <el-button v-if="editing" :disabled="saving" @click="cancelEdit">取消编辑</el-button>
      <el-button
        v-if="editing"
        type="primary"
        :loading="saving"
        :disabled="conflict || capability !== 'available' || (mode === 'edit' && !dirty)"
        @click="saveDecision"
        >{{ mode === 'replace' ? '保存并替代旧决策' : '保存决策' }}</el-button
      >
      <el-button v-else :disabled="saving" @click="closeDrawer(() => (visible = false))"
        >关闭</el-button
      >
    </template>
  </el-drawer>
</template>
<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/store/user'
import { getDecisionsApi } from '../../api/decision'
import { useDecisionEditor } from '../../composables/useDecisionEditor'
import {
  decisionStatuses,
  type DecisionContext,
  type DecisionRecord,
  type DecisionStatus
} from '../../types/decision'
import DecisionForm from './DecisionForm.vue'
import DecisionSummary from './DecisionSummary.vue'
const props = defineProps<{ requirementId: number; capability: string }>()
const emit = defineEmits<{
  (event: 'retry-capability'): void
  (event: 'saved', record: DecisionRecord): void
}>()
const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const visible = ref(false)
const scope = ref<DecisionContext>({})
const list = ref<DecisionRecord[]>([])
const total = ref(0)
const page = ref(0)
const statusFilter = ref<DecisionStatus | ''>('')
const listLoading = ref(false)
const listError = ref('')
const requestedId = ref<number | null>(null)
let listRequest = 0
let internalNavigation = false
const editor = useDecisionEditor(
  () => props.requirementId,
  async next => {
    await setUrl(next.id).catch(() => undefined)
    void loadList()
    emit('saved', next)
  }
)
const {
  mode,
  record,
  draft,
  loading,
  saving,
  error,
  conflict,
  latest,
  comparing,
  editing,
  dirty,
  load,
  begin,
  compareLatest,
  keepDraft,
  useLatest
} = editor
const contextLabel = computed(() => {
  const context =
    mode.value === 'create' || mode.value === 'list' ? scope.value : record.value || scope.value
  return context.subTaskId || context.subTaskTitle
    ? `任务：${context.subTaskTitle || '#' + context.subTaskId}`
    : context.stageId || context.stageTitle
      ? `阶段：${context.stageTitle || '#' + context.stageId}`
      : '需求级决策'
})
async function loadList() {
  if (props.capability !== 'available') return
  const current = ++listRequest
  const requirement = props.requirementId
  listLoading.value = true
  listError.value = ''
  try {
    const response = await getDecisionsApi(requirement, {
      stageId: scope.value.stageId,
      subTaskId: scope.value.subTaskId,
      status: statusFilter.value || undefined,
      page: page.value,
      size: 20
    })
    if (current === listRequest && requirement === props.requirementId) {
      list.value = response.content
      total.value = response.totalElements
    }
  } catch {
    if (current === listRequest)
      listError.value = list.value.length
        ? '加载失败，仍显示上次成功的记录，内容可能已变化。'
        : '决策列表加载失败，请重试。'
  } finally {
    if (current === listRequest) listLoading.value = false
  }
}
async function setUrl(id?: number) {
  if (
    (id && route.query.decisionId === String(id)) ||
    (!id && route.query.decisionId === undefined)
  )
    return undefined
  const query = { ...route.query }
  if (id) query.decisionId = String(id)
  else delete query.decisionId
  internalNavigation = true
  try {
    return await router.replace({ query })
  } finally {
    internalNavigation = false
  }
}
async function allowDiscard() {
  if (!visible.value) return true
  if (saving.value) {
    ElMessage.warning('决策正在保存，请稍候')
    return false
  }
  if (!dirty.value) return true
  try {
    await ElMessageBox.confirm('决策有未保存修改，离开将丢弃这些修改。', '保留未保存内容', {
      confirmButtonText: '丢弃修改',
      cancelButtonText: '继续编辑',
      type: 'warning'
    })
    return true
  } catch {
    return false
  }
}
async function open(context: DecisionContext = {}, id?: number) {
  if (!(await allowDiscard())) return
  if (await setUrl(id)) return
  scope.value = { ...context }
  visible.value = true
  editor.reset()
  list.value = []
  page.value = 0
  statusFilter.value = ''
  total.value = 0
  requestedId.value = id || null
  void loadList()
  if (id) await load(id)
}
async function openRecord(id: number) {
  if (!(await allowDiscard())) return
  if (await setUrl(id)) return
  requestedId.value = id
  await load(id)
}
async function backToList() {
  if (!(await allowDiscard())) return
  if (await setUrl()) return
  editor.reset()
  requestedId.value = null
  await loadList()
}
async function cancelEdit() {
  if (!(await allowDiscard())) return
  if (record.value && mode.value !== 'create') editor.apply(record.value)
  else {
    editor.reset()
    void loadList()
  }
}
async function closeDrawer(done: () => void) {
  if (!(await allowDiscard())) return
  if (await setUrl()) return
  editor.reset()
  done()
}
async function saveDecision() {
  if (props.capability !== 'available') return
  if (await editor.save(scope.value)) ElMessage.success('决策已保存')
}
function changePage(current: number) {
  page.value = current - 1
  void loadList()
}
function changeStatus() {
  page.value = 0
  void loadList()
}
watch(
  () =>
    [props.requirementId, route.query.decisionId, props.capability, userStore.serverUrl] as const,
  (values, previous) => {
    if (previous && (values[0] !== previous[0] || values[3] !== previous[3])) {
      listRequest++
      editor.reset()
      visible.value = false
      list.value = []
      requestedId.value = null
      scope.value = {}
    }
    if (internalNavigation) return
    const id = Number(values[1])
    if (Number.isSafeInteger(id) && id > 0) {
      visible.value = true
      requestedId.value = id
      if (values[2] === 'available' && !dirty.value && !saving.value && record.value?.id !== id) {
        scope.value = {}
        void load(id)
        void loadList()
      }
    } else if (previous?.[1]) {
      visible.value = false
      editor.reset()
    }
  },
  { immediate: true }
)
onBeforeRouteLeave(allowDiscard)
onBeforeRouteUpdate(async (to, from) => {
  if (internalNavigation || to.fullPath === from.fullPath) return true
  const allowed = await allowDiscard()
  if (allowed && dirty.value) editor.reset()
  return allowed
})
const protectWindow = (event: BeforeUnloadEvent) => {
  if (visible.value && (dirty.value || saving.value)) {
    event.preventDefault()
    event.returnValue = ''
  }
}
window.addEventListener('beforeunload', protectWindow)
onBeforeUnmount(() => {
  listRequest++
  editor.reset()
  window.removeEventListener('beforeunload', protectWindow)
})
defineExpose({ open })
</script>
<style scoped>
.decision-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  font-size: 13px;
}
.decision-list {
  display: grid;
  gap: 8px;
  margin: 16px 0;
}
.decision-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  background: white;
  padding: 14px;
  text-align: left;
  cursor: pointer;
  font: inherit;
  overflow-wrap: anywhere;
}
.decision-row:hover {
  border-color: #409eff;
}
.decision-row small {
  display: block;
  color: #909399;
  font-size: 12px;
  margin-top: 6px;
}
.unsaved-hint {
  font-size: 12px;
  color: #b88230;
  margin-right: 12px;
}
.conflict-actions {
  margin: 16px 0;
  padding: 12px;
  background: #fafafa;
  border: 1px solid #e6a23c;
}
</style>
