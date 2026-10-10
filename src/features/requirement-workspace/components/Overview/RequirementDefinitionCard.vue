<template>
  <section v-if="capability !== 'disabled'" class="definition-card" aria-label="问题定义">
    <div class="definition-heading">
      <div>
        <h2>问题定义</h2>
        <p>逐步澄清问题与成功标准，不影响快速创建和执行。</p>
      </div>
      <el-tag v-if="saved" :type="saved.state === 'CONFIRMED' && !dirty ? 'success' : 'info'">
        {{ dirty ? '有未保存修改' : stateLabels[saved.state] }}
      </el-tag>
    </div>

    <el-skeleton v-if="capability === 'checking' || loading" :rows="3" animated />
    <el-alert
      v-else-if="capability === 'unavailable'"
      title="当前后端尚不支持问题定义，请升级后端后重试。"
      type="info"
      :closable="false"
      show-icon
    >
      <el-button link @click="retryCapability">重新检查</el-button>
    </el-alert>
    <el-alert
      v-else-if="capability === 'error'"
      title="无法检查后端能力，请检查连接后重试。"
      type="warning"
      :closable="false"
      show-icon
    >
      <el-button link @click="retryCapability">重试</el-button>
    </el-alert>
    <template v-else>
      <el-alert v-if="error" :title="error" type="warning" :closable="false" show-icon>
        <el-button v-if="!saved" link @click="loadDefinition">重新加载</el-button>
      </el-alert>

      <div v-if="conflict" class="conflict-panel">
        <p>当前输入已保留。请读取最新版本，比较后选择如何继续。</p>
        <el-button :loading="comparing" :disabled="saving" @click="compareLatest"
          >查看最新版本</el-button
        >
        <template v-if="latest">
          <details open>
            <summary>最新保存的内容</summary>
            <pre>{{ latestContent }}</pre>
          </details>
          <el-button :disabled="saving" @click="useLatest">使用最新内容</el-button>
          <el-button :disabled="saving" @click="keepDraft"
            >保留当前草稿，按最新版本继续编辑</el-button
          >
          <p>保留草稿后，再次保存会以当前草稿替换最新内容。</p>
        </template>
      </div>

      <template v-if="saved && !editing">
        <div class="definition-summary">
          <div>
            <h3>要解决的问题</h3>
            <p>{{ saved.definition.problemStatement || '尚未填写' }}</p>
          </div>
          <div>
            <h3>期望结果</h3>
            <p>{{ saved.definition.targetOutcome || '尚未填写' }}</p>
          </div>
        </div>
        <h3>成功标准</h3>
        <ol v-if="saved.definition.successCriteria.length" class="criteria-summary">
          <li v-for="criterion in saved.definition.successCriteria" :key="criterion.id">
            {{ criterion.description }}
            <small v-if="criterion.suggestedMethod"
              >验证方式：{{ criterion.suggestedMethod }}</small
            >
            <small v-if="criterion.targetValue">目标值：{{ criterion.targetValue }}</small>
          </li>
        </ol>
        <p v-else class="muted">尚未定义成功标准</p>
        <details v-if="hasAdditionalContext" class="additional-context">
          <summary>约束、假设与非目标</summary>
          <div v-for="group in groups" :key="group.key">
            <h3>{{ group.label }}</h3>
            <ul>
              <li v-for="(line, index) in saved.definition[group.key]" :key="index">{{ line }}</li>
            </ul>
          </div>
        </details>
        <div class="definition-actions">
          <el-button type="primary" :disabled="saving" @click="editing = true"
            >完善问题定义</el-button
          >
          <el-button
            v-if="saved.state !== 'CONFIRMED'"
            :disabled="!definitionIsComplete(saved.definition) || conflict"
            :loading="saving"
            @click="confirmSaved"
            >确认定义</el-button
          >
          <span v-if="saved.confirmedAt" class="muted"
            >已确认于 {{ formatTime(saved.confirmedAt) }}</span
          >
        </div>
      </template>

      <el-form v-if="saved && editing" label-position="top" :disabled="saving">
        <el-form-item label="要解决的问题">
          <el-input
            v-model="draft.problemStatement"
            type="textarea"
            :rows="3"
            maxlength="10000"
            placeholder="当前遇到什么问题，为什么需要解决？"
          />
        </el-form-item>
        <el-form-item label="期望结果">
          <el-input
            v-model="draft.targetOutcome"
            type="textarea"
            :rows="3"
            maxlength="10000"
            placeholder="完成后，希望发生什么变化？"
          />
        </el-form-item>
        <div class="definition-summary">
          <el-form-item
            v-for="group in groups"
            :key="group.key"
            :label="`${group.label}（每行一条）`"
          >
            <el-input
              :model-value="draft[group.key].join('\n')"
              type="textarea"
              :rows="3"
              @update:model-value="(value: string) => setLines(group.key, value)"
            />
          </el-form-item>
        </div>
        <h3>
          成功标准 <span class="muted">{{ draft.successCriteria.length }} / 50</span>
        </h3>
        <div
          v-for="(criterion, index) in draft.successCriteria"
          :key="criterion.id"
          class="criterion-editor"
        >
          <el-form-item :label="`标准 ${index + 1}`">
            <el-input
              v-model="criterion.description"
              type="textarea"
              :rows="2"
              maxlength="1000"
              placeholder="什么结果能证明目标达到？"
            />
          </el-form-item>
          <div class="definition-summary">
            <el-form-item label="建议验证方式（选填）"
              ><el-input v-model="criterion.suggestedMethod" maxlength="1000"
            /></el-form-item>
            <el-form-item label="目标值（选填）"
              ><el-input v-model="criterion.targetValue" maxlength="1000"
            /></el-form-item>
          </div>
          <el-button link type="danger" @click="draft.successCriteria.splice(index, 1)"
            >删除此标准</el-button
          >
        </div>
        <el-button :disabled="draft.successCriteria.length >= 50" @click="addCriterion"
          >添加成功标准</el-button
        >
        <p v-if="saved.state === 'CONFIRMED' && dirty" class="muted">
          保存修改后，定义需要重新确认。
        </p>
        <div class="definition-actions">
          <el-button @click="cancelEditing">取消编辑</el-button>
          <el-button
            type="primary"
            :disabled="!dirty || conflict"
            :loading="saving"
            @click="saveDraft"
            >保存定义</el-button
          >
          <el-button
            :disabled="
              dirty || !definitionIsComplete(draft) || conflict || saved.state === 'CONFIRMED'
            "
            :loading="saving"
            @click="confirmSaved"
            >确认已保存的定义</el-button
          >
        </div>
      </el-form>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getDefinitionApi,
  saveDefinitionApi,
  confirmDefinitionApi
} from '@/features/requirement/api/definition'
import { useDefinitionCapability } from '@/features/requirement/composables/useDefinitionCapability'
import {
  emptyDefinition,
  normalizeDefinition,
  definitionError,
  definitionIsComplete,
  type DefinitionResponse,
  type RequirementDefinition
} from '@/features/requirement/types/definition'

const props = defineProps<{ requirementId: number }>()
const route = useRoute()
const { capability, retryCapability } = useDefinitionCapability()
const saved = ref<DefinitionResponse | null>(null)
const draft = ref<RequirementDefinition>(emptyDefinition())
const latest = ref<DefinitionResponse | null>(null)
const loading = ref(false)
const saving = ref(false)
const comparing = ref(false)
const editing = ref(false)
const conflict = ref(false)
const error = ref('')
let requestId = 0
const stateLabels = { NOT_STARTED: '未开始', IN_PROGRESS: '待完善或确认', CONFIRMED: '已确认' }
const groups = [
  { key: 'constraints' as const, label: '约束条件' },
  { key: 'assumptions' as const, label: '假设与待确认事项' },
  { key: 'outOfScope' as const, label: '本次不做的内容' }
]
const clone = (value: RequirementDefinition): RequirementDefinition =>
  JSON.parse(JSON.stringify(value))
const dirty = computed(
  () =>
    saved.value !== null &&
    JSON.stringify(normalizeDefinition(draft.value)) !== JSON.stringify(saved.value.definition)
)
const hasAdditionalContext = computed(
  () => saved.value && groups.some(group => saved.value!.definition[group.key].length)
)
const latestContent = computed(() => {
  if (!latest.value) return ''
  const value = latest.value.definition
  return [
    `要解决的问题：\n${value.problemStatement || '尚未填写'}`,
    `期望结果：\n${value.targetOutcome || '尚未填写'}`,
    ...groups.map(group => `${group.label}：\n${value[group.key].join('\n') || '尚未填写'}`),
    `成功标准：\n${value.successCriteria.map((item, index) => `${index + 1}. ${item.description}\n验证方式：${item.suggestedMethod || '未填写'}\n目标值：${item.targetValue || '未填写'}`).join('\n\n') || '尚未填写'}`
  ].join('\n\n')
})
const formatTime = (value: string) => new Date(value).toLocaleString('zh-CN')

function apply(response: DefinitionResponse) {
  saved.value = response
  draft.value = clone(response.definition)
  latest.value = null
  conflict.value = false
  error.value = ''
}

async function loadDefinition() {
  const currentRequest = ++requestId
  const id = props.requirementId
  loading.value = true
  error.value = ''
  try {
    const response = await getDefinitionApi(id)
    if (requestId === currentRequest) {
      apply(response)
      editing.value = route.query.define === '1'
    }
  } catch {
    if (requestId === currentRequest) error.value = '问题定义加载失败，请重试。'
  } finally {
    if (requestId === currentRequest) loading.value = false
  }
}

watch(
  [() => props.requirementId, capability],
  ([, status]) => {
    requestId++
    saved.value = null
    draft.value = emptyDefinition()
    latest.value = null
    error.value = ''
    conflict.value = false
    editing.value = false
    loading.value = false
    if (status === 'available') void loadDefinition()
  },
  { immediate: true }
)

function setLines(key: 'constraints' | 'assumptions' | 'outOfScope', value: string) {
  draft.value[key] = value.split('\n')
}
function addCriterion() {
  draft.value.successCriteria.push({
    id: crypto.randomUUID(),
    description: '',
    suggestedMethod: '',
    targetValue: ''
  })
}
function showFailure(reason: unknown, fallback: string) {
  const response = (reason as { response?: { status?: number; data?: { message?: string } } })
    .response
  conflict.value = response?.status === 409
  error.value = response?.data?.message || fallback
}

async function saveDraft() {
  if (!saved.value || saving.value || conflict.value) return
  const validationError = definitionError(draft.value)
  if (validationError) {
    error.value = validationError
    return
  }
  saving.value = true
  error.value = ''
  const content = normalizeDefinition(draft.value)
  // Changing the meaning of a criterion creates a new identity; reordering does not.
  content.successCriteria = content.successCriteria.map(criterion => {
    const previous = saved.value!.definition.successCriteria.find(item => item.id === criterion.id)
    return previous &&
      (previous.description !== criterion.description ||
        previous.suggestedMethod !== criterion.suggestedMethod ||
        previous.targetValue !== criterion.targetValue)
      ? { ...criterion, id: crypto.randomUUID() }
      : criterion
  })
  try {
    apply(await saveDefinitionApi(props.requirementId, saved.value.version, content))
    ElMessage.success('问题定义已保存')
  } catch (reason) {
    showFailure(reason, '保存失败，输入已保留，请重试。')
  } finally {
    saving.value = false
  }
}

async function confirmSaved() {
  if (!saved.value || saving.value || dirty.value || conflict.value) return
  saving.value = true
  error.value = ''
  try {
    apply(await confirmDefinitionApi(props.requirementId, saved.value.version))
    ElMessage.success('问题定义已确认')
  } catch (reason) {
    showFailure(reason, '确认失败，请重试。')
  } finally {
    saving.value = false
  }
}

async function compareLatest() {
  if (comparing.value) return
  comparing.value = true
  try {
    latest.value = await getDefinitionApi(props.requirementId)
  } catch {
    error.value = '最新版本加载失败，当前草稿仍保留。'
  } finally {
    comparing.value = false
  }
}

async function allowDiscard() {
  if (saving.value || comparing.value) {
    ElMessage.info('正在保存或读取，请稍后再离开')
    return false
  }
  if (!dirty.value) return true
  try {
    await ElMessageBox.confirm('当前问题定义有未保存修改，离开将丢弃这些修改。', '保留未保存内容', {
      confirmButtonText: '丢弃修改',
      cancelButtonText: '继续编辑',
      type: 'warning'
    })
    return true
  } catch {
    return false
  }
}
async function cancelEditing() {
  if (await allowDiscard()) {
    draft.value = clone(saved.value!.definition)
    editing.value = false
  }
}
async function useLatest() {
  if (latest.value && (await allowDiscard())) apply(latest.value)
}
function keepDraft() {
  if (!latest.value) return
  saved.value = latest.value
  latest.value = null
  conflict.value = false
  error.value = ''
  editing.value = true
}
onBeforeRouteLeave(allowDiscard)
onBeforeRouteUpdate((to, from) => (to.params.id !== from.params.id ? allowDiscard() : true))
const protectWindow = (event: BeforeUnloadEvent) => {
  if (dirty.value || saving.value) {
    event.preventDefault()
    event.returnValue = ''
  }
}
window.addEventListener('beforeunload', protectWindow)
onBeforeUnmount(() => {
  requestId++
  window.removeEventListener('beforeunload', protectWindow)
})
</script>

<style scoped>
.definition-card {
  padding: 20px;
  background: #fff;
  border: 1px solid #e9edf2;
  border-radius: 10px;
  color: #344054;
}
.definition-heading {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}
h2 {
  margin: 0;
  font-size: 15px;
}
h3 {
  margin: 12px 0 8px;
  font-size: 13px;
}
.definition-heading p,
.muted,
small {
  color: #667085;
  font-size: 12px;
}
.definition-heading p {
  margin: 6px 0 0;
}
.definition-summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
.definition-summary p,
li {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font-size: 13px;
  line-height: 1.7;
}
.definition-summary p {
  margin: 0;
}
.criteria-summary {
  padding-left: 22px;
}
small {
  display: block;
}
.additional-context {
  margin-top: 12px;
}
summary {
  cursor: pointer;
  font-size: 13px;
}
.criterion-editor {
  padding: 14px;
  margin-bottom: 12px;
  border: 1px solid #e9edf2;
  border-radius: 6px;
}
.definition-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 16px;
}
.definition-actions .el-button {
  margin-left: 0;
}
.conflict-panel {
  padding: 14px;
  margin: 12px 0;
  border: 1px solid #e6a23c;
  border-radius: 6px;
}
.conflict-panel p {
  font-size: 13px;
}
pre {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  max-height: 280px;
  overflow-y: auto;
}
@media (max-width: 800px) {
  .definition-summary {
    grid-template-columns: 1fr;
  }
}
</style>
