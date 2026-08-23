<template>
  <div class="todo-workspace">
    <div class="todo-container">
      <!-- 左侧核心操作区域 (占 70% 宽度) -->
      <div class="main-content-left">
        <!-- 1. 顶栏标题 -->
        <div class="page-title-bar">
          <h2 class="page-title">✅ 我的待办中心</h2>
          <p class="page-desc">聚焦个人日常任务与需求协同事项，高效管理工作节奏</p>
        </div>

        <!-- 2. 极速输入栏 -->
        <div class="quick-input-card">
          <div class="quick-input-row">
            <el-input
              v-model="newTodoTitle"
              placeholder="添加一条日常个人待办，按回车 (Enter) 快速发送..."
              size="large"
              class="quick-todo-input"
              @keyup.enter="handleCreateTodo"
              clearable
            >
              <template #prefix>
                <span class="input-icon">➕</span>
              </template>
            </el-input>

            <div class="quick-todo-tools">
              <el-select v-model="newTodoPriority" size="large" style="width: 110px;" placeholder="优先级">
                <el-option label="高优 🔴" value="HIGH" />
                <el-option label="中优 🟡" value="MEDIUM" />
                <el-option label="低优 🔵" value="LOW" />
              </el-select>

              <el-date-picker
                v-model="newTodoDueDate"
                type="date"
                placeholder="截止时间"
                size="large"
                value-format="YYYY-MM-DD"
                style="width: 140px;"
              />

              <el-button type="primary" size="large" @click="handleCreateTodo">添 加</el-button>
            </div>
          </div>
        </div>

        <!-- 3. 待办过滤标签与列表 -->
        <div class="todo-list-card">
          <div class="list-toolbar-row">
            <!-- 分类隔离切换按键 -->
            <el-radio-group v-model="categoryType" size="default">
              <el-radio-button value="ALL">全部分类 ({{ allTodos.length }})</el-radio-button>
              <el-radio-button value="PERSONAL">📝 日常待办 ({{ personalTodosCount }})</el-radio-button>
              <el-radio-button value="PROJECT">📋 需求待办 ({{ projectTodosCount }})</el-radio-button>
            </el-radio-group>

            <!-- 状态筛选按键 -->
            <el-radio-group v-model="activeTab" size="small">
              <el-radio-button value="ALL">全部</el-radio-button>
              <el-radio-button value="PENDING">待处理</el-radio-button>
              <el-radio-button value="COMPLETED">已完成</el-radio-button>
            </el-radio-group>
          </div>

          <div class="todo-items-wrapper" v-loading="loading">
            <template v-if="filteredTodos.length > 0">
              <div
                v-for="item in paginatedTodos"
                :key="item.isProjectTask ? `proj-${item.id}` : `pers-${item.id}`"
                :class="['todo-item-row', { 'is-done': item.status === 'DONE', 'is-project': item.isProjectTask }]"
              >
                <!-- 自定义打勾圆圈 -->
                <div class="check-box-wrapper" @click="handleToggleStatus(item)">
                  <span :class="['custom-check', { 'checked': item.status === 'DONE' }]">
                    <span v-if="item.status === 'DONE'" class="check-mark">✓</span>
                  </span>
                </div>

                <!-- 标题与基本信息 -->
                <div class="todo-content-block" @click="openEditDialog(item)">
                  <span class="todo-title-text">{{ item.title }}</span>
                  <!-- 新增：详细内容 preview 预览 -->
                  <p v-if="item.description" class="todo-desc-text">{{ item.description }}</p>
                  
                  <div class="todo-meta-tags">
                    <!-- 需求待办的项目关联徽章 (支持一键跳转) -->
                    <el-tag 
                      v-if="item.isProjectTask" 
                      type="primary" 
                      size="small" 
                      class="project-badge"
                      @click.stop="goToMatrix(item)"
                    >
                      📌 关联需求：[{{ item.requirementTitle || '未命名需求' }}] ➔ {{ item.stageTitle || '未命名阶段' }}
                    </el-tag>

                    <!-- 优先级 Tag -->
                    <el-tag :type="getPriorityTagType(item.priority)" size="small">
                      {{ formatPriority(item.priority) }}
                    </el-tag>

                    <!-- 截止日期 Tag -->
                    <span 
                      v-if="item.dueDate" 
                      :class="['date-tag', { 'is-overdue': isOverdue(item) }]"
                    >
                      📅 {{ item.dueDate }} {{ isOverdue(item) ? '(已逾期)' : '' }}
                    </span>
                  </div>
                </div>

                <!-- 右侧快捷操作面板 -->
                <div class="todo-actions-block">
                  <el-button type="primary" link size="small" @click="openEditDialog(item)">编辑</el-button>
                  <el-button type="danger" link size="small" @click="handleDeleteTodo(item)">删除</el-button>
                </div>
              </div>
            </template>

            <el-empty v-else description="暂无该分类下的待办事项，轻松一下吧！" :image-size="100" />
          </div>

          <!-- 待办中心底部分页组件 -->
          <div class="pagination-wrapper" style="margin-top: 20px; display: flex; justify-content: flex-end;">
            <el-pagination
              v-model:current-page="todoCurrentPage"
              v-model:page-size="todoPageSize"
              :page-sizes="[5, 10, 20, 50]"
              layout="total, sizes, prev, pager, next, jumper"
              :total="filteredTodos.length"
              @size-change="todoCurrentPage = 1"
            />
          </div>
        </div>
      </div>

      <!-- 右侧辅助概览看板 (占 30% 宽度，充分填补右侧留白) -->
      <div class="sidebar-right">
        <!-- 概览进度卡片 -->
        <div class="sidebar-card">
          <h3 class="card-title">📊 完成进度分析</h3>
          <div class="progress-circle-box">
            <el-progress 
              type="circle" 
              :percentage="completionPercent" 
              :width="110" 
              :stroke-width="8" 
              :color="customColors"
            />
          </div>
          <div class="stats-grid">
            <div class="stat-cell">
              <span class="stat-val">{{ pendingCount }}</span>
              <span class="stat-lbl">待处理</span>
            </div>
            <div class="stat-cell">
              <span class="stat-val success-val">{{ completedCount }}</span>
              <span class="stat-lbl">已完成</span>
            </div>
            <div class="stat-cell">
              <span class="stat-val">{{ allTodos.length }}</span>
              <span class="stat-lbl">总项数</span>
            </div>
          </div>
        </div>

        <!-- 待办类型分布卡片 -->
        <div class="sidebar-card">
          <h3 class="card-title">📌 待办类型分布</h3>
          <div class="distribution-list">
            <div class="dist-item">
              <div class="dist-row">
                <span class="dist-label">📝 日常个人待办</span>
                <span class="dist-val">{{ personalTodosCount }} 项</span>
              </div>
              <el-progress 
                :percentage="allTodos.length ? Math.round((personalTodosCount / allTodos.length) * 100) : 0" 
                :show-text="false" 
                :stroke-width="6" 
                color="#e6a23c" 
              />
            </div>

            <div class="dist-item" style="margin-top: 14px;">
              <div class="dist-row">
                <span class="dist-label">📋 需求派生待办</span>
                <span class="dist-val">{{ projectTodosCount }} 项</span>
              </div>
              <el-progress 
                :percentage="allTodos.length ? Math.round((projectTodosCount / allTodos.length) * 100) : 0" 
                :show-text="false" 
                :stroke-width="6" 
                color="#2383e2" 
              />
            </div>
          </div>
        </div>

        <!-- 高效提示卡片 -->
        <div class="sidebar-card tip-card">
          <div class="tip-header">
            <span class="tip-icon">💡</span>
            <span class="tip-title">联动提示</span>
          </div>
          <p class="tip-body">【需求待办】来自协同矩阵的分配，勾选打勾后矩阵中的任务状态将自动同步为【已完成】。</p>
        </div>
      </div>
    </div>

    <!-- 修改待办对话框 -->
    <el-dialog v-model="editDialogVisible" title="修改待办事项" width="480px" append-to-body>
      <el-form :model="editForm" label-width="80px">
        <el-form-item label="待办标题" required>
          <el-input v-model="editForm.title" placeholder="请输入待办标题..." />
        </el-form-item>
        <!-- 新增：详细内容 textarea 输入框 -->
        <el-form-item label="详细内容" v-if="!editForm.isProjectTask">
          <el-input
            v-model="editForm.description"
            type="textarea"
            :rows="3"
            placeholder="添加待办事项的补充细节、备注说明或步骤清单..."
          />
        </el-form-item>
        <el-form-item label="优先级" v-if="!editForm.isProjectTask">
          <el-radio-group v-model="editForm.priority">
            <el-radio-button value="LOW">低</el-radio-button>
            <el-radio-button value="MEDIUM">中</el-radio-button>
            <el-radio-button value="HIGH">高</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="截止日期">
          <el-date-picker
            v-model="editForm.dueDate"
            type="date"
            placeholder="选择截止时间"
            value-format="YYYY-MM-DD"
            style="width: 100%;"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitEditForm">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import {
  getMyTodosApi,
  createTodoApi,
  updateTodoApi,
  toggleTodoApi,
  deleteTodoApi
} from '@/api/todo'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()

const loading = ref(false)
const allTodos = ref([])
const categoryType = ref('ALL') // ALL, PERSONAL, PROJECT
const activeTab = ref('ALL')     // ALL, PENDING, COMPLETED

// 新建输入框绑定
const newTodoTitle = ref('')
const newTodoPriority = ref('MEDIUM')
const newTodoDueDate = ref(null)

// 待办分页状态
const todoCurrentPage = ref(1)
const todoPageSize = ref(10)

// 监听分类与状态过滤按键切换，自动重置页码回到第 1 页
watch([categoryType, activeTab], () => {
  todoCurrentPage.value = 1
})

// 编辑弹窗绑定
const editDialogVisible = ref(false)
const editForm = ref({
  id: null,
  title: '',
  description: '',
  priority: 'MEDIUM',
  dueDate: null,
  status: 'TODO',
  isProjectTask: false
})

const customColors = [
  { color: '#f56c6c', percentage: 20 },
  { color: '#e6a23c', percentage: 60 },
  { color: '#2383e2', percentage: 100 }
]

// 统计计算属性
const personalTodosCount = computed(() => allTodos.value.filter(t => !t.isProjectTask).length)
const projectTodosCount = computed(() => allTodos.value.filter(t => t.isProjectTask).length)

const pendingCount = computed(() => allTodos.value.filter(t => t.status === 'TODO').length)
const completedCount = computed(() => allTodos.value.filter(t => t.status === 'DONE').length)
const completionPercent = computed(() => {
  const total = allTodos.value.length
  return total > 0 ? Math.round((completedCount.value / total) * 100) : 0
})

// 分类与状态双重过滤计算属性
const filteredTodos = computed(() => {
  let list = allTodos.value

  // 1. 分类隔离过滤
  if (categoryType.value === 'PERSONAL') {
    list = list.filter(t => !t.isProjectTask)
  } else if (categoryType.value === 'PROJECT') {
    list = list.filter(t => t.isProjectTask)
  }

  // 2. 状态过滤
  if (activeTab.value === 'PENDING') {
    return list.filter(t => t.status === 'TODO')
  }
  if (activeTab.value === 'COMPLETED') {
    return list.filter(t => t.status === 'DONE')
  }
  return list
})

// 当前页实际渲染展示的待办列表切片
const paginatedTodos = computed(() => {
  const start = (todoCurrentPage.value - 1) * todoPageSize.value
  const end = start + todoPageSize.value
  return filteredTodos.value.slice(start, end)
})

// 加载待办列表
const loadTodos = async () => {
  loading.value = true
  try {
    allTodos.value = await getMyTodosApi()
  } catch (error) {
  } finally {
    loading.value = false
  }
}

// 新建个人日常待办
const handleCreateTodo = async () => {
  if (!newTodoTitle.value.trim()) {
    ElMessage.warning('请输入待办事项内容')
    return
  }
  try {
    await createTodoApi({
      title: newTodoTitle.value.trim(),
      priority: newTodoPriority.value,
      dueDate: newTodoDueDate.value
    })
    ElMessage.success('日常待办添加成功')
    newTodoTitle.value = ''
    newTodoDueDate.value = null
    todoCurrentPage.value = 1 // 新建成功后跳转回首页展示
    await loadTodos()
  } catch (error) { }
}

// 快捷打勾/取消打勾
const handleToggleStatus = async (item) => {
  item.status = item.status === 'DONE' ? 'TODO' : 'DONE'
  try {
    await toggleTodoApi(item.id, item.isProjectTask)
  } catch (error) {
    await loadTodos()
  }
}

// 打开编辑弹窗
const openEditDialog = (item) => {
  editForm.value = {
    ...item,
    description: item.description || ''
  }
  editDialogVisible.value = true
}

// 提交修改
const submitEditForm = async () => {
  if (!editForm.value.title.trim()) {
    ElMessage.warning('待办内容不可为空')
    return
  }
  try {
    await updateTodoApi(editForm.value.id, editForm.value)
    ElMessage.success('更新成功')
    editDialogVisible.value = false
    await loadTodos()
  } catch (error) { }
}

// 删除待办
const handleDeleteTodo = (item) => {
  ElMessageBox.confirm(
    item.isProjectTask ? '确定要移除此需求待办项吗？' : '确定要删除这条日常待办吗？',
    '提示',
    { type: 'warning' }
  ).then(async () => {
    await deleteTodoApi(item.id, item.isProjectTask)
    ElMessage.success('删除成功')
    await loadTodos()
  }).catch(() => { })
}

// 一键直达协同矩阵现场
const goToMatrix = (item) => {
  if (item.requirementId) {
    router.push({
      path: '/matrix',
      query: { reqId: item.requirementId }
    })
  }
}

// 辅助函数
const isOverdue = (item) => {
  if (!item.dueDate || item.status === 'DONE') return false
  const today = new Date().toISOString().split('T')[0]
  return item.dueDate < today
}

const getPriorityTagType = (p) => {
  if (p === 'HIGH') return 'danger'
  if (p === 'MEDIUM') return 'warning'
  return 'info'
}

const formatPriority = (p) => {
  if (p === 'HIGH') return '高优'
  if (p === 'MEDIUM') return '中优'
  return '低优'
}

onMounted(() => {
  loadTodos()
})
</script>

<style scoped>
/* 整个画布铺满视口，采用双栏 Flex 布局 */
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
  max-width: 1380px; /* 扩展最大宽度，充分利用宽屏 */
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

/* 左侧主体 70% */
.main-content-left {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
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

.quick-input-card {
  background: #ffffff;
  border-radius: 8px;
  padding: 16px 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.quick-input-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.quick-todo-input {
  flex: 1;
}

.quick-todo-tools {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
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

.todo-item-row {
  display: flex;
  align-items: center;
  padding: 12px 14px;
  border-radius: 6px;
  border: 1px solid rgba(55, 53, 47, 0.08);
  background-color: #ffffff;
  transition: all 0.15s ease-in-out;
}

.todo-item-row.is-project {
  border-left: 3px solid #2383e2;
}

.todo-item-row:hover {
  background-color: #fcfcfb;
  border-color: #2383e2;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
}

.todo-item-row.is-done {
  opacity: 0.6;
  background-color: #fafafa;
}

.todo-item-row.is-done .todo-title-text {
  text-decoration: line-through;
  color: #8c8c8c;
}

.check-box-wrapper {
  cursor: pointer;
  padding: 4px;
  margin-right: 12px;
  display: flex;
  align-items: center;
}

.custom-check {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid #d9d9d9;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.custom-check:hover {
  border-color: #2383e2;
}

.custom-check.checked {
  background-color: #0d7c50;
  border-color: #0d7c50;
}

.check-mark {
  color: #ffffff;
  font-size: 11px;
  font-weight: bold;
}

.todo-content-block {
  flex: 1;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.todo-title-text {
  font-size: 14px;
  color: #37352f;
  font-weight: 500;
}

/* 待办详细描述文本 preview 样式 */
.todo-desc-text {
  margin: 2px 0 2px 0;
  font-size: 12px;
  color: #8c8c8c;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.todo-meta-tags {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 2px;
}

.project-badge {
  cursor: pointer;
  transition: opacity 0.15s ease;
}

.project-badge:hover {
  opacity: 0.85;
}

.date-tag {
  font-size: 11px;
  color: #8c8c8c;
  background-color: #f5f5f5;
  padding: 2px 6px;
  border-radius: 3px;
}

.date-tag.is-overdue {
  color: #df4331;
  background-color: #ffe2dd;
  font-weight: 600;
}

.todo-actions-block {
  display: flex;
  gap: 8px;
}

/* 右侧边栏 30% */
.sidebar-right {
  width: 310px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex-shrink: 0;
}

.sidebar-card {
  background: #ffffff;
  border-radius: 8px;
  padding: 18px 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.card-title {
  margin: 0 0 14px 0;
  font-size: 14px;
  font-weight: 700;
  color: #37352f;
}

.progress-circle-box {
  display: flex;
  justify-content: center;
  padding: 10px 0 16px 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  border-top: 1px solid rgba(55, 53, 47, 0.08);
  padding-top: 12px;
}

.stat-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-val {
  font-size: 16px;
  font-weight: 700;
  color: #37352f;
}

.success-val {
  color: #0d7c50;
}

.stat-lbl {
  font-size: 11px;
  color: #8c8c8c;
  margin-top: 2px;
}

.distribution-list {
  display: flex;
  flex-direction: column;
}

.dist-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.dist-label {
  font-size: 12px;
  color: #37352f;
}

.dist-val {
  font-size: 12px;
  font-weight: 600;
  color: #8c8c8c;
}

.tip-card {
  background-color: #f7f9fc;
  border: 1px solid #e1e9f5;
}

.tip-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}

.tip-icon {
  font-size: 16px;
}

.tip-title {
  font-size: 13px;
  font-weight: 700;
  color: #2383e2;
}

.tip-body {
  margin: 0;
  font-size: 12px;
  color: #606266;
  line-height: 1.6;
}
</style>