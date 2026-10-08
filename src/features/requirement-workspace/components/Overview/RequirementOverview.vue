<template>
  <div class="overview-container">
    <div class="overview-content">
      <section class="summary-grid" aria-label="项目整体进度">
        <article class="overview-card progress-card">
          <div class="metric-heading">
            <span class="metric-label">工作项进度</span>
            <span v-if="taskTotal > 0" class="metric-value">{{ taskPercent }}%</span>
            <span v-else class="metric-value metric-empty">暂无工作项</span>
          </div>
          <el-progress
            :percentage="taskPercent"
            :show-text="false"
            :stroke-width="8"
            :status="taskPercent === 100 && taskTotal > 0 ? 'success' : ''"
          />
          <div class="metric-caption">
            <span>{{ taskDone }} / {{ taskTotal }} 项已完成</span>
            <span v-if="taskTotal > taskDone">剩余 {{ taskTotal - taskDone }} 项</span>
          </div>
        </article>

        <article class="overview-card deadline-card">
          <span class="metric-label">项目排期</span>
          <strong class="deadline-range">
            {{ requirement.startDate || '未设置开始日期' }}
            <span aria-hidden="true">—</span>
            {{ requirement.endDate || '未设置截止日期' }}
          </strong>
          <span class="metric-caption" :class="deadlineTone">{{ deadlineSummary }}</span>
        </article>

        <article class="overview-card risk-count-card" :class="{ 'has-risk': urgentRiskCount > 0 }">
          <span class="metric-label">需要关注</span>
          <strong class="risk-count">{{ risks.length }}</strong>
          <span class="metric-caption">
            {{ urgentRiskCount > 0 ? `${urgentRiskCount} 项逾期或受阻` : '暂无逾期或受阻事项' }}
          </span>
        </article>
      </section>

      <section class="overview-card goal-card">
        <div class="section-heading">
          <div>
            <h2 class="section-title">项目目标</h2>
            <p class="section-subtitle">保持目标清晰，便于团队判断当前工作是否仍在解决核心问题。</p>
          </div>
        </div>
        <p class="goal-description">
          {{ requirement.description || '暂未填写项目目标或背景，可在需求信息中补充。' }}
        </p>
      </section>

      <div class="control-grid">
        <section class="overview-card risk-card">
          <div class="section-heading">
            <div>
              <h2 class="section-title">风险与待关注</h2>
              <p class="section-subtitle">根据排期、任务状态和任务依赖自动识别。</p>
            </div>
            <el-button
              v-if="risks.length"
              link
              type="primary"
              @click="emit('switch-tab', 'execution')"
            >
              查看执行工作区
            </el-button>
          </div>

          <div v-if="overviewLoading" class="risk-loading">
            <el-skeleton :rows="3" animated />
          </div>
          <el-alert
            v-else-if="overviewError"
            :title="overviewError"
            type="warning"
            :closable="false"
            show-icon
          >
            <template #default>
              <el-button link type="primary" @click="emit('retry-overview')"
                >重新加载汇总数据</el-button
              >
            </template>
          </el-alert>
          <el-empty
            v-else-if="risks.length === 0"
            description="暂无需要处理的风险"
            :image-size="72"
          />
          <div v-else class="risk-list">
            <button
              v-for="risk in visibleRisks"
              :key="risk.key"
              type="button"
              class="risk-row"
              @click="emit('go-stage-execution', risk.stageId)"
            >
              <span class="risk-indicator" :class="`risk-${risk.level}`" aria-hidden="true"></span>
              <span class="risk-copy">
                <span class="risk-title">{{ risk.title }}</span>
                <span class="risk-detail">{{ risk.detail }}</span>
              </span>
              <el-tag size="small" :type="riskTagType(risk.level)">{{ risk.label }}</el-tag>
              <span class="risk-arrow" aria-hidden="true">→</span>
            </button>
            <el-button
              v-if="risks.length > visibleRiskLimit"
              class="show-more-risks"
              link
              type="primary"
              @click="showAllRisks = !showAllRisks"
            >
              {{ showAllRisks ? '收起' : `查看全部 ${risks.length} 项` }}
            </el-button>
          </div>
        </section>

        <section class="overview-card milestone-card">
          <div class="section-heading">
            <div>
              <h2 class="section-title">里程碑</h2>
              <p class="section-subtitle">按阶段排期跟踪关键节点。</p>
            </div>
            <el-button link type="primary" @click="emit('switch-tab', 'plan')">管理计划</el-button>
          </div>

          <el-empty v-if="stages.length === 0" description="尚未制定阶段计划" :image-size="72">
            <el-button type="primary" size="small" @click="emit('switch-tab', 'plan')">
              制定计划
            </el-button>
          </el-empty>
          <div v-else class="milestone-list">
            <button
              v-for="(stage, index) in sortedStages"
              :key="stage.id"
              type="button"
              class="milestone-row"
              @click="emit('go-stage-execution', stage.id)"
            >
              <span class="milestone-track">
                <span class="milestone-dot" :class="milestoneDotClass(stage)"></span>
                <span v-if="index < sortedStages.length - 1" class="milestone-line"></span>
              </span>
              <span class="milestone-copy">
                <span class="milestone-title">{{ stage.title }}</span>
                <span class="milestone-date">{{ formatStageDates(stage) }}</span>
              </span>
              <span class="milestone-status" :class="milestoneStatusClass(stage)">
                {{ milestoneStatus(stage) }}
              </span>
            </button>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Requirement, Stage, SubTask, TaskDependency, TaskStatus } from '@/types'

const props = defineProps<{
  requirement: Requirement
  stages: Stage[]
  tasksByStage: Record<number, SubTask[]>
  dependenciesByStage: Record<number, TaskDependency[]>
  overviewLoading: boolean
  overviewError: string
}>()

const emit = defineEmits<{
  (e: 'switch-tab', tab: string): void
  (e: 'go-stage-execution', stageId: number): void
  (e: 'retry-overview'): void
}>()

type RiskLevel = 'danger' | 'warning' | 'info'
interface RiskItem {
  key: string
  title: string
  detail: string
  label: string
  level: RiskLevel
  stageId: number
}

const visibleRiskLimit = 6
const showAllRisks = ref(false)
const today = new Date()
today.setHours(0, 0, 0, 0)
const dayMs = 24 * 60 * 60 * 1000

const parseDate = (value?: string | null) => {
  if (!value) return null
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!match) return null
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

const daysUntil = (value?: string | null) => {
  const date = parseDate(value)
  return date ? Math.round((date.getTime() - today.getTime()) / dayMs) : null
}

const flattenTasks = (tasks: SubTask[]): SubTask[] =>
  tasks.flatMap(task => [task, ...flattenTasks(task.children || [])])

const allTasks = computed(() =>
  props.stages.flatMap(stage => flattenTasks(props.tasksByStage[stage.id] || []))
)
const taskDone = computed(() => allTasks.value.filter(task => task.status === 'DONE').length)
const taskTotal = computed(() => allTasks.value.length)
const taskPercent = computed(() =>
  taskTotal.value ? Math.round((taskDone.value / taskTotal.value) * 100) : 0
)

const stageTasks = (stageId: number) => flattenTasks(props.tasksByStage[stageId] || [])
const risks = computed<RiskItem[]>(() => {
  const result: RiskItem[] = []
  const taskById = new Map(allTasks.value.map(task => [task.id, task]))

  for (const stage of props.stages) {
    const stageDueIn = daysUntil(stage.endDate)
    if (stage.status !== 'DONE' && stageDueIn !== null && stageDueIn < 0) {
      result.push({
        key: `stage-overdue-${stage.id}`,
        title: `阶段「${stage.title}」已逾期`,
        detail: `计划截止 ${stage.endDate}，当前仍为${statusText(stage.status)}`,
        label: '已逾期',
        level: 'danger',
        stageId: stage.id
      })
    } else if (stage.status !== 'DONE' && stageDueIn !== null && stageDueIn <= 7) {
      result.push({
        key: `stage-due-${stage.id}`,
        title: `阶段「${stage.title}」即将到期`,
        detail: `计划截止 ${stage.endDate}${stageDueIn === 0 ? '，今天到期' : `，剩余 ${stageDueIn} 天`}`,
        label: '临近到期',
        level: 'warning',
        stageId: stage.id
      })
    } else if (stage.status !== 'DONE' && !stage.endDate) {
      result.push({
        key: `stage-unscheduled-${stage.id}`,
        title: `阶段「${stage.title}」尚未排期`,
        detail: '补充阶段截止时间，才能及时识别进度偏差。',
        label: '未排期',
        level: 'info',
        stageId: stage.id
      })
    }

    for (const task of stageTasks(stage.id)) {
      const taskDueIn = daysUntil(task.endDate)
      if (task.status !== 'DONE' && taskDueIn !== null && taskDueIn < 0) {
        result.push({
          key: `task-overdue-${task.id}`,
          title: `工作项「${task.title}」已逾期`,
          detail: `${stage.title} · 计划截止 ${task.endDate}`,
          label: '已逾期',
          level: 'danger',
          stageId: stage.id
        })
      } else if (task.status !== 'DONE' && taskDueIn !== null && taskDueIn <= 3) {
        result.push({
          key: `task-due-${task.id}`,
          title: `工作项「${task.title}」即将到期`,
          detail: `${stage.title} · ${taskDueIn === 0 ? '今天到期' : `剩余 ${taskDueIn} 天`}`,
          label: '临近到期',
          level: 'warning',
          stageId: stage.id
        })
      }
    }

    for (const dependency of props.dependenciesByStage[stage.id] || []) {
      const predecessor = taskById.get(dependency.predecessorId)
      const successor = taskById.get(dependency.successorId)
      if (
        predecessor &&
        successor &&
        predecessor.status !== 'DONE' &&
        successor.status === 'IN_PROGRESS'
      ) {
        result.push({
          key: `dependency-${dependency.id}`,
          title: `工作项「${successor.title}」存在前置阻塞`,
          detail: `等待「${predecessor.title}」完成 · ${stage.title}`,
          label: '受阻',
          level: 'danger',
          stageId: stage.id
        })
      }
    }
  }

  const order: Record<RiskLevel, number> = { danger: 0, warning: 1, info: 2 }
  return result.sort((a, b) => order[a.level] - order[b.level])
})

const visibleRisks = computed(() =>
  showAllRisks.value ? risks.value : risks.value.slice(0, visibleRiskLimit)
)
const urgentRiskCount = computed(() => risks.value.filter(risk => risk.level === 'danger').length)

const sortedStages = computed(() =>
  [...props.stages].sort((a, b) => {
    const aDate = parseDate(a.endDate)?.getTime() ?? Number.MAX_SAFE_INTEGER
    const bDate = parseDate(b.endDate)?.getTime() ?? Number.MAX_SAFE_INTEGER
    return aDate - bDate
  })
)

const deadlineDays = computed(() => daysUntil(props.requirement.endDate))
const deadlineSummary = computed(() => {
  if (deadlineDays.value === null) return '请设置项目截止日期'
  if (deadlineDays.value < 0) return `已超过截止日期 ${Math.abs(deadlineDays.value)} 天`
  if (deadlineDays.value === 0) return '今天是项目截止日期'
  return `距离截止还有 ${deadlineDays.value} 天`
})
const deadlineTone = computed(() =>
  deadlineDays.value !== null && deadlineDays.value < 0 ? 'text-danger' : ''
)

function statusText(status: TaskStatus) {
  if (status === 'DONE') return '已完成'
  if (status === 'IN_PROGRESS') return '进行中'
  return '待处理'
}

const riskTagType = (level: RiskLevel) => {
  if (level === 'danger') return 'danger'
  if (level === 'warning') return 'warning'
  return 'info'
}

const milestoneStatus = (stage: Stage) => {
  const dueIn = daysUntil(stage.endDate)
  if (stage.status === 'DONE') return '已完成'
  if (dueIn !== null && dueIn < 0) return '已逾期'
  if (!stage.endDate) return '未排期'
  return statusText(stage.status)
}

const milestoneStatusClass = (stage: Stage) => {
  const status = milestoneStatus(stage)
  if (status === '已完成') return 'status-done'
  if (status === '已逾期') return 'status-overdue'
  if (status === '未排期') return 'status-unscheduled'
  return 'status-active'
}

const milestoneDotClass = (stage: Stage) =>
  stage.status === 'DONE'
    ? 'dot-done'
    : milestoneStatus(stage) === '已逾期'
      ? 'dot-overdue'
      : 'dot-active'

const formatStageDates = (stage: Stage) => {
  if (stage.startDate && stage.endDate) return `${stage.startDate} 至 ${stage.endDate}`
  if (stage.startDate) return `${stage.startDate} 起 · 未设截止日期`
  if (stage.endDate) return `未设开始日期 · 截止 ${stage.endDate}`
  return '尚未设置排期'
}
</script>

<style scoped>
.overview-container {
  flex: 1;
  width: 100%;
  min-width: 0;
  height: 100%;
  padding: 24px;
  overflow-y: auto;
  box-sizing: border-box;
  background: #f7f8fa;
}

.overview-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: min(1440px, 100%);
  margin: 0 auto;
}

.summary-grid {
  display: grid;
  grid-template-columns: minmax(240px, 1.2fr) minmax(280px, 1.3fr) minmax(180px, 0.8fr);
  gap: 14px;
}

.overview-card {
  min-width: 0;
  padding: 18px 20px;
  background: #fff;
  border: 1px solid #e9edf2;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(31, 45, 61, 0.025);
}

.metric-heading,
.section-heading,
.metric-caption {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.metric-heading {
  margin-bottom: 14px;
}

.metric-label {
  color: #667085;
  font-size: 13px;
  font-weight: 600;
}

.metric-value,
.risk-count {
  color: #263445;
  font-size: 24px;
  font-weight: 700;
  line-height: 1;
}

.metric-empty {
  color: #98a2b3;
  font-size: 15px;
}

.metric-caption {
  margin-top: 10px;
  color: #8a94a3;
  font-size: 12px;
}

.deadline-card,
.risk-count-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.deadline-range {
  margin-top: 12px;
  color: #344054;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.5;
  overflow-wrap: anywhere;
}

.deadline-range span {
  padding: 0 4px;
  color: #98a2b3;
}

.risk-count-card.has-risk .risk-count,
.text-danger {
  color: #d94841;
}

.goal-card {
  padding-top: 16px;
  padding-bottom: 16px;
}

.section-heading {
  align-items: flex-start;
}

.section-title {
  margin: 0;
  color: #263445;
  font-size: 15px;
  font-weight: 650;
}

.section-subtitle {
  margin: 5px 0 0;
  color: #98a2b3;
  font-size: 12px;
  line-height: 1.5;
}

.goal-description {
  margin: 12px 0 0;
  color: #475467;
  font-size: 13px;
  line-height: 1.7;
  white-space: pre-wrap;
}

.control-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr);
  align-items: start;
  gap: 16px;
}

.risk-card,
.milestone-card {
  min-height: 290px;
}

.risk-loading {
  padding: 22px 8px 0;
}

.risk-list,
.milestone-list {
  display: flex;
  flex-direction: column;
  margin-top: 16px;
}

.risk-row,
.milestone-row {
  width: 100%;
  min-width: 0;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: 0;
}

.risk-row {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 11px 8px;
  border-bottom: 1px solid #f0f2f5;
  border-radius: 6px;
  transition: background-color 0.15s ease;
}

.risk-row:hover,
.milestone-row:hover {
  background: #f7faff;
}

.risk-row:focus-visible,
.milestone-row:focus-visible {
  outline: 2px solid #409eff;
  outline-offset: -2px;
}

.risk-indicator {
  width: 8px;
  height: 8px;
  flex: 0 0 8px;
  border-radius: 50%;
}

.risk-danger {
  background: #e45656;
}

.risk-warning {
  background: #e6a23c;
}

.risk-info {
  background: #909399;
}

.risk-copy,
.milestone-copy {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  gap: 4px;
}

.risk-title,
.milestone-title {
  overflow: hidden;
  color: #344054;
  font-size: 13px;
  font-weight: 550;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.risk-detail,
.milestone-date {
  overflow: hidden;
  color: #98a2b3;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.risk-arrow {
  color: #98a2b3;
  font-size: 14px;
}

.show-more-risks {
  align-self: flex-start;
  margin: 10px 0 0 24px;
}

.milestone-row {
  position: relative;
  display: flex;
  align-items: stretch;
  gap: 12px;
  padding: 5px 8px;
  border-radius: 6px;
}

.milestone-track {
  position: relative;
  display: flex;
  width: 14px;
  flex: 0 0 14px;
  justify-content: center;
}

.milestone-dot {
  z-index: 1;
  width: 9px;
  height: 9px;
  margin-top: 5px;
  border: 2px solid #fff;
  border-radius: 50%;
  box-shadow: 0 0 0 1px currentColor;
}

.dot-done {
  color: #67c23a;
  background: #67c23a;
}

.dot-active {
  color: #409eff;
  background: #409eff;
}

.dot-overdue {
  color: #e45656;
  background: #e45656;
}

.milestone-line {
  position: absolute;
  top: 14px;
  bottom: -6px;
  width: 1px;
  background: #e4e7ed;
}

.milestone-status {
  flex: 0 0 auto;
  margin-top: 2px;
  font-size: 11px;
}

.status-done {
  color: #529b2e;
}

.status-overdue {
  color: #d94841;
}

.status-unscheduled {
  color: #909399;
}

.status-active {
  color: #409eff;
}

@media (max-width: 1050px) {
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .control-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 620px) {
  .overview-container {
    padding: 14px;
  }

  .summary-grid {
    grid-template-columns: minmax(0, 1fr);
    gap: 10px;
  }

  .overview-card {
    padding: 16px;
  }

  .section-heading {
    flex-wrap: wrap;
  }

  .risk-detail,
  .milestone-date {
    white-space: normal;
  }
}
</style>
