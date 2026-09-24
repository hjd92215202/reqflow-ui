<!-- src/views/TodoList.vue -->
<template>
  <div class="page">
    <!-- 统一顶栏 -->
    <div class="page-head">
      <div>
        <div class="eyebrow">MY WORK</div>
        <h1>我的待办</h1>
        <p>把所有与你有关的个人备忘与需求任务放在同一个工作视图里。</p>
      </div>
      <div class="head-actions">
        <el-button size="small" @click="quickFocus">聚焦今天</el-button>
      </div>
    </div>

    <!-- 核心布局：锁定 600px 统一视觉高度 -->
    <section class="work-grid">
      <!-- 左侧主工作台 (固定 600px) -->
      <div class="surface work-main">
        <!-- 快速加入 -->
        <div class="quick">
          <div class="quick-title">快速加入待办</div>
          <div class="quick-row">
            <el-input
              v-model="title"
              size="small"
              placeholder="记录一个待办事项，按 Enter 添加..."
              @keyup.enter="create"
            >
              <template #prefix>＋</template>
            </el-input>
            <el-select v-model="priority" size="small" style="width: 100px">
              <el-option label="P1 (高)" value="HIGH" />
              <el-option label="P2 (中)" value="MEDIUM" />
              <el-option label="P3 (低)" value="LOW" />
            </el-select>
            <el-date-picker
              v-model="due"
              size="small"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="截止日期"
              style="width: 130px"
            />
            <el-button type="primary" size="small" @click="create">添加</el-button>
          </div>
        </div>

        <!-- 视图切换 Tab -->
        <div class="view-tabs">
          <button
            v-for="f in filters"
            :key="f.value"
            :class="{ active: filter === f.value }"
            @click="filter = f.value"
          >
            {{ f.label }} <span>{{ filterCount(f.value) }}</span>
          </button>
        </div>

        <!-- 待办事项列表区 -->
        <div v-loading="loading" class="task-list">
          <div
            v-for="item in paginatedTodos"
            :key="`${item.isProjectTask ? 'p' : 'm'}-${item.id}`"
            class="task-row"
            @click="edit(item)"
          >
            <button
              class="checkbox"
              :class="{ done: item.status === 'DONE' }"
              title="切换完成状态"
              @click.stop="toggle(item)"
            >
              {{ item.status === 'DONE' ? '✓' : '' }}
            </button>

            <div class="task-main">
              <div class="task-title-line">
                <strong :class="{ doneText: item.status === 'DONE' }">{{ item.title }}</strong>
                <el-tooltip
                  v-if="item.description"
                  :content="item.description"
                  placement="top"
                  :show-after="200"
                >
                  <span class="desc-badge" @click.stop="edit(item)">📝 备注</span>
                </el-tooltip>
              </div>

              <div class="task-sub-info">
                <span class="source-tag">
                  {{
                    item.isProjectTask
                      ? `${item.requirementTitle || '需求'} · ${item.stageTitle || '阶段'}`
                      : '个人事项'
                  }}
                </span>
                <span v-if="item.description" class="desc-preview-text">
                  - {{ item.description }}
                </span>
              </div>
            </div>

            <StatusChip :status="item.priority" />

            <span :class="['due', { overdue: overdue(item) }]">
              {{ item.dueDate || '—' }}
            </span>

            <el-button text type="danger" size="small" @click.stop="remove(item)"> 删除 </el-button>
          </div>

          <div v-if="!filtered.length && !loading" class="empty-wrap">
            <el-empty description="没有符合条件的工作项" />
          </div>
        </div>

        <!-- 底部分页控制器 (固定吸底 48px) -->
        <div class="task-pagination-wrapper">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[10, 15, 20]"
            layout="total, sizes, prev, pager, next"
            :total="filtered.length"
            size="small"
            @size-change="currentPage = 1"
          />
        </div>
      </div>

      <!-- 右侧指标看板 (固定 600px) -->
      <aside class="side">
        <div class="surface score">
          <div class="section-title">完成进度</div>
          <div class="score-big">{{ completion }}<small>%</small></div>
          <div class="bar"><i :style="{ width: completion + '%' }"></i></div>
          <div class="mini-stats">
            <div>
              <b>{{ active }}</b>
              <span>进行中</span>
            </div>
            <div>
              <b>{{ pending }}</b>
              <span>待处理</span>
            </div>
            <div>
              <b>{{ completed }}</b>
              <span>已完成</span>
            </div>
          </div>
        </div>

        <div class="surface attention-card">
          <div class="section-title">需要关注</div>
          <div class="attention">
            <div>
              <strong class="text-danger">{{ overdueCount }}</strong>
              <span>已逾期</span>
            </div>
            <div>
              <strong class="text-warning">{{ dueSoon }}</strong>
              <span>3天内到期</span>
            </div>
          </div>
        </div>
      </aside>
    </section>

    <!-- 编辑弹窗 -->
    <el-dialog v-model="dialogVisible" title="工作项详情与备注" width="500px" destroy-on-close>
      <el-form :model="editForm" label-position="top">
        <div v-if="editForm.isProjectTask" class="project-ctx-banner">
          <div>
            <span class="ctx-title">📌 需求任务关联</span>
            <p>{{ editForm.requirementTitle || '需求' }} ➔ {{ editForm.stageTitle || '阶段' }}</p>
          </div>
          <el-button link type="primary" size="small" @click="jumpToRequirement(editForm)">
            进入该需求矩阵 ➔
          </el-button>
        </div>

        <el-form-item label="待办标题" required>
          <el-input v-model="editForm.title" placeholder="待办事项名称" />
        </el-form-item>

        <div class="form-row-two">
          <el-form-item label="状态">
            <el-select v-model="editForm.status" style="width: 100%">
              <el-option label="待处理" value="TODO" />
              <el-option label="进行中" value="IN_PROGRESS" />
              <el-option label="已完成" value="DONE" />
            </el-select>
          </el-form-item>

          <el-form-item label="优先级">
            <el-select v-model="editForm.priority" style="width: 100%">
              <el-option label="P1 (高)" value="HIGH" />
              <el-option label="P2 (中)" value="MEDIUM" />
              <el-option label="P3 (低)" value="LOW" />
            </el-select>
          </el-form-item>
        </div>

        <el-form-item label="截止日期">
          <el-date-picker
            v-model="editForm.dueDate"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="设置截止日期"
            style="width: 100%"
          />
        </el-form-item>

        <el-form-item label="📝 详细备注 / 说明">
          <el-input
            v-model="editForm.description"
            type="textarea"
            :rows="4"
            placeholder="在此记录该待办的具体说明、备忘要求、链接或相关进展..."
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveEdit">保存修改</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getMyTodosApi,
  createTodoApi,
  updateTodoApi,
  toggleTodoApi,
  deleteTodoApi
} from '@/api/todo'
import StatusChip from '@/components/workspace/StatusChip.vue'

const router = useRouter()
const loading = ref(false)
const todos = ref([])
const title = ref('')
const priority = ref('MEDIUM')
const due = ref(null)
const filter = ref('ACTIVE')

const currentPage = ref(1)
const pageSize = ref(10)

const dialogVisible = ref(false)
const editForm = ref({})

const filters = [
  { value: 'ALL', label: '全部' },
  { value: 'TODAY', label: '今天' },
  { value: 'ACTIVE', label: '进行中' },
  { value: 'PENDING', label: '待处理' },
  { value: 'DONE', label: '已完成' },
  { value: 'OVERDUE', label: '逾期' }
]

const today = () => new Date().toISOString().slice(0, 10)
const overdue = x => Boolean(x.dueDate && x.status !== 'DONE' && x.dueDate < today())

const filtered = computed(() => {
  return todos.value.filter(x => {
    if (filter.value === 'ALL') return true
    if (filter.value === 'ACTIVE') return x.status === 'IN_PROGRESS'
    if (filter.value === 'PENDING') return x.status === 'TODO'
    if (filter.value === 'DONE') return x.status === 'DONE'
    if (filter.value === 'OVERDUE') return overdue(x)
    if (filter.value === 'TODAY') return x.status !== 'DONE' && x.dueDate === today()
    return true
  })
})

const paginatedTodos = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filtered.value.slice(start, start + pageSize.value)
})

const active = computed(() => todos.value.filter(x => x.status === 'IN_PROGRESS').length)
const pending = computed(() => todos.value.filter(x => x.status === 'TODO').length)
const completed = computed(() => todos.value.filter(x => x.status === 'DONE').length)
const completion = computed(() => {
  return todos.value.length ? Math.round((completed.value / todos.value.length) * 100) : 0
})

const overdueCount = computed(() => todos.value.filter(overdue).length)
const dueSoon = computed(() => {
  const d = new Date()
  d.setDate(d.getDate() + 3)
  const max = d.toISOString().slice(0, 10)
  return todos.value.filter(
    x => x.status !== 'DONE' && x.dueDate && x.dueDate >= today() && x.dueDate <= max
  ).length
})

const filterCount = v => {
  if (v === 'ALL') return todos.value.length
  if (v === 'TODAY')
    return todos.value.filter(x => x.status !== 'DONE' && x.dueDate === today()).length
  if (v === 'ACTIVE') return active.value
  if (v === 'PENDING') return pending.value
  if (v === 'DONE') return completed.value
  if (v === 'OVERDUE') return overdueCount.value
  return 0
}

const quickFocus = () => {
  filter.value = 'TODAY'
}

const load = async () => {
  loading.value = true
  try {
    todos.value = (await getMyTodosApi()) || []
  } catch {
    todos.value = []
  } finally {
    loading.value = false
  }
}

const create = async () => {
  if (!title.value.trim()) return ElMessage.warning('请输入待办名称')
  try {
    await createTodoApi({
      title: title.value.trim(),
      priority: priority.value,
      dueDate: due.value,
      status: 'IN_PROGRESS'
    })
    title.value = ''
    due.value = null
    ElMessage.success('待办已创建')
    await load()
  } catch {}
}

const toggle = async item => {
  const targetStatus = item.status === 'DONE' ? 'IN_PROGRESS' : 'DONE'
  item.status = targetStatus
  try {
    await toggleTodoApi(item.id, item.isProjectTask)
  } catch {
    await load()
  }
}

const remove = async item => {
  ElMessageBox.confirm(`确定要删除待办「${item.title}」吗？`, '删除待办', { type: 'warning' })
    .then(async () => {
      await deleteTodoApi(item.id, item.isProjectTask)
      ElMessage.success('已删除')
      await load()
    })
    .catch(() => {})
}

const edit = item => {
  editForm.value = {
    ...item,
    description: item.description || ''
  }
  dialogVisible.value = true
}

const saveEdit = async () => {
  if (!editForm.value.title?.trim()) {
    return ElMessage.warning('待办名称不可为空')
  }
  try {
    await updateTodoApi(editForm.value.id, editForm.value)
    ElMessage.success('待办已保存')
    dialogVisible.value = false
    await load()
  } catch {}
}

const jumpToRequirement = item => {
  if (item.requirementId) {
    dialogVisible.value = false
    router.push({
      path: `/requirement/${item.requirementId}`,
      query: { tab: 'execution' }
    })
  }
}

watch(
  () => filter.value,
  () => {
    currentPage.value = 1
  }
)
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
  margin: 6px 0 0;
  color: var(--rf-text-2);
  font-size: 13px;
}

/* 核心布局：全局锁定 600px 统一视觉高度 */
.work-grid {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr 300px;
  gap: 14px;
}

.surface {
  background: #fff;
  border: 1px solid var(--rf-border);
  border-radius: 12px;
}

.work-main {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.quick {
  padding: 12px 18px;
  border-bottom: 1px solid var(--rf-border);
  flex-shrink: 0;
}

.quick-title {
  font-size: 12px;
  font-weight: 800;
  margin-bottom: 8px;
}

.quick-row {
  display: grid;
  grid-template-columns: 1fr 100px 130px auto;
  gap: 8px;
}

.view-tabs {
  display: flex;
  gap: 3px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--rf-border);
  overflow-x: auto;
  flex-shrink: 0;
}

.view-tabs button {
  border: 0;
  background: transparent;
  padding: 5px 10px;
  color: var(--rf-text-2);
  font-size: 11px;
  font-weight: 700;
  border-radius: 6px;
  cursor: pointer;
  white-space: nowrap;
}

.view-tabs button span {
  color: var(--rf-text-3);
  margin-left: 3px;
}

.view-tabs button.active {
  background: var(--rf-subtle);
  color: var(--rf-text);
}

.task-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.task-row {
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) auto 90px 45px;
  gap: 12px;
  align-items: center;
  padding: 10px 18px;
  border-bottom: 1px solid #f0f1f3;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.task-row:hover {
  background: #fafbff;
}

.checkbox {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1px solid #cfd4da;
  background: #fff;
  color: #fff;
  display: grid;
  place-items: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.15s ease;
}

.checkbox.done {
  background: var(--rf-success) !important;
  border-color: var(--rf-success) !important;
}

.task-main {
  min-width: 0;
}

.task-title-line {
  display: flex;
  align-items: center;
  gap: 8px;
}

.task-title-line strong {
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.desc-badge {
  font-size: 9.5px;
  color: var(--rf-brand);
  background: var(--rf-brand-soft);
  padding: 1px 6px;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
}

.task-sub-info {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 3px;
  font-size: 11px;
}

.source-tag {
  color: var(--rf-text-3);
  white-space: nowrap;
}

.desc-preview-text {
  color: var(--rf-text-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.doneText {
  text-decoration: line-through;
  color: var(--rf-text-3);
}

.due {
  font-size: 11px;
  color: var(--rf-text-3);
}

.overdue {
  color: var(--rf-danger);
  font-weight: 700;
}

.empty-wrap {
  padding: 60px 0;
}

.task-pagination-wrapper {
  height: 48px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  border-top: 1px solid var(--rf-border);
  background: #fff;
  flex-shrink: 0;
}

.side {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.section-title {
  padding: 14px 16px;
  border-bottom: 1px solid var(--rf-border);
  font-size: 12px;
  font-weight: 800;
}

.score {
  flex-shrink: 0;
  padding-bottom: 12px;
}

.score-big {
  padding: 16px 18px 8px;
  font-size: 34px;
  font-weight: 800;
}

.score-big small {
  font-size: 14px;
}

.bar {
  margin: 0 18px;
  height: 7px;
  background: #eef0f3;
  border-radius: 99px;
  overflow: hidden;
}

.bar i {
  display: block;
  height: 100%;
  background: var(--rf-brand);
}

.mini-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  padding: 14px 12px 2px;
}

.mini-stats div {
  text-align: center;
}

.mini-stats b {
  display: block;
  font-size: 16px;
}

.mini-stats span {
  display: block;
  color: var(--rf-text-3);
  font-size: 10px;
  margin-top: 3px;
}

.attention-card {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.attention {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: center;
  padding: 18px 12px;
}

.attention div {
  text-align: center;
}

.attention strong {
  display: block;
  font-size: 26px;
}

.attention span {
  font-size: 11px;
  color: var(--rf-text-3);
}

.text-danger {
  color: var(--rf-danger);
}

.text-warning {
  color: var(--rf-warning);
}

.project-ctx-banner {
  background: #f4f6fa;
  border-radius: 8px;
  padding: 10px 14px;
  margin-bottom: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.project-ctx-banner .ctx-title {
  font-size: 10px;
  font-weight: 800;
  color: var(--rf-brand);
}

.project-ctx-banner p {
  margin: 2px 0 0;
  font-size: 12px;
  font-weight: 600;
  color: var(--rf-text);
}

.form-row-two {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
</style>
