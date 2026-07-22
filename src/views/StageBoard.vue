<template>
  <div class="layout-wrapper">
    <!-- 左侧一级导航菜单 -->
    <aside class="sidebar">
      <div class="brand">
        <span class="logo-icon">🌊</span>
        <span class="logo-text">ReqFlow</span>
      </div>
      <el-menu
        default-active="/stages"
        class="sidebar-menu"
        background-color="#001529"
        text-color="#a6adb4"
        active-text-color="#ffffff"
        router
      >
        <el-menu-item index="/requirements">
          <el-icon><Menu /></el-icon>
          <span>需求事项管理</span>
        </el-menu-item>
        <el-menu-item index="/stages">
          <el-icon><Checked /></el-icon>
          <span>阶段执行看板</span>
        </el-menu-item>
      </el-menu>
    </aside>

    <!-- 右侧工作面板：二级分栏架构 -->
    <div class="main-container">
      <header class="topbar">
        <div class="breadcrumb">项目控制台 / 阶段执行看板</div>
        <div class="user-profile">
          <span>当前用户：<strong>{{ userStore.nickname }}</strong></span>
          <el-button type="danger" link @click="logout" style="margin-left: 15px;">退出登录</el-button>
        </div>
      </header>

      <div class="workbench-body">
        <!-- 二级侧边栏：需求快速选择列表 -->
        <div class="workbench-sub-aside">
          <div class="sub-aside-header">需求事项选择</div>
          <div class="sub-aside-list">
            <div 
              v-for="req in requirementsList" 
              :key="req.id" 
              :class="['req-item-card', { active: selectedRequirement?.id === req.id }]"
              @click="handleSelectRequirement(req)"
            >
              <div class="req-card-title">{{ req.title }}</div>
              <div class="req-card-meta">
                <el-tag size="small" :type="getPriorityTag(req.priority)">{{ req.priority }}</el-tag>
                <span class="meta-date" v-if="req.endDate">截至: {{ req.endDate }}</span>
              </div>
            </div>
            <el-empty v-if="requirementsList.length === 0" description="暂无可用需求，请先录入" :image-size="40" />
          </div>
        </div>

        <!-- 主内容区：阶段看板细节执行 -->
        <main class="workbench-main">
          <div class="board-card" v-if="selectedRequirement">
            <div class="board-header">
              <div>
                <span class="board-title">【执行跟进】{{ selectedRequirement.title }}</span>
                <p class="board-desc" v-if="selectedRequirement.description">{{ selectedRequirement.description }}</p>
              </div>
              <el-button type="primary" size="default" @click="openCreateStageDialog">划分执行阶段</el-button>
            </div>

            <el-divider style="margin: 15px 0;" />

            <!-- 阶段折叠面板 -->
            <el-collapse v-model="activeStageCollapse" accordion @change="handleStageCollapseChange">
              <el-collapse-item v-for="stage in stages" :key="stage.id" :name="stage.id">
                <template #title>
                  <div class="stage-header-bar">
                    <span class="stage-name">{{ stage.title }}</span>
                    <div class="stage-summary-right">
                      <span class="stage-dates">📅 {{ stage.startDate || '未定' }} 至 {{ stage.endDate || '未定' }}</span>
                      <el-tag :type="getStageStatusTag(stage.status)" size="small" style="margin-left: 10px;">{{ stage.status }}</el-tag>
                      <el-button type="danger" link size="small" @click.stop="handleDeleteStage(stage.id)" style="margin-left: 15px;">移除</el-button>
                    </div>
                  </div>
                </template>

                <!-- 双栏横向展开布局 -->
                <div class="stage-detail-container" v-if="activeStageId === stage.id">
                  <el-row :gutter="24">
                    <!-- 左半：子任务 -->
                    <el-col :span="12" class="border-right-divider">
                      <div class="sub-block">
                        <div class="block-title">📋 阶段内子任务拆解</div>
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
                    </el-col>

                    <!-- 右半：推进日志时间轴 -->
                    <el-col :span="12">
                      <div class="sub-block">
                        <div class="block-title">🕒 阶段推进日志时间轴</div>
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
                            placeholder="录入本阶段最新的进展备注..." 
                            size="small"
                          />
                          <el-button type="success" size="small" style="margin-top: 8px; float: right;" @click="handlePostDiscussion">提交进展</el-button>
                        </div>
                      </div>
                    </el-col>
                  </el-row>
                </div>
              </el-collapse-item>
            </el-collapse>
            <el-empty v-if="stages.length === 0" description="请先添加阶段（例如：原型设计、研发编码、联合调试等）" :image-size="60" />
          </div>

          <!-- 未选择需求的占位状态 -->
          <div class="empty-board-state" v-else>
            <el-empty description="请在左侧选择一个需求事项以开展跟进执行阶段" :image-size="120" />
          </div>
        </main>
      </div>
    </div>

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
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/store/user'
import { Menu, Checked } from '@element-plus/icons-vue'
import { getRequirementsListApi } from '@/api/requirement'
import { getStagesApi, createStageApi, deleteStageApi } from '@/api/stage'
import { getSubTasksApi, createSubTaskApi, updateSubTaskApi, deleteSubTaskApi } from '@/api/subtask'
import { getDiscussionsApi, createDiscussionApi } from '@/api/discussion'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

// 需求数据列表
const requirementsList = ref([])
const selectedRequirement = ref(null)

// 阶段与下沉跟进数据
const stages = ref([])
const activeStageCollapse = ref('')
const activeStageId = ref(null)

const subTasks = ref([])
const discussions = ref([])
const subTaskForm = ref({ title: '', assignee: '' })
const newDiscussionContent = ref('')

// 新增阶段弹窗状态
const stageDialogVisible = ref(false)
const stageDateRange = ref([])
const stageForm = ref({ title: '', startDate: null, endDate: null })

const loadRequirements = async () => {
  try {
    requirementsList.value = await getRequirementsListApi()
  } catch (error) {}
}

const handleSelectRequirement = async (req) => {
  selectedRequirement.value = req
  activeStageCollapse.value = ''
  activeStageId.value = null
  subTasks.value = []
  discussions.value = []
  await loadStages(req.id)
}

const loadStages = async (reqId) => {
  stages.value = await getStagesApi(reqId)
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
  ElMessageBox.confirm('移除阶段后，该阶段下的子任务和日志也将被同步清空。确定吗？', '提示', {
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

// 子任务逻辑
const loadStageSubTasks = async (stageId) => {
  subTasks.value = await getSubTasksApi(stageId)
}

const handleAddSubTask = async () => {
  if (!subTaskForm.value.title.trim()) {
    ElMessage.warning('任务内容不能为空')
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

// 推进日志日志
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

const logout = () => {
  userStore.clearUserInfo()
  router.push('/login')
}

const getPriorityTag = (p) => {
  if (p === 'HIGH') return 'danger'
  if (p === 'MEDIUM') return 'warning'
  return 'info'
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

onMounted(async () => {
  await loadRequirements()
  // 检测路由中是否携带有 reqId 传参，若有，自动高亮并加载该需求数据
  const queryReqId = route.query.reqId
  if (queryReqId) {
    const target = requirementsList.value.find(r => r.id === Number(queryReqId))
    if (target) {
      handleSelectRequirement(target)
    }
  }
})
</script>

<style scoped>
/* 骨架与一级分栏配置 */
.layout-wrapper {
  display: flex;
  height: 100%;
  overflow: hidden;
}
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
}
.sidebar-menu {
  border-right: none;
  flex: 1;
}

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
  flex-shrink: 0;
}
.breadcrumb {
  font-size: 14px;
  color: #666;
}
.user-profile {
  font-size: 14px;
}

/* 核心工作台：二级分栏布局 */
.workbench-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

/* 二级侧边：需求列表 */
.workbench-sub-aside {
  width: 280px;
  background-color: #ffffff;
  border-right: 1px solid #e8e8e8;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}
.sub-aside-header {
  height: 50px;
  line-height: 50px;
  padding: 0 16px;
  font-weight: bold;
  font-size: 14px;
  color: #333333;
  border-bottom: 1px solid #f0f0f0;
}
.sub-aside-list {
  flex: 1;
  padding: 12px;
  overflow-y: auto;
}
.req-item-card {
  padding: 12px;
  border-radius: 4px;
  border: 1px solid #e8e8e8;
  margin-bottom: 10px;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
}
.req-item-card:hover {
  border-color: #409eff;
  background-color: #f0f7ff;
}
.req-item-card.active {
  border-color: #409eff;
  background-color: #ecf5ff;
}
.req-card-title {
  font-size: 13px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.req-card-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.meta-date {
  font-size: 11px;
  color: #909399;
}

/* 右侧主工作区：看板 */
.workbench-main {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}
.board-card {
  background-color: #ffffff;
  border-radius: 4px;
  padding: 24px;
  box-shadow: 0 1px 4px rgba(0,21,41,.08);
  min-height: 100%;
}
.board-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}
.board-title {
  font-size: 18px;
  font-weight: bold;
  color: #303133;
}
.board-desc {
  margin: 6px 0 0 0;
  font-size: 13px;
  color: #909399;
}

/* 折叠面板头部自定义 */
.stage-header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding-right: 15px;
}
.stage-name {
  font-size: 14px;
  font-weight: bold;
}
.stage-summary-right {
  display: flex;
  align-items: center;
}
.stage-dates {
  font-size: 12px;
  color: #909399;
}

/* 展开区域样式（1:1 双栏网格） */
.stage-detail-container {
  padding: 15px 20px;
  background-color: #fafafa;
  border-radius: 4px;
}
.border-right-divider {
  border-right: 1px dashed #e8e8e8;
}
.sub-block {
  margin-bottom: 5px;
}
.block-title {
  font-size: 13px;
  font-weight: bold;
  color: #606266;
  margin-bottom: 12px;
  border-bottom: 1.5px solid #e8e8e8;
  padding-bottom: 6px;
}
.subtask-creator-row {
  display: flex;
  margin-bottom: 12px;
}
.subtask-box {
  background-color: #ffffff;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 8px 12px;
  max-height: 200px;
  overflow-y: auto;
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

/* 时间轴 */
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
  padding: 8px 12px;
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
  padding-top: 12px;
}

/* 占位空状态样式 */
.empty-board-state {
  flex: 1;
  background-color: #ffffff;
  border-radius: 4px;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 1px 4px rgba(0,21,41,.08);
}
</style>