<template>
  <div class="layout-container">
    <header class="navbar">
      <div class="logo">ReqFlow</div>
      <div class="user-meta">
        <span>当前用户：<strong>{{ userStore.nickname }}</strong></span>
        <el-button type="danger" link @click="logout" style="margin-left: 15px;">退出</el-button>
      </div>
    </header>

    <main class="main-content">
      <div class="list-card">
        <div class="card-header">
          <span class="card-title">需求事项看板</span>
          <el-button type="primary" @click="openCreateDialog">新建需求</el-button>
        </div>

        <el-table :data="tableData" style="width: 100%; margin-top: 15px;" border stripe>
          <el-table-column prop="title" label="需求标题" min-width="150" />
          <el-table-column prop="description" label="描述" min-width="200" show-overflow-tooltip />
          <el-table-column prop="priority" label="优先级" width="100">
            <template #default="scope">
              <el-tag :type="getPriorityTag(scope.row.priority)">{{ scope.row.priority }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="进展状态" width="120">
            <template #default="scope">
              <el-tag :type="getStatusTag(scope.row.status)" effect="dark">{{ scope.row.status }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="管理操作" width="220" align="center">
            <template #default="scope">
              <el-button size="small" link type="success" @click="openDetailDrawer(scope.row)">详情与跟进</el-button>
              <el-button size="small" link type="primary" @click="openEditDialog(scope.row)">编辑</el-button>
              <el-button size="small" link type="danger" @click="handleDelete(scope.row.id)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </main>

    <!-- 需求新建/编辑模态窗 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑需求事项' : '新建需求事项'" width="500px">
      <el-form :model="form" label-width="85px" label-position="right">
        <el-form-item label="需求标题" required>
          <el-input v-model="form.title" placeholder="如：实现用户登录日志记录" />
        </el-form-item>
        <el-form-item label="详细说明">
          <el-input v-model="form.description" type="textarea" :rows="4" placeholder="在此录入该需求的细节和交付边界..." />
        </el-form-item>
        <el-form-item label="优先级">
          <el-radio-group v-model="form.priority">
            <el-radio-button label="LOW">低</el-radio-button>
            <el-radio-button label="MEDIUM">中</el-radio-button>
            <el-radio-button label="HIGH">高</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="状态" v-if="isEdit">
          <el-select v-model="form.status" style="width: 100%;">
            <el-option label="待处理" value="TODO" />
            <el-option label="进行中" value="IN_PROGRESS" />
            <el-option label="测试中" value="TESTING" />
            <el-option label="已上线" value="DONE" />
            <el-option label="挂起" value="SUSPENDED" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">确定保存</el-button>
      </template>
    </el-dialog>

    <!-- 需求详情/子任务/讨论日志跟进 侧边抽屉 -->
    <el-drawer v-model="drawerVisible" :title="selectedRequirement?.title" size="550px" direction="rtl">
      <div class="drawer-layout" v-if="selectedRequirement">
        <!-- 1. 子任务管理区域 -->
        <div class="section">
          <h4 class="section-title">子任务拆解</h4>
          
          <!-- 子任务快速新建表单 -->
          <div class="subtask-creator">
            <el-input v-model="subTaskForm.title" placeholder="新增具体任务..." style="flex: 2; margin-right: 10px;" />
            <el-input v-model="subTaskForm.assignee" placeholder="负责人" style="flex: 1; margin-right: 10px;" />
            <el-button type="primary" @click="handleAddSubTask">添加</el-button>
          </div>

          <!-- 子任务展示列表 -->
          <div class="subtask-list">
            <div v-for="task in subTasks" :key="task.id" class="subtask-item">
              <el-checkbox v-model="task.isCompleted" @change="toggleSubTaskStatus(task)">
                <span :class="{ 'completed-text': task.isCompleted }">{{ task.title }}</span>
              </el-checkbox>
              <div class="subtask-right">
                <el-tag size="small" type="info" v-if="task.assignee">👤 {{ task.assignee }}</el-tag>
                <el-button type="danger" link size="small" @click="handleDeleteSubTask(task.id)" style="margin-left: 10px;">删除</el-button>
              </div>
            </div>
            <el-empty v-if="subTasks.length === 0" description="暂无拆解任务" :image-size="40" />
          </div>
        </div>

        <el-divider />

        <!-- 2. 推进讨论记录（时间轴） -->
        <div class="section discussion-section">
          <h4 class="section-title">跟进时间轴</h4>
          
          <!-- 讨论日志时间轴 -->
          <div class="timeline-box">
            <el-timeline v-if="discussions.length > 0">
              <el-timeline-item
                v-for="log in discussions"
                :key="log.id"
                :timestamp="formatTime(log.createdAt)"
                placement="top"
                type="primary"
              >
                <el-card class="log-card">
                  <p class="log-content">{{ log.content }}</p>
                  <span class="log-author">记录人: {{ log.user?.nickname || '系统用户' }}</span>
                </el-card>
              </el-timeline-item>
            </el-timeline>
            <el-empty v-else description="暂无讨论跟进" :image-size="40" />
          </div>

          <!-- 发表跟进内容输入框 -->
          <div class="discussion-poster">
            <el-input 
              v-model="newDiscussionContent" 
              type="textarea" 
              :rows="2" 
              placeholder="在这里追加新的讨论细节或进展..." 
            />
            <el-button type="success" style="margin-top: 10px; float: right;" @click="handlePostDiscussion">提交进展</el-button>
          </div>
        </div>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/store/user'
import { 
  getRequirementsListApi, 
  createRequirementApi, 
  updateRequirementApi, 
  deleteRequirementApi 
} from '@/api/requirement'
import { 
  getSubTasksApi, 
  createSubTaskApi, 
  updateSubTaskApi, 
  deleteSubTaskApi 
} from '@/api/subtask'
import { 
  getDiscussionsApi, 
  createDiscussionApi 
} from '@/api/discussion'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()
const userStore = useUserStore()

const tableData = ref([])
const dialogVisible = ref(false)
const isEdit = ref(false)

// 详情抽屉相关的状态
const drawerVisible = ref(false)
const selectedRequirement = ref(null)
const subTasks = ref([])
const discussions = ref([])
const newDiscussionContent = ref('')
const subTaskForm = ref({ title: '', assignee: '' })

const form = ref({
  id: null,
  title: '',
  description: '',
  priority: 'MEDIUM',
  status: 'TODO'
})

const loadData = async () => {
  try {
    const data = await getRequirementsListApi()
    tableData.value = data
  } catch (error) {}
}

const openCreateDialog = () => {
  isEdit.value = false
  form.value = { id: null, title: '', description: '', priority: 'MEDIUM', status: 'TODO' }
  dialogVisible.value = true
}

const openEditDialog = (row) => {
  isEdit.value = true
  form.value = { ...row }
  dialogVisible.value = true
}

const submitForm = async () => {
  if (!form.value.title.trim()) {
    ElMessage.warning('请填写需求标题')
    return
  }
  try {
    if (isEdit.value) {
      await updateRequirementApi(form.value.id, form.value)
      ElMessage.success('修改成功')
    } else {
      await createRequirementApi(form.value)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    loadData()
  } catch (error) {}
}

const handleDelete = (id) => {
  ElMessageBox.confirm('数据删除后无法恢复，确定删除该事项吗？', '重要提示', {
    confirmButtonText: '确定删除',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await deleteRequirementApi(id)
      ElMessage.success('删除成功')
      loadData()
    } catch (error) {}
  }).catch(() => {})
}

// ================= 抽屉交互逻辑 =================

const openDetailDrawer = async (row) => {
  selectedRequirement.value = row
  drawerVisible.value = true
  // 初始化数据
  newDiscussionContent.value = ''
  subTaskForm.value = { title: '', assignee: '' }
  
  await loadSubTasks(row.id)
  await loadDiscussions(row.id)
}

// 1. 子任务逻辑
const loadSubTasks = async (reqId) => {
  subTasks.value = await getSubTasksApi(reqId)
}

const handleAddSubTask = async () => {
  if (!subTaskForm.value.title.trim()) {
    ElMessage.warning('子任务内容不能为空')
    return
  }
  try {
    await createSubTaskApi({
      requirementId: selectedRequirement.value.id,
      title: subTaskForm.value.title,
      assignee: subTaskForm.value.assignee
    })
    ElMessage.success('子任务添加成功')
    subTaskForm.value = { title: '', assignee: '' }
    loadSubTasks(selectedRequirement.value.id)
  } catch (error) {}
}

const toggleSubTaskStatus = async (task) => {
  try {
    await updateSubTaskApi(task.id, task)
    ElMessage.success(task.isCompleted ? '任务标记为完成' : '任务标记为未完成')
  } catch (error) {
    task.isCompleted = !task.isCompleted // 失败时回滚界面状态
  }
}

const handleDeleteSubTask = async (id) => {
  try {
    await deleteSubTaskApi(id)
    ElMessage.success('子任务已删除')
    loadSubTasks(selectedRequirement.value.id)
  } catch (error) {}
}

// 2. 进展讨论逻辑
const loadDiscussions = async (reqId) => {
  discussions.value = await getDiscussionsApi(reqId)
}

const handlePostDiscussion = async () => {
  if (!newDiscussionContent.value.trim()) {
    ElMessage.warning('请输入讨论内容')
    return
  }
  try {
    await createDiscussionApi({
      requirementId: selectedRequirement.value.id,
      content: newDiscussionContent.value
    })
    ElMessage.success('进展提交成功')
    newDiscussionContent.value = ''
    loadDiscussions(selectedRequirement.value.id)
  } catch (error) {}
}

// 退出登录与样式转换辅助
const logout = () => {
  userStore.clearUserInfo()
  router.push('/login')
}

const getPriorityTag = (p) => {
  if (p === 'HIGH') return 'danger'
  if (p === 'MEDIUM') return 'warning'
  return 'info'
}

const getStatusTag = (s) => {
  switch (s) {
    case 'TODO': return 'info'
    case 'IN_PROGRESS': return 'warning'
    case 'TESTING': return 'primary'
    case 'DONE': return 'success'
    case 'SUSPENDED': return 'danger'
    default: return 'info'
  }
}

const formatTime = (timeStr) => {
  if (!timeStr) return ''
  const date = new Date(timeStr)
  return `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.layout-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}
.navbar {
  height: 60px;
  background-color: #ffffff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 25px;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
}
.logo {
  font-size: 22px;
  font-weight: bold;
  color: #409eff;
}
.user-meta {
  font-size: 14px;
}
.main-content {
  flex: 1;
  padding: 25px;
  display: flex;
  justify-content: center;
}
.list-card {
  width: 100%;
  max-width: 1150px;
  background-color: #ffffff;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.05);
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #ebeef5;
  padding-bottom: 15px;
}
.card-title {
  font-size: 18px;
  font-weight: bold;
}

/* 抽屉布局样式 */
.drawer-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.section {
  margin-bottom: 10px;
}
.section-title {
  margin: 0 0 15px 0;
  font-size: 15px;
  color: #303133;
  border-left: 3px solid #409eff;
  padding-left: 8px;
}
.subtask-creator {
  display: flex;
  margin-bottom: 15px;
}
.subtask-list {
  background-color: #f8f9fa;
  border-radius: 6px;
  padding: 10px;
  max-height: 250px;
  overflow-y: auto;
}
.subtask-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 5px;
  border-bottom: 1px dashed #e4e7ed;
}
.subtask-item:last-child {
  border-bottom: none;
}
.completed-text {
  text-decoration: line-through;
  color: #909399;
}
.subtask-right {
  display: flex;
  align-items: center;
}

.timeline-box {
  max-height: 300px;
  overflow-y: auto;
  padding-right: 10px;
  margin-bottom: 20px;
}
.log-card {
  padding: 10px;
  border-radius: 4px;
}
.log-content {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
}
.log-author {
  display: block;
  font-size: 11px;
  color: #909399;
  text-align: right;
  margin-top: 5px;
}
.discussion-poster {
  border-top: 1px solid #e4e7ed;
  padding-top: 15px;
}
</style>