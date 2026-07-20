<template>
  <div class="layout-wrapper">
    <!-- 1. 左侧侧边菜单栏 -->
    <aside class="sidebar">
      <div class="brand">
        <span class="logo-icon">🌊</span>
        <span class="logo-text">ReqFlow</span>
      </div>
      <el-menu
        default-active="1"
        class="sidebar-menu"
        background-color="#001529"
        text-color="#a6adb4"
        active-text-color="#ffffff"
      >
        <el-menu-item index="1">
          <el-icon><Menu /></el-icon>
          <span>需求事项管理</span>
        </el-menu-item>
      </el-menu>
    </aside>

    <!-- 2. 右侧主体内容区域 -->
    <div class="main-container">
      <!-- 顶部通栏 -->
      <header class="topbar">
        <div class="breadcrumb">项目控制台 / 需求事项管理</div>
        <div class="user-profile">
          <span>当前用户：<strong>{{ userStore.nickname }}</strong></span>
          <el-button type="danger" link @click="logout" style="margin-left: 15px;">退出登录</el-button>
        </div>
      </header>

      <!-- 核心工作区 -->
      <main class="workspace">
        <div class="content-card">
          <div class="table-toolbar">
            <span class="table-title">工作看板</span>
            <el-button type="primary" @click="openCreateDialog">新建需求事项</el-button>
          </div>

          <!-- 主需求表格列表 -->
          <el-table :data="tableData" style="width: 100%; margin-top: 15px;" border stripe>
            <el-table-column prop="title" label="需求标题" min-width="150" show-overflow-tooltip />
            <el-table-column prop="description" label="核心描述" min-width="180" show-overflow-tooltip />
            <el-table-column label="排期起止" width="220">
              <template #default="scope">
                <span class="date-text" v-if="scope.row.startDate || scope.row.endDate">
                  {{ scope.row.startDate || '未定' }} 至 {{ scope.row.endDate || '未定' }}
                </span>
                <span class="date-text-none" v-else>暂无排期</span>
              </template>
            </el-table-column>
            <el-table-column prop="priority" label="优先级" width="90" align="center">
              <template #default="scope">
                <el-tag :type="getPriorityTag(scope.row.priority)" size="small">{{ scope.row.priority }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="status" label="进展状态" width="100" align="center">
              <template #default="scope">
                <el-tag :type="getStatusTag(scope.row.status)" effect="dark" size="small">{{ scope.row.status }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作面板" width="220" align="center" fixed="right">
              <template #default="scope">
                <el-button size="small" link type="success" @click="openDetailDrawer(scope.row)">阶段与跟进</el-button>
                <el-button size="small" link type="primary" @click="openEditDialog(scope.row)">编辑</el-button>
                <el-button size="small" link type="danger" @click="handleDelete(scope.row.id)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </main>
    </div>

    <!-- 需求新建/修改弹窗 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '修改需求' : '录入新需求'" width="550px">
      <el-form :model="form" label-width="90px">
        <el-form-item label="需求名称" required>
          <el-input v-model="form.title" placeholder="请输入需求标题" />
        </el-form-item>
        <el-form-item label="需求背景">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="请输入核心背景或业务价值..." />
        </el-form-item>
        <el-form-item label="计划起止">
          <el-date-picker
            v-model="requirementDateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="截止日期"
            value-format="YYYY-MM-DD"
            style="width: 100%;"
          />
        </el-form-item>
        <el-form-item label="优先级">
          <el-radio-group v-model="form.priority">
            <el-radio-button label="LOW">低</el-radio-button>
            <el-radio-button label="MEDIUM">中</el-radio-button>
            <el-radio-button label="HIGH">高</el-radio-button>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="主状态" v-if="isEdit">
          <el-select v-model="form.status" style="width: 100%;">
            <el-option label="待处理" value="TODO" />
            <el-option label="进行中" value="IN_PROGRESS" />
            <el-option label="测试中" value="TESTING" />
            <el-option label="已上线" value="DONE" />
            <el-option label="已挂起" value="SUSPENDED" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>

    <!-- 需求详情/阶段管理/跟进 侧边抽屉 -->
    <el-drawer v-model="drawerVisible" :title="`【需求】${selectedRequirement?.title}`" size="620px" direction="rtl">
      <div class="drawer-scroll-box" v-if="selectedRequirement">
        
        <!-- A. 阶段划分及阶段级详情跟进 -->
        <div class="drawer-section">
          <div class="section-flex-header">
            <h4 class="section-title">需求划期与执行阶段</h4>
            <el-button type="primary" size="small" @click="openCreateStageDialog">划分新阶段</el-button>
          </div>

          <!-- 阶段列表折叠面板 -->
          <el-collapse v-model="activeStageCollapse" accordion @change="handleStageCollapseChange">
            <el-collapse-item v-for="stage in stages" :key="stage.id" :name="stage.id">
              <!-- 折叠面板标题栏定制 -->
              <template #title>
                <div class="stage-header-summary">
                  <span class="stage-name">{{ stage.title }}</span>
                  <div class="stage-summary-right">
                    <span class="stage-dates">{{ stage.startDate || '未定' }} ~ {{ stage.endDate || '未定' }}</span>
                    <el-tag :type="getStageStatusTag(stage.status)" size="small" style="margin-left: 10px;">{{ stage.status }}</el-tag>
                    <el-button type="danger" link size="small" @click.stop="handleDeleteStage(stage.id)" style="margin-left: 15px;">移除</el-button>
                  </div>
                </div>
              </template>

              <!-- 折叠面板展开内容：将子任务和跟进讨论绑定到此阶段 -->
              <div class="stage-detail-container" v-if="activeStageId === stage.id">
                
                <!-- 1. 阶段子任务管理 -->
                <div class="sub-block">
                  <div class="block-title">📋 阶段内子任务</div>
                  <div class="subtask-creator-row">
                    <el-input v-model="subTaskForm.title" placeholder="任务内容..." style="flex: 2; margin-right: 8px;" size="small" />
                    <el-input v-model="subTaskForm.assignee" placeholder="负责人" style="flex: 1; margin-right: 8px;" size="small" />
                    <el-button type="primary" size="small" @click="handleAddSubTask">添加</el-button>
                  </div>
                  <div class="subtask-box">
                    <div v-for="task in subTasks" :key="task.id" class="subtask-item-row">
                      <el-checkbox v-model="task.isCompleted" @change="toggleSubTaskStatus(task)">
                        <span :class="{ 'completed-line': task.isCompleted }">{{ task.title }}</span>
                      </el-checkbox>
                      <div class="item-right">
                        <el-tag size="small" type="info" v-if="task.assignee">👤 {{ task.assignee }}</el-tag>
                        <el-button type="danger" link size="small" @click="handleDeleteSubTask(task.id)" style="margin-left: 8px;">删除</el-button>
                      </div>
                    </div>
                    <el-empty v-if="subTasks.length === 0" description="本阶段无拆解子任务" :image-size="30" style="padding: 10px 0;" />
                  </div>
                </div>

                <!-- 2. 阶段跟进讨论时间轴 -->
                <div class="sub-block" style="margin-top: 20px;">
                  <div class="block-title">🕒 阶段推进日志</div>
                  <div class="timeline-scroll-area">
                    <el-timeline v-if="discussions.length > 0">
                      <el-timeline-item
                        v-for="log in discussions"
                        :key="log.id"
                        :timestamp="formatTime(log.createdAt)"
                        placement="top"
                        type="primary"
                      >
                        <div class="timeline-log-bubble">
                          <p class="bubble-text">{{ log.content }}</p>
                          <span class="bubble-author">跟进人: {{ log.user?.nickname || '未知用户' }}</span>
                        </div>
                      </el-timeline-item>
                    </el-timeline>
                    <el-empty v-else description="本阶段暂无推进细节" :image-size="30" style="padding: 10px 0;" />
                  </div>
                  
                  <div class="poster-input-area">
                    <el-input 
                      v-model="newDiscussionContent" 
                      type="textarea" 
                      :rows="2" 
                      placeholder="录入本阶段最新的进展备注或讨论细节..." 
                      size="small"
                    />
                    <el-button type="success" size="small" style="margin-top: 8px; float: right;" @click="handlePostDiscussion">提交进展</el-button>
                  </div>
                </div>

              </div>
            </el-collapse-item>
          </el-collapse>
          <el-empty v-if="stages.length === 0" description="请先添加阶段（例如：原型设计、研发编码、联合调试等）" :image-size="60" />
        </div>
      </div>
    </el-drawer>

    <!-- 新建阶段微型弹窗 -->
    <el-dialog v-model="stageDialogVisible" title="划分新执行阶段" width="400px" append-to-body>
      <el-form :model="stageForm" label-width="80px">
        <el-form-item label="阶段名称" required>
          <el-input v-model="stageForm.title" placeholder="如：研发编码期 / 业务测试期" />
        </el-form-item>
        <el-form-item label="起止排期">
          <el-date-picker
            v-model="stageDateRange"
            type="daterange"
            range-separator="-"
            start-placeholder="开始"
            end-placeholder="截止"
            value-format="YYYY-MM-DD"
            style="width: 100%;"
            size="small"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="stageDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitStageForm">确定添加</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/store/user'
import { Menu } from '@element-plus/icons-vue'
import { 
  getRequirementsListApi, 
  createRequirementApi, 
  updateRequirementApi, 
  deleteRequirementApi 
} from '@/api/requirement'
import { 
  getStagesApi, 
  createStageApi, 
  deleteStageApi 
} from '@/api/stage'
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

// 数据源
const tableData = ref([])
const dialogVisible = ref(false)
const isEdit = ref(false)
const requirementDateRange = ref([]) // 用于接收需求的起止时间

const form = ref({
  id: null,
  title: '',
  description: '',
  priority: 'MEDIUM',
  status: 'TODO',
  startDate: null,
  endDate: null
})

// 侧边抽屉状态与数据
const drawerVisible = ref(false)
const selectedRequirement = ref(null)
const stages = ref([])
const activeStageCollapse = ref('') 
const activeStageId = ref(null)

// 阶段内的下沉业务数据
const subTasks = ref([])
const discussions = ref([])
const subTaskForm = ref({ title: '', assignee: '' })
const newDiscussionContent = ref('')

// 新增阶段微型弹窗状态
const stageDialogVisible = ref(false)
const stageDateRange = ref([])
const stageForm = ref({
  title: '',
  startDate: null,
  endDate: null
})

// ----------------- 需求模块交互 -----------------

const loadRequirements = async () => {
  try {
    tableData.value = await getRequirementsListApi()
  } catch (error) {}
}

const openCreateDialog = () => {
  isEdit.value = false
  requirementDateRange.value = []
  form.value = { id: null, title: '', description: '', priority: 'MEDIUM', status: 'TODO', startDate: null, endDate: null }
  dialogVisible.value = true
}

const openEditDialog = (row) => {
  isEdit.value = true
  form.value = { ...row }
  if (row.startDate && row.endDate) {
    requirementDateRange.value = [row.startDate, row.endDate]
  } else {
    requirementDateRange.value = []
  }
  dialogVisible.value = true
}

const submitForm = async () => {
  if (!form.value.title.trim()) {
    ElMessage.warning('需求标题不能为空')
    return
  }
  
  if (requirementDateRange.value && requirementDateRange.value.length === 2) {
    form.value.startDate = requirementDateRange.value[0]
    form.value.endDate = requirementDateRange.value[1]
  } else {
    form.value.startDate = null
    form.value.endDate = null
  }

  try {
    if (isEdit.value) {
      await updateRequirementApi(form.value.id, form.value)
      ElMessage.success('需求更新成功')
    } else {
      await createRequirementApi(form.value)
      ElMessage.success('需求录入成功')
    }
    dialogVisible.value = false
    loadRequirements()
  } catch (error) {}
}

const handleDelete = (id) => {
  ElMessageBox.confirm('删除需求将同步清除所有子阶段及任务。是否继续？', '警告', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await deleteRequirementApi(id)
      ElMessage.success('删除成功')
      loadRequirements()
    } catch (error) {}
  }).catch(() => {})
}

// ----------------- 阶段模块交互 -----------------

const openDetailDrawer = async (row) => {
  selectedRequirement.value = row
  drawerVisible.value = true
  activeStageCollapse.value = ''
  activeStageId.value = null
  subTasks.value = []
  discussions.value = []
  await loadStages(row.id)
}

const loadStages = async (reqId) => {
  try {
    stages.value = await getStagesApi(reqId)
  } catch (error) {}
}

const openCreateStageDialog = () => {
  stageDateRange.value = []
  stageForm.value = { title: '', startDate: null, endDate: null }
  stageDialogVisible.value = true
}

const submitStageForm = async () => {
  if (!stageForm.value.title.trim()) {
    ElMessage.warning('请填写阶段名称')
    return
  }
  if (stageDateRange.value && stageDateRange.value.length === 2) {
    stageForm.value.startDate = stageDateRange.value[0]
    stageForm.value.endDate = stageDateRange.value[1]
  }
  try {
    await createStageApi({
      requirementId: selectedRequirement.value.id,
      title: stageForm.value.title,
      startDate: stageForm.value.startDate,
      endDate: stageForm.value.endDate
    })
    ElMessage.success('新阶段划分成功')
    stageDialogVisible.value = false
    loadStages(selectedRequirement.value.id)
  } catch (error) {}
}

const handleDeleteStage = (id) => {
  ElMessageBox.confirm('确定要移除此项执行阶段吗？该阶段下绑定的任务和进度将彻底清空。', '提示', {
    type: 'warning'
  }).then(async () => {
    await deleteStageApi(id)
    ElMessage.success('阶段已移除')
    if (activeStageId.value === id) {
      activeStageId.value = null
      activeStageCollapse.value = ''
    }
    loadStages(selectedRequirement.value.id)
  }).catch(() => {})
}

// 监听折叠面板展开变化，以此拉取具体阶段的“子任务”和“讨论跟进”
const handleStageCollapseChange = (activeId) => {
  if (activeId) {
    activeStageId.value = activeId
    subTaskForm.value = { title: '', assignee: '' }
    newDiscussionContent.value = ''
    loadStageSubTasks(activeId)
    loadStageDiscussions(activeId)
  } else {
    activeStageId.value = null
  }
}

// ----------------- 下沉：子任务逻辑 -----------------

const loadStageSubTasks = async (stageId) => {
  subTasks.value = await getSubTasksApi(stageId)
}

const handleAddSubTask = async () => {
  if (!subTaskForm.value.title.trim()) {
    ElMessage.warning('任务具体内容为必填项')
    return
  }
  try {
    await createSubTaskApi({
      stageId: activeStageId.value,
      title: subTaskForm.value.title,
      assignee: subTaskForm.value.assignee
    })
    ElMessage.success('子任务添加成功')
    subTaskForm.value = { title: '', assignee: '' }
    loadStageSubTasks(activeStageId.value)
  } catch (error) {}
}

const toggleSubTaskStatus = async (task) => {
  try {
    await updateSubTaskApi(task.id, task)
    ElMessage.success(task.isCompleted ? '任务已被标记为完成' : '任务标记为正在进行')
  } catch (error) {
    task.isCompleted = !task.isCompleted
  }
}

const handleDeleteSubTask = async (id) => {
  try {
    await deleteSubTaskApi(id)
    ElMessage.success('子任务已删除')
    loadStageSubTasks(activeStageId.value)
  } catch (error) {}
}

// ----------------- 下沉：推进讨论逻辑 -----------------

const loadStageDiscussions = async (stageId) => {
  discussions.value = await getDiscussionsApi(stageId)
}

const handlePostDiscussion = async () => {
  if (!newDiscussionContent.value.trim()) {
    ElMessage.warning('内容不可为空')
    return
  }
  try {
    await createDiscussionApi({
      stageId: activeStageId.value,
      content: newDiscussionContent.value
    })
    ElMessage.success('日志记录成功')
    newDiscussionContent.value = ''
    loadStageDiscussions(activeStageId.value)
  } catch (error) {}
}

// ----------------- 退出登录与样式标签匹配 -----------------

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

const getStageStatusTag = (s) => {
  if (s === 'DONE') return 'success'
  if (s === 'IN_PROGRESS') return 'warning'
  return 'info'
}

const formatTime = (timeStr) => {
  if (!timeStr) return ''
  const date = new Date(timeStr)
  return `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

onMounted(() => {
  loadRequirements()
})
</script>

<style scoped>
/* 后台管理骨架布局 */
.layout-wrapper {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

/* 左侧菜单栏 */
.sidebar {
  width: 240px;
  background-color: #001529;
  display: flex;
  flex-direction: column;
}
.brand {
  height: 60px;
  display: flex;
  align-items: center;
  padding: 0 20px;
  background-color: #002140;
}
.logo-icon {
  font-size: 22px;
  margin-right: 10px;
}
.logo-text {
  font-size: 18px;
  font-weight: bold;
  color: #ffffff;
  letter-spacing: 1px;
}
.sidebar-menu {
  border-right: none;
  flex: 1;
}

/* 右侧内容区域 */
.main-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: #f0f2f5;
  overflow: hidden;
}
.topbar {
  height: 60px;
  background-color: #ffffff;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
  border-bottom: 1px solid #e8e8e8;
}
.breadcrumb {
  font-size: 14px;
  color: #666;
}
.user-profile {
  font-size: 14px;
}

/* 主工作台配置 */
.workspace {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}
.content-card {
  background-color: #ffffff;
  border-radius: 4px;
  padding: 24px;
  box-shadow: 0 1px 4px rgba(0,21,41,.08);
}
.table-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.table-title {
  font-size: 16px;
  font-weight: bold;
  color: #333333;
}
.date-text {
  font-size: 13px;
  color: #606266;
}
.date-text-none {
  font-size: 13px;
  color: #c0c4cc;
  font-style: italic;
}

/* 抽屉布局深度定制 */
.drawer-scroll-box {
  padding: 0 10px;
}
.drawer-section {
  margin-bottom: 25px;
}
.section-flex-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}
.section-title {
  margin: 0;
  font-size: 15px;
  color: #333333;
  border-left: 4px solid #1890ff;
  padding-left: 10px;
}

/* 折叠面板定制 */
.stage-header-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding-right: 15px;
}
.stage-name {
  font-size: 14px;
  font-weight: bold;
  color: #303133;
}
.stage-summary-right {
  display: flex;
  align-items: center;
}
.stage-dates {
  font-size: 12px;
  color: #909399;
}

/* 阶段内展开区域 */
.stage-detail-container {
  padding: 10px 15px;
  background-color: #fafafa;
  border-radius: 4px;
}
.sub-block {
  margin-bottom: 15px;
}
.sub-block:last-child {
  margin-bottom: 0;
}
.block-title {
  font-size: 13px;
  font-weight: bold;
  color: #606266;
  margin-bottom: 10px;
}
.subtask-creator-row {
  display: flex;
  margin-bottom: 10px;
}
.subtask-box {
  background-color: #ffffff;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 8px 12px;
}
.subtask-item-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px dashed #f0f0f0;
}
.subtask-item-row:last-child {
  border-bottom: none;
}
.completed-line {
  text-decoration: line-through;
  color: #c0c4cc;
}
.item-right {
  display: flex;
  align-items: center;
}

/* 时间轴日志定制 */
.timeline-scroll-area {
  max-height: 200px;
  overflow-y: auto;
  padding: 5px 10px 5px 0;
  margin-bottom: 12px;
}
.timeline-log-bubble {
  background-color: #ffffff;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
  padding: 10px;
}
.bubble-text {
  margin: 0;
  font-size: 12px;
  line-height: 1.6;
}
.bubble-author {
  display: block;
  font-size: 11px;
  color: #909399;
  text-align: right;
  margin-top: 4px;
}
.poster-input-area {
  border-top: 1px solid #f0f0f0;
  padding-top: 10px;
}
</style>