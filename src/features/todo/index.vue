<!-- src/features/todo/index.vue -->
<template>
  <div class="todo-workspace">
    <div class="todo-container">
      <!-- 顶部标题栏 -->
      <div class="page-title-bar">
        <h2 class="page-title">✅ 我的待办中心</h2>
        <p class="page-desc">聚焦个人日常任务与需求协同事项，高效推进工作节奏</p>
      </div>

      <!-- 1. 极速录入栏组件 -->
      <TodoQuickInput @created="loadTodos" />

      <!-- 2. 待办列表主体卡片 (100% 全宽沉浸式体验) -->
      <div class="todo-list-card">
        <div class="list-toolbar-row">
          <el-radio-group v-model="categoryType" size="default">
            <el-radio-button value="ALL">全部分类 ({{ allTodos.length }})</el-radio-button>
            <el-radio-button value="PERSONAL">
              📝 日常待办 ({{ personalTodosCount }})
            </el-radio-button>
            <el-radio-button value="PROJECT">
              📋 需求待办 ({{ projectTodosCount }})
            </el-radio-button>
          </el-radio-group>

          <el-radio-group v-model="activeTab" size="small">
            <el-radio-button value="ALL">全部</el-radio-button>
            <el-radio-button value="IN_PROGRESS">进行中</el-radio-button>
            <el-radio-button value="PENDING">待处理</el-radio-button>
            <el-radio-button value="COMPLETED">已完成</el-radio-button>
          </el-radio-group>
        </div>

        <div v-loading="loading" class="todo-items-wrapper">
          <template v-if="paginatedTodos.length > 0">
            <!-- 单项卡片组件 -->
            <TodoItemRow
              v-for="item in paginatedTodos"
              :key="item.isProjectTask ? `proj-${item.id}` : `pers-${item.id}`"
              :item="item"
              @toggle="handleToggleStatus"
              @edit="openEditDialog"
              @delete="handleDeleteTodo"
            />
          </template>

          <el-empty
            v-else
            description="暂无该分类/状态下的待办事项，轻松一下吧！"
            :image-size="100"
          />
        </div>

        <!-- 底部分页 -->
        <div class="pagination-wrapper">
          <el-pagination
            v-model:current-page="todoCurrentPage"
            v-model:page-size="todoPageSize"
            :page-sizes="[10, 20, 50, 100]"
            layout="total, sizes, prev, pager, next, jumper"
            :total="filteredTodos.length"
            @size-change="todoCurrentPage = 1"
          />
        </div>
      </div>
    </div>

    <!-- 编辑待办弹窗组件 -->
    <TodoEditDialog
      v-model="editDialogVisible"
      :todo-item="selectedEditItem"
      @updated="loadTodos"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { getMyTodosApi, toggleTodoApi, deleteTodoApi } from './api'
import type { TodoItem } from '@/types'
import { ElMessage, ElMessageBox } from 'element-plus'
import TodoQuickInput from './components/TodoQuickInput.vue'
import TodoItemRow from './components/TodoItemRow.vue'
import TodoEditDialog from './components/TodoEditDialog.vue'

const loading = ref(false)
const allTodos = ref<TodoItem[]>([])

const categoryType = ref<'ALL' | 'PERSONAL' | 'PROJECT'>('PERSONAL')
const activeTab = ref<'ALL' | 'IN_PROGRESS' | 'PENDING' | 'COMPLETED'>('IN_PROGRESS')

const todoCurrentPage = ref(1)
const todoPageSize = ref(10)

const editDialogVisible = ref(false)
const selectedEditItem = ref<TodoItem | null>(null)

watch([categoryType, activeTab], () => {
  todoCurrentPage.value = 1
})

const personalTodosCount = computed(() => allTodos.value.filter(t => !t.isProjectTask).length)
const projectTodosCount = computed(() => allTodos.value.filter(t => t.isProjectTask).length)

const filteredTodos = computed(() => {
  let list = allTodos.value
  if (categoryType.value === 'PERSONAL') {
    list = list.filter(t => !t.isProjectTask)
  } else if (categoryType.value === 'PROJECT') {
    list = list.filter(t => t.isProjectTask)
  }

  if (activeTab.value === 'IN_PROGRESS') {
    return list.filter(t => t.status === 'IN_PROGRESS')
  }
  if (activeTab.value === 'PENDING') {
    return list.filter(t => t.status === 'TODO')
  }
  if (activeTab.value === 'COMPLETED') {
    return list.filter(t => t.status === 'DONE')
  }
  return list
})

const paginatedTodos = computed(() => {
  const start = (todoCurrentPage.value - 1) * todoPageSize.value
  const end = start + todoPageSize.value
  return filteredTodos.value.slice(start, end)
})

const loadTodos = async () => {
  loading.value = true
  try {
    allTodos.value = await getMyTodosApi()
  } catch (err) {
  } finally {
    loading.value = false
  }
}

const handleToggleStatus = async (item: TodoItem) => {
  const newStatus = item.status === 'DONE' ? 'IN_PROGRESS' : 'DONE'
  item.status = newStatus
  try {
    await toggleTodoApi(item.id, item.isProjectTask)
  } catch (err) {
    await loadTodos()
  }
}

const openEditDialog = (item: TodoItem) => {
  selectedEditItem.value = item
  editDialogVisible.value = true
}

const handleDeleteTodo = (item: TodoItem) => {
  ElMessageBox.confirm(
    item.isProjectTask ? '确定要移除此需求待办项吗？' : '确定要删除这条日常待办吗？',
    '提示',
    { type: 'warning' }
  )
    .then(async () => {
      await deleteTodoApi(item.id, item.isProjectTask)
      ElMessage.success('删除成功')
      await loadTodos()
    })
    .catch(() => {})
}

onMounted(() => {
  loadTodos()
})
</script>

<style scoped>
.todo-workspace {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  background-color: #f5f7fa;
  display: flex;
  justify-content: center;
}

.todo-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.page-title-bar {
  margin-bottom: 4px;
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #37352f;
}

.page-desc {
  margin: 4px 0 0 0;
  font-size: 13px;
  color: #8c8c8c;
}

.todo-list-card {
  background: #ffffff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  min-height: 480px;
}

.list-toolbar-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}

.todo-items-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pagination-wrapper {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>
