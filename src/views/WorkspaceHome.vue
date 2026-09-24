<!-- src/views/WorkspaceHome.vue -->
<template>
  <div class="page">
    <!-- 统一顶栏 -->
    <div class="page-head">
      <div>
        <div class="eyebrow">WORKSPACE</div>
        <h1>工作台</h1>
        <p>从今天的工作开始，快速回到正在推进的需求。</p>
      </div>
      <el-button type="primary" size="small" @click="goNew">+ 新建需求</el-button>
    </div>

    <!-- 顶栏指标卡片 -->
    <section class="summary-grid">
      <div class="metric">
        <span>进行中</span>
        <strong>{{ metrics.active }}</strong>
        <small>业务需求</small>
      </div>
      <div class="metric">
        <span>我的工作</span>
        <strong>{{ todoCount }}</strong>
        <small>待处理 / 进行中</small>
      </div>
      <div class="metric warn">
        <span>临近截止</span>
        <strong>{{ dueSoon }}</strong>
        <small>未来 3 天</small>
      </div>
      <div class="metric success">
        <span>完成率</span>
        <strong>{{ metrics.rate }}%</strong>
        <small>实际交付比</small>
      </div>
    </section>

    <!-- 双栏工作流 -->
    <div class="grid-two">
      <section class="surface column-surface">
        <div class="section-head">
          <div>
            <h2>正在推进</h2>
            <span>最需要关注的需求</span>
          </div>
          <el-button text size="small" @click="router.push('/requirements')">查看全部</el-button>
        </div>

        <div v-if="displayRequirements.length" class="card-scroll-body">
          <button v-for="r in displayRequirements" :key="r.id" class="req-row" @click="open(r)">
            <div class="req-main">
              <strong>{{ r.title }}</strong>
              <span>{{ r.description || '暂无描述' }}</span>
            </div>
            <div class="req-mid">
              <StatusChip :status="r.status" />
              <StatusChip :status="r.priority" />
            </div>
            <div class="req-progress">
              <div class="progress">
                <i :style="{ width: (r.__percent || 0) + '%' }"></i>
              </div>
              <span>{{ r.__percent || 0 }}%</span>
            </div>
          </button>
        </div>
        <div v-else class="empty-holder">
          <el-empty description="暂无推进中的需求" />
        </div>
      </section>

      <section class="surface column-surface">
        <div class="section-head">
          <div>
            <h2>我的下一步</h2>
            <span>优先处理这些事项</span>
          </div>
          <el-button text size="small" @click="router.push('/my-work')">进入我的待办</el-button>
        </div>
        <div v-if="todos.length" class="card-scroll-body">
          <div v-for="item in todos.slice(0, 7)" :key="item.id" class="next-row">
            <button class="check" @click="toggle(item)">
              <span v-if="item.status === 'DONE'">✓</span>
            </button>
            <div class="next-title">
              <strong :class="{ done: item.status === 'DONE' }">{{ item.title }}</strong>
              <span>{{
                item.requirementTitle
                  ? `${item.requirementTitle} · ${item.stageTitle || '阶段'}`
                  : '个人事项'
              }}</span>
            </div>
            <StatusChip :status="item.status" />
          </div>
        </div>
        <div v-else class="empty-holder">
          <el-empty description="暂无工作项" />
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getRequirementsListApi } from '@/api/requirement'
import { getStagesApi } from '@/api/stage'
import { getMyTodosApi, toggleTodoApi } from '@/api/todo'
import StatusChip from '@/components/workspace/StatusChip.vue'

const router = useRouter()
const requirements = ref([])
const todos = ref([])

const displayRequirements = computed(() => {
  return requirements.value.slice(0, 6)
})

const metrics = computed(() => {
  const active = requirements.value.filter(r => r.status === 'IN_PROGRESS').length
  const done = requirements.value.filter(r => r.status === 'DONE').length
  return {
    active,
    rate: requirements.value.length ? Math.round((done / requirements.value.length) * 100) : 0
  }
})

const todoCount = computed(() => todos.value.filter(t => t.status !== 'DONE').length)

const dueSoon = computed(() => {
  const d = new Date()
  d.setDate(d.getDate() + 3)
  const max = d.toISOString().slice(0, 10)
  const now = new Date().toISOString().slice(0, 10)
  return todos.value.filter(
    t => t.status !== 'DONE' && t.dueDate && t.dueDate >= now && t.dueDate <= max
  ).length
})

const open = r => router.push(`/requirement/${r.id}`)
const goNew = () => router.push('/requirements')

const toggle = async item => {
  item.status = item.status === 'DONE' ? 'IN_PROGRESS' : 'DONE'
  try {
    await toggleTodoApi(item.id, item.isProjectTask)
  } catch {
    await load()
  }
}

const load = async () => {
  try {
    const rr = await getRequirementsListApi({ page: 0, size: 50 })
    const list = rr?.content || rr || []
    requirements.value = list

    const batchSize = 6
    for (let i = 0; i < list.length; i += batchSize) {
      const batch = list.slice(i, i + batchSize)
      await Promise.all(
        batch.map(async r => {
          try {
            const stages = await getStagesApi(r.id)
            r.__percent = stages?.length
              ? Math.round((stages.filter(s => s.status === 'DONE').length / stages.length) * 100)
              : 0
          } catch {
            r.__percent = 0
          }
        })
      )
    }

    todos.value = (await getMyTodosApi()) || []
  } catch {
    requirements.value = []
    todos.value = []
  }
}

onMounted(load)
</script>

<style scoped>
.page {
  height: 100%;
  padding: 20px 28px 24px;
  max-width: 1560px;
  margin: 0 auto;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.page-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
  min-height: 52px;
  flex-shrink: 0;
}

.eyebrow {
  font-size: 10px;
  letter-spacing: 1.2px;
  font-weight: 800;
  color: var(--rf-text-3);
  margin-bottom: 6px;
}

.page-head h1 {
  margin: 0;
  font-size: 26px;
  letter-spacing: -0.5px;
}

.page-head p {
  margin: 5px 0 0;
  color: var(--rf-text-2);
  font-size: 13px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 14px;
  height: 86px;
  flex-shrink: 0;
}

.metric {
  background: #fff;
  border: 1px solid var(--rf-border);
  border-radius: 10px;
  padding: 14px 16px;
}

.metric span {
  display: block;
  color: var(--rf-text-2);
  font-size: 11px;
}

.metric strong {
  display: inline-block;
  font-size: 24px;
  margin-top: 4px;
}

.metric small {
  color: var(--rf-text-3);
  font-size: 11px;
  margin-left: 5px;
}

.metric.warn strong {
  color: var(--rf-warning);
}

.metric.success strong {
  color: var(--rf-success);
}

.grid-two {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 1.25fr 0.9fr;
  gap: 14px;
}

.surface {
  background: #fff;
  border: 1px solid var(--rf-border);
  border-radius: 12px;
}

.column-surface {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.section-head {
  padding: 14px 18px;
  border-bottom: 1px solid var(--rf-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.section-head h2 {
  font-size: 14px;
  margin: 0;
}

.section-head span {
  display: block;
  margin-top: 3px;
  font-size: 11px;
  color: var(--rf-text-3);
}

.card-scroll-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.empty-holder {
  flex: 1;
  display: grid;
  place-items: center;
}

.req-row {
  width: 100%;
  border: 0;
  border-bottom: 1px solid #f0f1f3;
  background: #fff;
  display: grid;
  grid-template-columns: 1.2fr auto 160px;
  gap: 16px;
  align-items: center;
  text-align: left;
  padding: 12px 18px;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.req-row:last-child {
  border-bottom: 0;
}

.req-row:hover {
  background: #fafbff;
}

.req-main strong {
  font-size: 13px;
}

.req-main span {
  display: block;
  font-size: 11px;
  color: var(--rf-text-3);
  margin-top: 3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.req-mid {
  display: flex;
  gap: 6px;
}

.req-progress {
  display: flex;
  align-items: center;
  gap: 8px;
}

.req-progress span {
  font-size: 11px;
  color: var(--rf-text-2);
  width: 32px;
  text-align: right;
}

.progress {
  height: 5px;
  background: #edf0f2;
  border-radius: 99px;
  overflow: hidden;
  flex: 1;
}

.progress i {
  display: block;
  height: 100%;
  background: var(--rf-brand);
}

.next-row {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  padding: 11px 18px;
  border-bottom: 1px solid #f0f1f3;
}

.check {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1px solid #cfd4da;
  background: #fff;
  color: #fff;
  display: grid;
  place-items: center;
  cursor: pointer;
}

.next-row .check:has(span) {
  background: var(--rf-success);
  border-color: var(--rf-success);
}

.next-title strong {
  display: block;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.next-title span {
  display: block;
  font-size: 11px;
  color: var(--rf-text-3);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.done {
  text-decoration: line-through;
  color: var(--rf-text-3);
}
</style>
