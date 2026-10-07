<!-- src/features/todo/index.vue -->
<template>
  <div class="my-work-workspace">
    <div class="my-work-container">
      <!-- 顶部工作台标题与状态指标 -->
      <div class="workbench-header">
        <div>
          <h2 class="workbench-title">⚡ 我的工作台 (My Work)</h2>
          <p class="workbench-subtitle">聚合个人工作流与需求协同任务，围绕需求执行推进闭环</p>
        </div>
        <div class="workbench-stats-badges">
          <div v-if="overdueCount > 0" class="stat-pill overdue">
            <span>⚠️ 已逾期</span>
            <b>{{ overdueCount }}</b>
          </div>
          <div class="stat-pill today">
            <span>📅 今日应完成</span>
            <b>{{ todayCount }}</b>
          </div>
          <div class="stat-pill pending">
            <span>⏳ 进行中</span>
            <b>{{ inProgressCount }}</b>
          </div>
        </div>
      </div>

      <!-- 快速录入个人备忘事项 -->
      <TodoQuickInput @created="loadTodos" />

      <!-- 主列表卡片 -->
      <div class="my-work-card">
        <div class="filter-toolbar-row">
          <!-- 分类：全部 / 需求工作项 / 个人待办 -->
          <el-radio-group v-model="categoryType" size="default">
            <el-radio-button value="ALL">全部 ({{ allTodos.length }})</el-radio-button>
            <el-radio-button value="PROJECT">
              📋 需求协同 ({{ projectTodosCount }})
            </el-radio-button>
            <el-radio-button value="PERSONAL">
              📝 个人便签 ({{ personalTodosCount }})
            </el-radio-button>
          </el-radio-group>

          <!-- 时间与状态视角切换 -->
          <el-radio-group v-model="timeBucketTab" size="small">
            <el-radio-button value="INBOX">收件箱</el-radio-button>
            <el-radio-button value="TODAY">今日 ({{ todayCount }})</el-radio-button>
            <el-radio-button value="OVERDUE">逾期 ({{ overdueCount }})</el-radio-button>
            <el-radio-button value="DONE">已完成</el-radio-button>
          </el-radio-group>
        </div>

        <div v-loading="loading" class="work-items-list">
          <el-alert
            v-if="loadError && paginatedTodos.length"
            :title="loadError"
            type="error"
            show-icon
            :closable="false"
            class="todo-load-error"
          >
            <template #default>
              <el-button link type="primary" :loading="loading" @click="loadTodos">
                重试
              </el-button>
            </template>
          </el-alert>

          <template v-if="paginatedTodos.length > 0">
            <TodoItemRow
              v-for="item in paginatedTodos"
              :key="item.isProjectTask ? `proj-${item.id}` : `pers-${item.id}`"
              :item="item"
              @toggle="handleToggleStatus"
              @edit="openEditDialog"
              @delete="handleDeleteTodo"
            />
          </template>

          <el-empty v-else-if="loadError" description="待办暂时无法加载" :image-size="90">
            <el-button type="primary" :loading="loading" @click="loadTodos">重试加载</el-button>
          </el-empty>
          <el-empty v-else-if="!loading" description="当前视图没有待处理事项" :image-size="90" />
        </div>

        <!-- 分页 -->
        <div v-if="filteredTodos.length > 0" class="pagination-footer">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[10, 20, 50]"
            layout="total, sizes, prev, pager, next, jumper"
            :total="filteredTodos.length"
            @size-change="currentPage = 1"
          />
        </div>
      </div>
    </div>

    <!-- 编辑便签弹窗 -->
    <TodoEditDialog
      v-model="editDialogVisible"
      :todo-item="selectedEditItem"
      @updated="loadTodos"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { getMyTodosApi, toggleTodoApi, deleteTodoApi } from './api'
import type { TodoItem } from '@/types'
import { ElMessage, ElMessageBox } from 'element-plus'
import TodoQuickInput from './components/TodoQuickInput.vue'
import TodoItemRow from './components/TodoItemRow.vue'
import TodoEditDialog from './components/TodoEditDialog.vue'
import { getLocalDateString } from '@/utils/date'

const loading = ref(false)
const loadError = ref('')
const allTodos = ref<TodoItem[]>([])

const categoryType = ref<'ALL' | 'PERSONAL' | 'PROJECT'>('ALL')
const timeBucketTab = ref<'INBOX' | 'TODAY' | 'OVERDUE' | 'DONE'>('INBOX')

const currentPage = ref(1)
const pageSize = ref(10)

const editDialogVisible = ref(false)
const selectedEditItem = ref<TodoItem | null>(null)
const todayStr = ref(getLocalDateString())
let dateRefreshTimer: ReturnType<typeof setInterval> | undefined

watch([categoryType, timeBucketTab], () => {
  currentPage.value = 1
})

const personalTodosCount = computed(() => allTodos.value.filter(t => !t.isProjectTask).length)
const projectTodosCount = computed(() => allTodos.value.filter(t => t.isProjectTask).length)

const inProgressCount = computed(
  () => allTodos.value.filter(t => t.status === 'IN_PROGRESS' || t.status === 'TODO').length
)

const overdueCount = computed(() => {
  return allTodos.value.filter(t => t.status !== 'DONE' && t.dueDate && t.dueDate < todayStr.value)
    .length
})

const todayCount = computed(() => {
  return allTodos.value.filter(
    t => t.status !== 'DONE' && t.dueDate && t.dueDate === todayStr.value
  ).length
})

const filteredTodos = computed(() => {
  let list = allTodos.value

  // 1. 分类过滤
  if (categoryType.value === 'PERSONAL') {
    list = list.filter(t => !t.isProjectTask)
  } else if (categoryType.value === 'PROJECT') {
    list = list.filter(t => t.isProjectTask)
  }

  // 2. 时间与状态分桶过滤
  if (timeBucketTab.value === 'DONE') {
    return list.filter(t => t.status === 'DONE')
  }
  if (timeBucketTab.value === 'TODAY') {
    return list.filter(t => t.status !== 'DONE' && t.dueDate === todayStr.value)
  }
  if (timeBucketTab.value === 'OVERDUE') {
    return list.filter(t => t.status !== 'DONE' && t.dueDate && t.dueDate < todayStr.value)
  }
  // INBOX: 展示未完成任务
  return list.filter(t => t.status !== 'DONE')
})

const paginatedTodos = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredTodos.value.slice(start, start + pageSize.value)
})

const loadTodos = async () => {
  loading.value = true
  loadError.value = ''
  try {
    allTodos.value = await getMyTodosApi()
  } catch {
    loadError.value = '待办加载失败，当前保留上次成功加载的内容。'
  } finally {
    loading.value = false
  }
}

const handleToggleStatus = async (item: TodoItem) => {
  const previousStatus = item.status
  const newStatus = item.status === 'DONE' ? 'IN_PROGRESS' : 'DONE'
  item.status = newStatus
  try {
    await toggleTodoApi(item.id, item.isProjectTask)
  } catch {
    item.status = previousStatus
    ElMessage.error('更新状态失败，请重试')
  }
}

const openEditDialog = (item: TodoItem) => {
  selectedEditItem.value = item
  editDialogVisible.value = true
}

const handleDeleteTodo = (item: TodoItem) => {
  ElMessageBox.confirm(
    item.isProjectTask ? '确定要移除此需求协同项吗？' : '确定要删除这条个人备忘吗？',
    '提示',
    { type: 'warning' }
  )
    .then(async () => {
      await deleteTodoApi(item.id, item.isProjectTask)
      ElMessage.success('已移除')
      await loadTodos()
    })
    .catch(error => {
      if (error !== 'cancel' && error !== 'close') ElMessage.error('移除失败，请重试')
    })
}

onMounted(() => {
  dateRefreshTimer = setInterval(() => {
    todayStr.value = getLocalDateString()
  }, 60_000)
  loadTodos()
})

onUnmounted(() => {
  if (dateRefreshTimer) clearInterval(dateRefreshTimer)
})
</script>

<style scoped>
.my-work-workspace {
  flex: 1;
  padding: 28px clamp(16px, 3vw, 40px);
  overflow-y: auto;
  background-color: #f7f7f5;
  display: flex;
  justify-content: center;
}

.my-work-container {
  width: 100%;
  max-width: 1180px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.workbench-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  flex-wrap: wrap;
  margin-bottom: 2px;
}

.workbench-title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: #37352f;
}

.workbench-subtitle {
  margin: 4px 0 0 0;
  font-size: 13px;
  color: #8c8c8c;
}

.workbench-stats-badges {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.stat-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  background-color: #ffffff;
  border: 1px solid rgba(55, 53, 47, 0.08);
}

.stat-pill.overdue {
  color: #df4331;
  background-color: #ffe2dd;
  border-color: #ffcfc8;
}

.stat-pill.today {
  color: #0f73da;
  background-color: #e0f0ff;
  border-color: #c9e4ff;
}

.stat-pill.pending {
  color: #8c8c8c;
}

.my-work-card {
  background: #ffffff;
  border-radius: 10px;
  padding: 22px;
  box-shadow: 0 2px 10px rgba(32, 34, 36, 0.035);
  border: 1px solid rgba(55, 53, 47, 0.09);
  min-height: 480px;
}

.filter-toolbar-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}

.work-items-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.todo-load-error {
  margin-bottom: 12px;
}

.pagination-footer {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 760px) {
  .my-work-workspace {
    padding: 16px 12px;
  }

  .my-work-card {
    padding: 14px;
  }

  .filter-toolbar-row,
  .filter-toolbar-row :deep(.el-radio-group) {
    width: 100%;
  }

  .filter-toolbar-row :deep(.el-radio-group) {
    display: flex;
  }

  .filter-toolbar-row :deep(.el-radio-button) {
    flex: 1;
  }

  .filter-toolbar-row :deep(.el-radio-button__inner) {
    width: 100%;
    padding: 8px 6px;
  }

  .pagination-footer {
    justify-content: center;
    overflow-x: auto;
  }
}
</style>
