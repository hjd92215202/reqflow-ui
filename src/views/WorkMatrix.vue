<template>
  <div class="layout-wrapper">
    <!-- 左侧主侧边栏 (支持动态折叠与过渡动画) -->
    <aside class="sidebar">
      <!-- 优化：增加 :class 状态控制，解决折叠后内容挤压问题 -->
      <div class="brand" :class="{ 'collapsed': isCollapsed }">
        <span v-if="!isCollapsed" class="logo-text">🌊 ReqFlow</span>
        <!-- 菜单折叠切换按钮 -->
        <el-button 
          type="text" 
          @click="isCollapsed = !isCollapsed" 
          class="collapse-toggle-btn"
        >
          <el-icon>
            <Expand v-if="isCollapsed" />
            <Fold v-else />
          </el-icon>
        </el-button>
      </div>
      
      <el-menu
        default-active="/matrix"
        class="sidebar-menu"
        background-color="#001529"
        text-color="#a6adb4"
        active-text-color="#ffffff"
        :collapse="isCollapsed"
        :collapse-transition="false"
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

      <!-- 底部用户信息及退出 (下放到侧边栏底部，自适应折叠状态) -->
      <div class="sidebar-user-footer" :class="{ 'collapsed': isCollapsed }">
        <div class="user-info-text">
          <span class="user-avatar">👤</span>
          <span v-if="!isCollapsed" class="user-name">{{ userStore.nickname }}</span>
        </div>
        <el-button 
          type="danger" 
          link 
          size="small" 
          @click="logout"
          class="logout-btn"
        >
          <el-icon><SwitchButton /></el-icon>
          <span v-if="!isCollapsed" style="margin-left: 6px;">退出登录</span>
        </el-button>
      </div>
    </aside>

    <!-- 右侧工作面板 -->
    <div class="main-container">
      <!-- 矩阵主工作区 -->
      <main class="workbench-workspace">
        <!-- 核心协同矩阵板 -->
        <div class="matrix-board" v-if="selectedRequirement">
          <div class="board-top-info">
            <div>
              <h3 class="board-header-title">📋 {{ selectedRequirement.title }} · 阶段协同矩阵表</h3>
              <p class="board-header-desc" v-if="selectedRequirement.description">{{ selectedRequirement.description }}</p>
            </div>
            <div class="top-action-bar">
              <!-- 执行阶段切换下拉选项 -->
              <el-select 
                v-model="activeStageId" 
                placeholder="切换执行阶段" 
                size="small" 
                style="width: 180px;"
                @change="handleStageChange"
              >
                <el-option v-for="s in stages" :key="s.id" :label="s.title" :value="s.id" />
              </el-select>
              <el-button type="primary" size="small" @click="openCreateStageDialog">划分执行阶段</el-button>
            </div>
          </div>

          <!-- 核心：一屏只专注展示当前激活的阶段大表 -->
          <div v-if="activeStage" class="stage-table-block" style="margin-top: 20px;">
            
            <div class="stage-block-header">
              <div class="stage-title-left">
                <span class="block-stage-name">📍 当前执行阶段：{{ activeStage.title }}</span>
                <span class="block-stage-dates"> 排期：{{ activeStage.startDate || '未定' }} 至 {{ activeStage.endDate || '未定' }} </span>
              </div>
              <div class="stage-title-right">
                <el-radio-group v-model="activeStage.status" size="small" @change="handleStageStatusChange(activeStage)">
                  <el-radio-button value="TODO">待处理</el-radio-button>
                  <el-radio-button value="IN_PROGRESS">进行中</el-radio-button>
                  <el-radio-button value="DONE">已完成</el-radio-button>
                </el-radio-group>
                <el-button type="danger" link size="small" @click="handleDeleteStage(activeStage.id)" style="margin-left: 20px;">移除阶段</el-button>
              </div>
            </div>

            <!-- 树形 Excel 协同表格 -->
            <el-table 
              :data="getFilteredTasks(activeStage.id)" 
              border 
              row-key="id" 
              default-expand-all
              :tree-props="{ children: 'children' }"
              :indent="28"
              class="excel-table-style"
              @filter-change="handleFilterChange"
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
                      @click="openAddChildDialog(scope.row, activeStage.id)"
                    >
                      + 拆解子项
                    </el-button>
                  </div>
                </template>
              </el-table-column>

              <!-- 2. 状态列（已移回：直接集成表头过滤器 & 内部级联递归筛选） -->
              <el-table-column 
                label="状态" 
                width="130" 
                align="center"
                column-key="status"
                :filters="[{ text: '待处理', value: 'TODO' }, { text: '进行中', value: 'IN_PROGRESS' }, { text: '已完成', value: 'DONE' }]"
              >
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

              <!-- 3. 负责人列（支持表头过滤器） -->
              <el-table-column 
                label="负责人" 
                width="135" 
                align="center"
                column-key="assignee"
                :filters="getAssigneeFilters(activeStage.id)"
              >
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

              <!-- 5. 属性标签列 -->
              <el-table-column label="🏷️ 属性标签 (点击可原地扩展任意键值)" width="180" align="center">
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
                          <el-tag size="small" type="info" style="cursor:pointer;">
                            ⚙️ {{ Object.keys(scope.row.customFields).length }}个扩展值
                          </el-tag>
                        </template>
                        <span v-else class="properties-placeholder">+ 属性扩展</span>
                      </div>
                    </template>
                    
                    <!-- 原地属性标签卡片面板 -->
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

              <!-- 6. 自动扫描渲染列（集成列头下拉过滤） -->
              <el-table-column 
                v-for="key in detectedColumnKeys[activeStage.id] || []" 
                :key="key" 
                :column-key="key"
                min-width="140"
                :filters="getCustomColumnFilters(key, activeStage.id)"
              >
                <template #header>
                  <div class="custom-header-wrapper">
                    <span>{{ key }}</span>
                  </div>
                </template>
                <template #default="scope">
                  <div class="inline-edit-cell" @click="scope.row.isEditingCustom = key">
                    <el-input 
                      v-if="scope.row.isEditingCustom === key" 
                      v-model="scope.row.customFields[key]" 
                      size="small" 
                      @blur="finishCustomFieldEdit(scope.row)"
                      @keyup.enter="finishCustomFieldEdit(scope.row)"
                      v-focus
                    />
                    <span v-else class="custom-field-text">
                      {{ scope.row.customFields?.[key] || '-' }}
                    </span>
                  </div>
                </template>
              </el-table-column>

              <!-- 7. 操作 -->
              <el-table-column label="操作" width="70" align="center">
                <template #default="scope">
                  <el-button type="danger" link size="small" @click="handleDeleteSubTask(scope.row.id, activeStage.id)">删除</el-button>
                </template>
              </el-table-column>
            </el-table>

            <!-- 每一阶段底部的快速录入 (优化：强制不折行并配置宽度比例) -->
            <div class="excel-quick-append-row">
              <span class="append-tag">➕ 添加行</span>
              <el-input 
                v-model="stageAddForms[activeStage.id].title" 
                placeholder="添加一级子任务..." 
                size="small" 
                style="flex: 3 !important; margin-right: 12px; width: auto !important;" 
              />
              <el-input 
                v-model="stageAddForms[activeStage.id].assignee" 
                placeholder="负责人" 
                size="small" 
                style="flex: 1 !important; margin-right: 12px; width: auto !important;" 
              />
              <el-button type="primary" size="small" style="flex-shrink: 0;" @click="handleQuickAddSubTask(activeStage.id)">确定添加</el-button>
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

    <!-- 弹窗：划分新阶段 -->
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

    <!-- 弹窗：拆解子项模态窗 -->
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
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/store/user'
import { Menu, Checked, SwitchButton, Expand, Fold } from '@element-plus/icons-vue'
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

// 阶段切换与菜单折叠状态
const activeStageId = ref(null)
const isCollapsed = ref(false) // 菜单折叠标记

// 动态计算菜单宽度
const sidebarWidth = computed(() => isCollapsed.value ? '64px' : '240px')

// 响应式存储：每个阶段下扫描出的全部自定义属性 Key
const detectedColumnKeys = ref({})

// 计算属性：当前选中阶段（控制一屏只显示这一个大表）
const activeStage = computed(() => {
  return stages.value.find(s => s.id === activeStageId.value)
})

// 状态映射绑定
const stageSubTasks = ref({})
const stageAddForms = ref({})
const taskTimelines = ref({})
const quickLogs = ref({})

// 各列筛选器激活的状态（格式：{ [columnKey]: [selectedValues] }）
const activeFilters = ref({})

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

// 自动扫描 JSONB 属性 Key 列表
const scanCustomColumns = (list) => {
  const keys = new Set()
  const traverse = (items) => {
    items.forEach(item => {
      if (item.customFields) {
        Object.keys(item.customFields).forEach(k => {
          if (k && k.trim() !== '') {
            keys.add(k.trim())
          }
        })
      }
      if (item.children && item.children.length > 0) {
        traverse(item.children)
      }
    })
  }
  traverse(list)
  return Array.from(keys)
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

// 树形递归剪枝过滤算法 (升级：多列自定义属性过滤器组合筛选联动，支持状态直接在表头过滤)
const filterTreeData = (nodes, allowedStatuses, currentFilters) => {
  const result = []
  for (const node of nodes) {
    const clonedNode = { ...node, children: [] }
    
    // 1. 递归优先过滤子项
    if (node.children && node.children.length > 0) {
      clonedNode.children = filterTreeData(node.children, allowedStatuses, currentFilters)
    }
    
    // 2. 判断当前节点是否符合“表格状态头过滤器配置”
    const isStatusMatch = allowedStatuses.length === 0 || allowedStatuses.includes(node.status)
    
    // 3. 判断当前节点是否符合“各表头自选列独立过滤器”
    let isHeaderFiltersMatch = true
    for (const key in currentFilters) {
      if (key === 'status') continue // 关键：状态已经在 isStatusMatch 中做单独高精细匹配，在此排除
      
      const selectedVals = currentFilters[key]
      if (selectedVals && selectedVals.length > 0) {
        let nodeVal = ''
        if (key === 'assignee') {
          nodeVal = node.assignee ? node.assignee.trim() : '未分配'
        } else {
          nodeVal = node.customFields?.[key] ? String(node.customFields[key]).trim() : '空'
        }
        if (!selectedVals.includes(nodeVal)) {
          isHeaderFiltersMatch = false
          break
        }
      }
    }
    
    const isCurrentMatch = isStatusMatch && isHeaderFiltersMatch
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
  
  // 从表头筛选状态中获取允许的状态值，如无，则默认显示全部
  const allowedStatuses = activeFilters.value['status'] && activeFilters.value['status'].length > 0 
    ? activeFilters.value['status'] 
    : ['TODO', 'IN_PROGRESS', 'DONE']

  const hasActiveFilters = Object.keys(activeFilters.value).some(key => {
    return activeFilters.value[key] && activeFilters.value[key].length > 0
  })

  // 如果无任何表头筛选条件，则直接返还原树（提升渲染性能）
  if (allowedStatuses.length === 3 && !hasActiveFilters) {
    return originalTree 
  }
  return filterTreeData(originalTree, allowedStatuses, activeFilters.value)
}

// ----------------- 列头过滤选项动态数据搜集 -----------------

// A. 动态搜集“负责人”表头选项
const getAssigneeFilters = (stageId) => {
  const tasks = stageSubTasks.value[stageId] || []
  const uniqueValues = new Set()
  
  const collect = (list) => {
    list.forEach(t => {
      uniqueValues.add(t.assignee ? t.assignee.trim() : '未分配')
      if (t.children && t.children.length > 0) collect(t.children)
    })
  }
  collect(tasks)
  return Array.from(uniqueValues).map(val => ({ text: val, value: val }))
}

// B. 动态搜集并渲染“自动生成扩展列”的表头选项
const getCustomColumnFilters = (columnKey, stageId) => {
  const tasks = stageSubTasks.value[stageId] || []
  const uniqueValues = new Set()
  
  const collect = (list) => {
    list.forEach(t => {
      const val = t.customFields?.[columnKey]
      uniqueValues.add(val && String(val).trim() !== '' ? String(val).trim() : '空')
      if (t.children && t.children.length > 0) collect(t.children)
    })
  }
  collect(tasks)
  return Array.from(uniqueValues).map(val => ({ text: val, value: val }))
}

// 监听表头筛选改变
const handleFilterChange = (filters) => {
  for (const key in filters) {
    activeFilters.value[key] = filters[key]
  }
}

// ----------------- 数据加载业务 -----------------

const loadRequirements = async () => {
  try {
    requirements.value = await getRequirementsListApi()
  } catch (error) {}
}

const switchRequirement = async (req) => {
  selectedRequirement.value = req
  activeReqId.value = req.id
  activeFilters.value = {} // 重置列过滤
  await loadStages(req.id)
}

const loadStages = async (reqId) => {
  try {
    const stageList = await getStagesApi(reqId)
    stages.value = stageList
    
    // 初始化首选状态：切换需求时，自动高亮并载入该需求的第一个阶段
    if (stageList.length > 0) {
      activeStageId.value = stageList[0].id
      await handleStageChange(stageList[0].id)
    } else {
      activeStageId.value = null
    }
  } catch (error) {}
}

// 当切换执行阶段时，进行按需数据懒加载
const handleStageChange = async (stageId) => {
  if (stageId) {
    stageAddForms.value[stageId] = { title: '', assignee: '' }
    await loadSubTasks(stageId)
  }
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

  // 1. 无感列扫描：获取该阶段目前所有数据行中已写入的全部 Key 并激活表头列
  detectedColumnKeys.value[stageId] = scanCustomColumns(flatTaskList)

  // 2. 转换为树形数据
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

const finishCustomFieldEdit = async (row) => {
  row.isEditingCustom = null
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

    // 局部响应式重算列：让新增属性后，动态表头瞬间生成并响应重绘
    detectedColumnKeys.value[row.stageId] = scanCustomColumns(originalList)

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
    await loadSubTasks(selectedParentStageId.value)
  } catch (error) {}
}

// ----------------- 日志时间轴跟进 (保留业务底层，仅主要移除表格列展示) -----------------

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
    await loadSubTasks(stageId)
  } catch (error) {}
}

const handleDeleteSubTask = (id, stageId) => {
  ElMessageBox.confirm('移除该项将同步删除其所有子拆解项，是否继续？', '提示', {
    type: 'warning'
  }).then(async () => {
    await deleteSubTaskApi(id)
    ElMessage.success('删除成功')
    await loadSubTasks(stageId)
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
    await loadStages(selectedRequirement.value.id)
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
    await loadStages(selectedRequirement.value.id)
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
      await switchRequirement(target)
    }
  } else if (requirements.value.length > 0) {
    await switchRequirement(requirements.value[0])
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
  width: v-bind(sidebarWidth);
  transition: width 0.2s ease-in-out;
  background-color: #001529;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}
.brand {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  background-color: #002140;
  overflow: hidden;
  flex-shrink: 0;
}
.logo-text {
  font-size: 18px;
  font-weight: bold;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
}
.collapse-toggle-btn {
  color: #ffffff;
  font-size: 16px;
  padding: 0;
}
.sidebar-menu {
  border-right: none;
  flex: 1;
}

/* 侧边栏底部用户信息和退出区 */
.sidebar-user-footer {
  border-top: 1px solid #002140;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background-color: #001529;
  overflow: hidden;
  flex-shrink: 0;
}
.sidebar-user-footer.collapsed {
  align-items: center;
  padding: 16px 0;
}
.sidebar-user-footer.collapsed .user-info-text {
  justify-content: center;
}
.sidebar-user-footer.collapsed .logout-btn {
  justify-content: center;
  padding-left: 0;
  width: 100%;
}
.user-info-text {
  display: flex;
  align-items: center;
  color: #ffffff;
  font-size: 13px;
  white-space: nowrap;
}
.user-avatar {
  font-size: 16px;
  margin-right: 8px;
}
.user-name {
  font-weight: bold;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.logout-btn {
  justify-content: flex-start;
  padding-left: 0;
  color: #f56c6c;
}

.main-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: #f0f2f5;
  overflow: hidden;
}

.workbench-workspace {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

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

/* ================= 核心修复：防止树形首列的单元格内容换行，强力保证排期、缩进与文字在同一水平线上 ================= */
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