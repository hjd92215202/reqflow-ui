<template>
  <div class="layout-wrapper">
    <!-- 左侧主侧边栏 -->
    <aside class="sidebar">
      <div class="brand">
        <span class="logo-icon">🌊</span>
        <span class="logo-text">ReqFlow</span>
      </div>
      <el-menu
        default-active="/matrix"
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
        <el-menu-item index="/matrix">
          <el-icon><Checked /></el-icon>
          <span>工作事项矩阵</span>
        </el-menu-item>
      </el-menu>
    </aside>

    <!-- 右侧工作面板 -->
    <div class="main-container">
      <header class="topbar">
        <div class="breadcrumb">项目控制台 / 工作事项矩阵</div>
        <div class="user-profile">
          <span>当前用户：<strong>{{ userStore.nickname }}</strong></span>
          <el-button type="danger" link @click="logout" style="margin-left: 15px;">退出登录</el-button>
        </div>
      </header>

      <!-- 矩阵主工作区 -->
      <main class="workbench-workspace">
        
        <!-- 1. 顶部需求工作表页签切换栏 -->
        <div class="requirement-selector-tabs">
          <span class="selector-label">切换协同工作表：</span>
          <div class="tab-list">
            <div 
              v-for="req in requirements" 
              :key="req.id" 
              :class="['tab-item', { active: activeReqId === req.id }]"
              @click="switchRequirement(req)"
            >
              <span class="tab-dot" :class="getPriorityClass(req.priority)"></span>
              <span class="tab-text">{{ req.title }}</span>
            </div>
          </div>
          <el-empty v-if="requirements.length === 0" description="暂无需求，请在“需求管理”中添加" :image-size="30" />
        </div>

        <!-- 2. 中部：协同矩阵板 -->
        <div class="matrix-board" v-if="selectedRequirement">
          <div class="board-top-info">
            <div>
              <h3 class="board-header-title">📋 {{ selectedRequirement.title }} · 阶段协同矩阵表</h3>
              <p class="board-header-desc" v-if="selectedRequirement.description">{{ selectedRequirement.description }}</p>
            </div>
            <el-button type="primary" size="small" @click="openCreateStageDialog">划分执行阶段</el-button>
          </div>

          <!-- 状态过滤控制栏 -->
          <div class="matrix-filter-row">
            <span class="filter-label">🔍 矩阵状态过滤：</span>
            <el-checkbox-group v-model="filterStatuses" size="small">
              <el-checkbox-button value="TODO">待处理</el-checkbox-button>
              <el-checkbox-button value="IN_PROGRESS">进行中</el-checkbox-button>
              <el-checkbox-button value="DONE">已完成</el-checkbox-button>
            </el-checkbox-group>
          </div>

          <!-- 纵向阶段区块列表 -->
          <div v-for="stage in stages" :key="stage.id" class="stage-table-block">
            
            <div class="stage-block-header">
              <div class="stage-title-left">
                <span class="block-stage-name">📍 {{ stage.title }}</span>
                <span class="block-stage-dates"> 排期：{{ stage.startDate || '未定' }} 至 {{ stage.endDate || '未定' }} </span>
              </div>
              <div class="stage-title-right">
                <el-radio-group v-model="stage.status" size="small" @change="handleStageStatusChange(stage)">
                  <el-radio-button value="TODO">待处理</el-radio-button>
                  <el-radio-button value="IN_PROGRESS">进行中</el-radio-button>
                  <el-radio-button value="DONE">已完成</el-radio-button>
                </el-radio-group>
                <el-button type="danger" link size="small" @click="handleDeleteStage(stage.id)" style="margin-left: 20px;">移除阶段</el-button>
              </div>
            </div>

            <!-- 树形 Excel 协同表格 -->
            <el-table 
              :data="getFilteredTasks(stage.id)" 
              border 
              row-key="id" 
              default-expand-all
              :tree-props="{ children: 'children' }"
              :indent="28"
              class="excel-table-style"
            >
              <!-- 1. 子任务核心标题（支持行内编辑 & 子项一键拆解） -->
              <el-table-column label="任务与子项内容 (双击编辑 / 回车保存)" min-width="260">
                <template #default="scope">
                  <div class="inline-edit-cell" @dblclick="scope.row.isEditingTitle = true">
                    <el-input 
                      v-if="scope.row.isEditingTitle" 
                      v-model="scope.row.title" 
                      size="small" 
                      @blur="finishTitleEdit(scope.row)"
                      @keyup.enter="finishTitleEdit(scope.row)"
                      v-focus
                    />
                    <span v-else :class="['cell-text', { 'completed-style': scope.row.status === 'DONE' }]">
                      {{ scope.row.title }}
                    </span>
                    <el-button 
                      class="add-sub-child-btn"
                      size="small" 
                      type="primary" 
                      link 
                      @click="openAddChildDialog(scope.row, stage.id)"
                    >
                      + 拆解子项
                    </el-button>
                  </div>
                </template>
              </el-table-column>

              <!-- 2. 状态列（支持行内下拉直接修改） -->
              <el-table-column label="状态" width="130" align="center">
                <template #default="scope">
                  <el-select 
                    v-model="scope.row.status" 
                    size="small" 
                    @change="saveSubTask(scope.row)"
                    style="width: 100%;"
                  >
                    <el-option label="待处理" value="TODO" />
                    <el-option label="进行中" value="IN_PROGRESS" />
                    <el-option label="已完成" value="DONE" />
                  </el-select>
                </template>
              </el-table-column>

              <!-- 3. 负责人（支持行内点击修改） -->
              <el-table-column label="负责人" width="120" align="center">
                <template #default="scope">
                  <div class="inline-edit-cell" @click="scope.row.isEditingAssignee = true">
                    <el-input 
                      v-if="scope.row.isEditingAssignee" 
                      v-model="scope.row.assignee" 
                      size="small" 
                      @blur="finishAssigneeEdit(scope.row)"
                      @keyup.enter="finishAssigneeEdit(scope.row)"
                      v-focus
                    />
                    <span v-else class="assignee-tag">👤 {{ scope.row.assignee || '未分配' }}</span>
                  </div>
                </template>
              </el-table-column>

              <!-- 4. 排期起止 -->
              <el-table-column label="起止排期" width="220" align="center">
                <template #default="scope">
                  <el-date-picker
                    v-model="scope.row.dateRange"
                    type="daterange"
                    range-separator="-"
                    start-placeholder="始"
                    end-placeholder="止"
                    size="small"
                    value-format="YYYY-MM-DD"
                    style="width: 100%;"
                    @change="handleSubTaskDateChange(scope.row)"
                  />
                </template>
              </el-table-column>

              <!-- 5. 任务专属属性配置（Notion 风格：单任务独立配置，千人千面） -->
              <el-table-column label="📋 任务属性标签 (点击可自由扩展配置)" min-width="210">
                <template #default="scope">
                  <el-popover
                    placement="top"
                    :width="320"
                    trigger="click"
                    @show="initPropertyForm"
                  >
                    <template #reference>
                      <div class="properties-preview-box">
                        <template v-if="hasProperties(scope.row.customFields)">
                          <el-tag 
                            v-for="(val, key) in scope.row.customFields" 
                            :key="key"
                            size="small"
                            type="info"
                            style="margin-right: 4px; margin-bottom: 4px;"
                          >
                            {{ key }}: {{ val }}
                          </el-tag>
                        </template>
                        <span v-else class="properties-placeholder">+ 属性扩展</span>
                      </div>
                    </template>
                    
                    <!-- 属性卡片工作台面板 -->
                    <div class="property-inspector">
                      <h4 class="inspector-title">📌 属性配置看板</h4>
                      
                      <!-- 已有属性列表 -->
                      <div class="existing-properties">
                        <div 
                          v-for="(val, key) in scope.row.customFields" 
                          :key="key" 
                          class="property-item-row"
                        >
                          <span class="prop-badge"><strong>{{ key }}</strong>: {{ val }}</span>
                          <el-button 
                            type="danger" 
                            link 
                            size="small" 
                            @click="removeProperty(scope.row, key)"
                          >
                            移除
                          </el-button>
                        </div>
                        <div v-if="!hasProperties(scope.row.customFields)" class="no-props-placeholder">
                          暂无独立标签属性，可在下方追加
                        </div>
                      </div>
                      
                      <!-- 快速新增自定义属性 -->
                      <div class="add-property-form">
                        <el-input 
                          v-model="newPropForm.key" 
                          placeholder="属性名(如: Bug数)" 
                          size="small" 
                          style="flex: 1.2; margin-right: 6px;"
                        />
                        <el-input 
                          v-model="newPropForm.value" 
                          placeholder="属性值(如: 3个)" 
                          size="small" 
                          style="flex: 1.5; margin-right: 6px;"
                        />
                        <el-button type="primary" size="small" @click="addProperty(scope.row)">添加</el-button>
                      </div>
                    </div>
                  </el-popover>
                </template>
              </el-table-column>

              <!-- 6. 进展备注日志（悬浮查看时间轴） -->
              <el-table-column label="最新进展备注" min-width="180">
                <template #default="scope">
                  <el-popover
                    placement="top"
                    :width="360"
                    trigger="hover"
                    @show="loadTimelineForTask(scope.row.id)"
                  >
                    <template #reference>
                      <span class="log-preview-text">💬 {{ scope.row.latestLog || '暂无跟进...悬浮追加' }}</span>
                    </template>
                    <div class="popover-timeline-container">
                      <h4 class="popover-timeline-title">📋 进展时间轴</h4>
                      <div class="popover-scroll-area">
                        <el-timeline v-if="taskTimelines[scope.row.id]?.length > 0">
                          <el-timeline-item
                            v-for="log in taskTimelines[scope.row.id]"
                            :key="log.id"
                            :timestamp="formatTime(log.createdAt)"
                            type="primary"
                          >
                            <p class="timeline-pop-text">{{ log.content }}</p>
                            <span class="timeline-pop-author">记录人: {{ log.user?.nickname }}</span>
                          </el-timeline-item>
                        </el-timeline>
                        <el-empty v-else description="暂无历史备注" :image-size="30" />
                      </div>
                      <div class="quick-post-row">
                        <el-input 
                          v-model="quickLogs[scope.row.id]" 
                          placeholder="追加备注..." 
                          size="small" 
                          style="flex: 1; margin-right: 8px;"
                        />
                        <el-button type="success" size="small" @click="submitQuickLog(scope.row)">提交</el-button>
                      </div>
                    </div>
                  </el-popover>
                </template>
              </el-table-column>

              <!-- 7. 操作 -->
              <el-table-column label="操作" width="70" align="center">
                <template #default="scope">
                  <el-button type="danger" link size="small" @click="handleDeleteSubTask(scope.row.id, stage.id)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>

            <!-- 每一阶段底部的快速录入 -->
            <div class="excel-quick-append-row">
              <span class="append-tag">➕ 添加行</span>
              <el-input v-model="stageAddForms[stage.id].title" placeholder="添加一级子任务..." size="small" style="flex: 2; margin-right: 12px;" />
              <el-input v-model="stageAddForms[stage.id].assignee" placeholder="负责人" size="small" style="flex: 0.8; margin-right: 12px;" />
              <el-button type="primary" size="small" @click="handleQuickAddSubTask(stage.id)">确定添加</el-button>
            </div>
          </div>

          <el-empty v-if="stages.length === 0" description="请先添加阶段以开展工作协作" :image-size="80" />
        </div>

        <!-- 3. 空白占位 -->
        <div class="empty-board-state" v-else>
          <el-empty description="选择上方一个工作协同表" :image-size="120" />
        </div>
      </main>
    </div>

    <!-- 弹窗1：划分新阶段 -->
    <el-dialog v-model="stageDialogVisible" title="划分新执行阶段" width="400px" append-to-body>
      <el-form :model="stageForm" label-width="80px">
        <el-form-item label="阶段名称" required>
          <el-input v-model="stageForm.title" placeholder="如：一期：架构评审与开发" />
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

    <!-- 弹窗2：拆解子项模态窗 -->
    <el-dialog v-model="childTaskDialogVisible" title="拆解微观子项" width="400px" append-to-body>
      <el-form :model="childTaskForm" label-width="80px">
        <el-form-item label="子项标题" required>
          <el-input v-model="childTaskForm.title" placeholder="请输入子任务的具体内容" />
        </el-form-item>
        <el-form-item label="负责人">
          <el-input v-model="childTaskForm.assignee" placeholder="请输入负责人姓名" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="childTaskDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitChildTask">确定拆解</el-button>
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
import { getStagesApi, createStageApi, updateStageApi, deleteStageApi } from '@/api/stage'
import { getSubTasksApi, createSubTaskApi, updateSubTaskApi, deleteSubTaskApi } from '@/api/subtask'
import { getDiscussionsApi, createDiscussionApi } from '@/api/discussion'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

// 数据源
const requirements = ref([])
const activeReqId = ref(null)
const selectedRequirement = ref(null)
const stages = ref([])

// 状态映射绑定
const stageSubTasks = ref({})
const stageAddForms = ref({})
const taskTimelines = ref({})
const quickLogs = ref({})

// 状态过滤绑定，默认全选
const filterStatuses = ref(['TODO', 'IN_PROGRESS', 'DONE'])

// 行内属性配置新表单
const newPropForm = ref({ key: '', value: '' })

// 阶段、子树弹窗
const stageDialogVisible = ref(false)
const stageDateRange = ref([])
const stageForm = ref({ title: '', startDate: null, endDate: null })

const childTaskDialogVisible = ref(false)
const selectedParentRow = ref(null)
const selectedParentStageId = ref(null)
const childTaskForm = ref({ title: '', assignee: '' })

// 自动聚焦指令
const vFocus = {
  mounted: (el) => {
    const input = el.querySelector('input')
    if (input) input.focus()
  }
}

// 扁平数组转化为树形网格的算法
const arrayToTree = (list) => {
  const map = {}, roots = [];
  for (let i = 0; i < list.length; i++) {
    map[list[i].id] = i;
    list[i].children = [];
  }
  for (let i = 0; i < list.length; i++) {
    const node = list[i];
    // 关键兼容：同时适配驼峰 parentId 和下划线 parent_id
    const pId = node.parentId !== undefined ? node.parentId : node.parent_id;
    if (pId) {
      const parentIndex = map[pId];
      if (parentIndex !== undefined) {
        list[parentIndex].children.push(node);
      } else {
        roots.push(node);
      }
    } else {
      roots.push(node);
    }
  }
  return roots;
}

// 递归寻找并更新本地真实数据源中的对应节点属性（核心！解决克隆数据不修改真实响应式对象的Bug）
const updateOriginalNode = (nodes, updatedNode) => {
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].id === updatedNode.id) {
      nodes[i].status = updatedNode.status
      nodes[i].title = updatedNode.title
      nodes[i].assignee = updatedNode.assignee
      nodes[i].startDate = updatedNode.startDate
      nodes[i].endDate = updatedNode.endDate
      nodes[i].customFields = { ...updatedNode.customFields }
      return true
    }
    if (nodes[i].children && nodes[i].children.length > 0) {
      const found = updateOriginalNode(nodes[i].children, updatedNode)
      if (found) return true
    }
  }
  return false
}

// 树形递归剪枝过滤算法
const filterTreeData = (nodes, allowedStatuses) => {
  if (!allowedStatuses || allowedStatuses.length === 0) {
    return []
  }
  const result = []
  for (const node of nodes) {
    const clonedNode = { ...node, children: [] }
    
    if (node.children && node.children.length > 0) {
      clonedNode.children = filterTreeData(node.children, allowedStatuses)
    }
    
    const isCurrentMatch = allowedStatuses.includes(node.status)
    const hasMatchingChildren = clonedNode.children.length > 0
    
    if (isCurrentMatch || hasMatchingChildren) {
      result.push(clonedNode)
    }
  }
  return result
}

// 供表格绑定的过滤计算方法
const getFilteredTasks = (stageId) => {
  const originalTree = stageSubTasks.value[stageId] || []
  if (filterStatuses.value.length === 3) {
    return originalTree
  }
  return filterTreeData(originalTree, filterStatuses.value)
}

const loadRequirements = async () => {
  try {
    requirements.value = await getRequirementsListApi()
  } catch (error) {}
}

const switchRequirement = async (req) => {
  selectedRequirement.value = req
  activeReqId.value = req.id
  await loadStages(req.id)
}

const loadStages = async (reqId) => {
  try {
    const stageList = await getStagesApi(reqId)
    stages.value = stageList
    stageList.forEach(async (stage) => {
      stageAddForms.value[stage.id] = { title: '', assignee: '' }
      await loadSubTasks(stage.id)
    })
  } catch (error) {}
}

const loadSubTasks = async (stageId) => {
  const flatTaskList = await getSubTasksApi(stageId)
  
  for (let task of flatTaskList) {
    task.isEditingTitle = false
    task.isEditingAssignee = false
    task.dateRange = (task.startDate && task.endDate) ? [task.startDate, task.endDate] : []
    
    if (!task.customFields) {
      task.customFields = {}
    }

    const discussions = await getDiscussionsApi(task.id)
    task.latestLog = (discussions && discussions.length > 0) ? discussions[discussions.length - 1].content : ''
  }

  stageSubTasks.value[stageId] = arrayToTree(flatTaskList)
}

// ----------------- 行内编辑 Excel 操作 -----------------

const finishTitleEdit = async (row) => {
  row.isEditingTitle = false
  if (!row.title.trim()) return
  await saveSubTask(row)
}

const finishAssigneeEdit = async (row) => {
  row.isEditingAssignee = false
  await saveSubTask(row)
}

const handleSubTaskDateChange = async (row) => {
  if (row.dateRange && row.dateRange.length === 2) {
    row.startDate = row.dateRange[0]
    row.endDate = row.dateRange[1]
  } else {
    row.startDate = null
    row.endDate = null
  }
  await saveSubTask(row)
}

const saveSubTask = async (row) => {
  try {
    // 异步前先写入真实源对象
    const originalList = stageSubTasks.value[row.stageId] || []
    updateOriginalNode(originalList, row)

    const updatePayload = {
      id: row.id,
      stageId: row.stageId,
      parentId: row.parentId,
      parent_id: row.parentId || row.parent_id, // 双保障命名机制
      title: row.title,
      assignee: row.assignee,
      status: row.status,
      startDate: row.startDate,
      endDate: row.endDate,
      customFields: row.customFields
    }
    
    await updateSubTaskApi(row.id, updatePayload)
    ElMessage.success('保存成功')
  } catch (error) {
    await loadSubTasks(row.stageId)
  }
}

// ----------------- 原地极速追加微观子项 -----------------

const openAddChildDialog = (row, stageId) => {
  selectedParentRow.value = row
  selectedParentStageId.value = stageId
  childTaskForm.value = { title: '', assignee: '' }
  childTaskDialogVisible.value = true
}

const submitChildTask = async () => {
  if (!childTaskForm.value.title.trim()) {
    ElMessage.warning('子项内容不可为空')
    return
  }
  try {
    await createSubTaskApi({
      stageId: selectedParentStageId.value,
      parentId: selectedParentRow.value.id,
      parent_id: selectedParentRow.value.id, // 双向匹配防丢失
      title: childTaskForm.value.title,
      assignee: childTaskForm.value.assignee,
      status: 'TODO'
    })
    ElMessage.success('子项拆解成功')
    childTaskDialogVisible.value = false
    loadSubTasks(selectedParentStageId.value)
  } catch (error) {}
}

// ----------------- 日志时间轴跟进 -----------------

const loadTimelineForTask = async (taskId) => {
  taskTimelines.value[taskId] = await getDiscussionsApi(taskId)
  if (!quickLogs.value[taskId]) {
    quickLogs.value[taskId] = ''
  }
}

const submitQuickLog = async (row) => {
  const text = quickLogs.value[row.id]
  if (!text || !text.trim()) return
  try {
    await createDiscussionApi({
      stageId: row.id,
      content: text
    })
    ElMessage.success('进展提交成功')
    quickLogs.value[row.id] = ''
    await loadTimelineForTask(row.id)
    row.latestLog = text
  } catch (error) {}
}

// ----------------- 快速新任务追加 -----------------

const handleQuickAddSubTask = async (stageId) => {
  const addForm = stageAddForms.value[stageId]
  if (!addForm.title.trim()) {
    ElMessage.warning('任务名称不可为空')
    return
  }
  try {
    await createSubTaskApi({
      stageId: stageId,
      title: addForm.title,
      assignee: addForm.assignee,
      status: 'TODO'
    })
    ElMessage.success('任务录入完成')
    stageAddForms.value[stageId] = { title: '', assignee: '' }
    loadSubTasks(stageId)
  } catch (error) {}
}

const handleDeleteSubTask = (id, stageId) => {
  ElMessageBox.confirm('移除该项将同步删除其所有子拆解项，是否继续？', '提示', {
    type: 'warning'
  }).then(async () => {
    await deleteSubTaskApi(id)
    ElMessage.success('删除成功')
    loadSubTasks(stageId)
  }).catch(() => {})
}

// ----------------- 阶段状态及添加 -----------------

const handleStageStatusChange = async (stage) => {
  try {
    await updateStageApi(stage.id, stage)
    ElMessage.success(`阶段状态已更新: ${stage.status}`)
  } catch (error) {}
}

const openCreateStageDialog = () => {
  stageDateRange.value = []
  stageForm.value = { title: '', startDate: null, endDate: null }
  stageDialogVisible.value = true
}

const submitStageForm = async () => {
  if (!stageForm.value.title.trim()) return
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
    ElMessage.success('阶段划分成功')
    stageDialogVisible.value = false
    loadStages(selectedRequirement.value.id)
  } catch (error) {}
}

const handleDeleteStage = (id) => {
  ElMessageBox.confirm('确定要移除此执行阶段吗？该阶段下的任务将同步清除。', '警告', {
    confirmButtonText: '确定移除',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    await deleteStageApi(id)
    ElMessage.success('阶段已被移除')
    loadStages(selectedRequirement.value.id)
  }).catch(() => {})
}

// ----------------- 高级 Notion 属性卡片业务逻辑 -----------------

const initPropertyForm = () => {
  newPropForm.value = { key: '', value: '' }
}

const hasProperties = (customFields) => {
  return customFields && Object.keys(customFields).length > 0
}

const addProperty = async (row) => {
  const k = newPropForm.value.key.trim()
  const v = newPropForm.value.value.trim()
  if (!k || !v) {
    ElMessage.warning('请填写完整的键与值')
    return
  }
  if (!row.customFields) {
    row.customFields = {}
  }
  row.customFields[k] = v // 写入
  initPropertyForm()
  await saveSubTask(row) // 持久化
}

const removeProperty = async (row, key) => {
  if (row.customFields && row.customFields[key] !== undefined) {
    delete row.customFields[key]
    await saveSubTask(row)
  }
}

const logout = () => {
  userStore.clearUserInfo()
  router.push('/login')
}

const getPriorityClass = (p) => {
  if (p === 'HIGH') return 'dot-high'
  if (p === 'MEDIUM') return 'dot-medium'
  return 'dot-low'
}

const formatTime = (timeStr) => {
  if (!timeStr) return ''
  const date = new Date(timeStr)
  return `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const getStageStatusTag = (s) => {
  if (s === 'DONE') return 'success'
  if (s === 'IN_PROGRESS') return 'warning'
  return 'info'
}

onMounted(async () => {
  await loadRequirements()
  const queryReqId = route.query.reqId
  if (queryReqId) {
    const target = requirements.value.find(r => r.id === Number(queryReqId))
    if (target) {
      switchRequirement(target)
    }
  } else if (requirements.value.length > 0) {
    switchRequirement(requirements.value[0])
  }
})
</script>

<style scoped>
.layout-wrapper {
  display: flex;
  height: 100vh;
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
}
.breadcrumb {
  font-size: 14px;
  color: #666;
}

.workbench-workspace {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.requirement-selector-tabs {
  background-color: #ffffff;
  border-radius: 4px;
  padding: 12px 20px;
  box-shadow: 0 1px 4px rgba(0,21,41,.05);
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  flex-shrink: 0;
}
.selector-label {
  font-size: 13px;
  font-weight: bold;
  color: #606266;
  margin-right: 15px;
  flex-shrink: 0;
}
.tab-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.tab-item {
  display: flex;
  align-items: center;
  padding: 6px 14px;
  border-radius: 20px;
  border: 1px solid #dcdfe6;
  background-color: #fafafa;
  cursor: pointer;
  transition: all 0.2s ease;
}
.tab-item:hover {
  border-color: #409eff;
  background-color: #f0f7ff;
}
.tab-item.active {
  background-color: #ecf5ff;
  border-color: #409eff;
  color: #409eff;
  font-weight: bold;
}
.tab-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 8px;
}
.dot-high { background-color: #f56c6c; }
.dot-medium { background-color: #e6a23c; }
.dot-low { background-color: #909399; }

.matrix-board {
  background-color: #ffffff;
  border-radius: 4px;
  padding: 24px;
  box-shadow: 0 1px 4px rgba(0,21,41,.08);
}
.board-top-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.board-header-title {
  margin: 0;
  font-size: 16px;
  color: #303133;
}
.board-header-desc {
  margin: 6px 0 0 0;
  font-size: 12px;
  color: #909399;
}
.top-action-bar {
  display: flex;
  gap: 10px;
}

.matrix-filter-row {
  margin-top: 15px;
  background-color: #f8f9fa;
  padding: 10px 16px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  border: 1px dashed #e4e7ed;
}
.filter-label {
  font-size: 13px;
  font-weight: bold;
  color: #606266;
}

.stage-table-block {
  margin-top: 25px;
  border: 1px solid #ebeef5;
  border-radius: 6px;
  overflow: hidden;
}
.stage-block-header {
  height: 48px;
  background-color: #f5f7fa;
  border-bottom: 1px solid #ebeef5;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 16px;
}
.block-stage-name {
  font-size: 14px;
  font-weight: bold;
  color: #303133;
}
.block-stage-dates {
  font-size: 12px;
  color: #909399;
  margin-left: 12px;
}
.stage-title-right {
  display: flex;
  align-items: center;
}

.excel-table-style :deep(.el-table__row) {
  cursor: cell;
}
.excel-table-style :deep(.cell) {
  padding: 0 10px;
}

/* 核心修复：防止树形首列的单元格内容换行，强力保证排期、缩进与文字在同一水平线上 */
.excel-table-style :deep(.el-table__row) td:first-child .cell {
  display: flex !important;
  align-items: center !important;
  flex-wrap: nowrap !important;
}

.inline-edit-cell {
  min-height: 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: 1;
  overflow: hidden;
  width: 100%;
}
.add-sub-child-btn {
  visibility: hidden;
  font-size: 11px;
  margin-left: 10px;
}
.inline-edit-cell:hover .add-sub-child-btn {
  visibility: visible;
}
.cell-text {
  font-size: 13px;
  color: #303133;
  width: 100%;
}
.completed-style {
  text-decoration: line-through;
  color: #c0c4cc;
}
.assignee-tag {
  font-size: 12px;
  background-color: #f4f4f5;
  border: 1px solid #e9e9eb;
  padding: 2px 8px;
  border-radius: 12px;
  color: #909399;
}

.log-preview-text {
  cursor: help;
  font-size: 12px;
  color: #606266;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  display: inline-block;
}

.popover-timeline-container {
  padding: 5px;
}
.popover-timeline-title {
  margin: 0 0 10px 0;
  font-size: 13px;
  color: #333;
  border-bottom: 1.5px solid #ebeef5;
  padding-bottom: 6px;
}
.popover-scroll-area {
  max-height: 180px;
  overflow-y: auto;
  padding-right: 5px;
  margin-bottom: 12px;
}
.timeline-pop-text {
  margin: 0;
  font-size: 11px;
  line-height: 1.5;
}
.timeline-pop-author {
  display: block;
  font-size: 10px;
  color: #909399;
  text-align: right;
  margin-top: 3px;
}
.quick-post-row {
  display: flex;
  border-top: 1px solid #ebeef5;
  padding-top: 10px;
}

.excel-quick-append-row {
  height: 42px;
  background-color: #ffffff;
  border-top: 1px solid #ebeef5;
  display: flex;
  align-items: center;
  padding: 0 15px;
}
.append-tag {
  font-size: 12px;
  color: #409eff;
  font-weight: bold;
  margin-right: 15px;
  flex-shrink: 0;
}

.empty-board-state {
  flex: 1;
  background-color: #ffffff;
  border-radius: 4px;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 1px 4px rgba(0,21,41,.08);
}

/* 1. 强力保证：树形表格每一级子节点的缩进间距（防止行内样式被覆盖） */
.excel-table-style :deep(.el-table__row--level-1) .el-table__indent {
  padding-left: 32px !important; 
}
.excel-table-style :deep(.el-table__row--level-2) .el-table__indent {
  padding-left: 64px !important; 
}

/* 2. 视觉降级：让二级子项的文字颜色和大小稍微柔和，突出层级关系 */
.excel-table-style :deep(.el-table__row--level-1) .cell-text {
  color: #606266 !important; 
  font-size: 12.5px;
}
.excel-table-style :deep(.el-table__row--level-1) .assignee-tag {
  opacity: 0.85; 
}

/* Notion 属性标签预览框美化 */
.properties-preview-box {
  cursor: pointer;
  min-height: 28px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  width: 100%;
  padding: 2px 0;
}
.properties-placeholder {
  font-size: 11px;
  color: #c0c4cc;
  font-style: italic;
}

/* 弹出气泡属性编辑器 */
.property-inspector {
  padding: 5px;
}
.inspector-title {
  margin: 0 0 10px 0;
  font-size: 13px;
  color: #333;
  border-bottom: 1.5px solid #ebeef5;
  padding-bottom: 6px;
}
.existing-properties {
  max-height: 150px;
  overflow-y: auto;
  margin-bottom: 12px;
}
.property-item-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
  border-bottom: 1px dashed #f0f0f0;
}
.property-item-row:last-child {
  border-bottom: none;
}
.prop-badge {
  font-size: 12px;
  color: #606266;
}
.no-props-placeholder {
  font-size: 11px;
  color: #c0c4cc;
  text-align: center;
  padding: 10px 0;
}
.add-property-form {
  display: flex;
  border-top: 1px solid #ebeef5;
  padding-top: 10px;
}
</style>