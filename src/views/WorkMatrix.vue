<template>
  <div class="workbench-workspace">
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

      <!-- 树形 Excel 协同表格 -->
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
          <!-- 1. 子任务标题 -->
          <el-table-column label="任务与子项内容 (双击编辑 / 回车保存)" min-width="260">
            <template #default="scope">
              <div class="inline-edit-cell" @dblclick="startTitleEdit(scope.row)">
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

          <!-- 2. 状态列 -->
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

          <!-- 3. 负责人列 -->
          <el-table-column 
            label="负责人" 
            width="135" 
            align="center"
            column-key="assignee"
            :filters="getAssigneeFilters(activeStage.id)"
          >
            <template #default="scope">
              <div class="inline-edit-cell" @click="startAssigneeEdit(scope.row)">
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

          <!-- 6. 自动扫描渲染列 -->
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
              <div class="inline-edit-cell" @click="startCustomFieldEdit(scope.row, key, scope.row.customFields[key])">
                <el-input 
                  v-if="scope.row.isEditingCustom === key" 
                  v-model="scope.row.customFields[key]" 
                  size="small" 
                  @blur="finishCustomFieldEdit(scope.row, key)"
                  @keyup.enter="finishCustomFieldEdit(scope.row, key)"
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

        <!-- 快速添加行 -->
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

    <!-- 空白占位 -->
    <div class="empty-board-state" v-else>
      <el-empty description="选择上方一个工作协同表" :image-size="120" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/store/user'
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

// 脏值检测原值缓存
const originalValCache = ref('')

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

// 递归寻找并更新本地真实数据源中的对应节点属性
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
      if (key === 'status') continue
      
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

// 核心优化（计算属性路由）：将高频递归过滤操作重写为依赖响应式自动调用的 Computed 缓存
const filteredTasksMap = computed(() => {
  const map = {}
  stages.value.forEach(stage => {
    const originalTree = stageSubTasks.value[stage.id] || []
    
    const allowedStatuses = activeFilters.value['status'] && activeFilters.value['status'].length > 0 
      ? activeFilters.value['status'] 
      : ['TODO', 'IN_PROGRESS', 'DONE']

    const hasActiveFilters = Object.keys(activeFilters.value).some(key => {
      return activeFilters.value[key] && activeFilters.value[key].length > 0
    })

    if (allowedStatuses.length === 3 && !hasActiveFilters) {
      map[stage.id] = originalTree
    } else {
      map[stage.id] = filterTreeData(originalTree, allowedStatuses, activeFilters.value)
    }
  })
  return map
})

// 供表格绑定的简易计算返回（从缓存 Map 中直取）
const getFilteredTasks = (stageId) => {
  return filteredTasksMap.value[stageId] || []
}

// ----------------- 列头过滤选项动态数据搜集 -----------------

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
  activeFilters.value = {}
  await loadStages(req.id)
}

const loadStages = async (reqId) => {
  try {
    const stageList = await getStagesApi(reqId)
    stages.value = stageList
    
    if (stageList.length > 0) {
      activeStageId.value = stageList[0].id
      await handleStageChange(stageList[0].id)
    } else {
      activeStageId.value = null
    }
  } catch (error) {}
}

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

  detectedColumnKeys.value[stageId] = scanCustomColumns(flatTaskList)
  stageSubTasks.value[stageId] = arrayToTree(flatTaskList)
}

// ----------------- 行内编辑 Excel 操作及脏值检测 -----------------

const startTitleEdit = (row) => {
  row.isEditingTitle = true
  originalValCache.value = row.title || ''
}

const finishTitleEdit = async (row) => {
  row.isEditingTitle = false
  if (!row.title.trim()) {
    row.title = originalValCache.value
    return
  }
  if (row.title === originalValCache.value) {
    return
  }
  await saveSubTask(row)
}

const startAssigneeEdit = (row) => {
  row.isEditingAssignee = true
  originalValCache.value = row.assignee || ''
}

const finishAssigneeEdit = async (row) => {
  row.isEditingAssignee = false
  const currentVal = row.assignee || ''
  if (currentVal === originalValCache.value) {
    return
  }
  await saveSubTask(row)
}

const startCustomFieldEdit = (row, colKey, currentVal) => {
  row.isEditingCustom = colKey
  originalValCache.value = currentVal || ''
}

const finishCustomFieldEdit = async (row, colKey) => {
  row.isEditingCustom = null
  const currentVal = row.customFields?.[colKey] || ''
  if (currentVal === originalValCache.value) {
    return
  }
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
    const originalList = stageSubTasks.value[row.stageId] || []
    updateOriginalNode(originalList, row)

    detectedColumnKeys.value[row.stageId] = scanCustomColumns(originalList)

    const updatePayload = {
      id: row.id,
      stageId: row.stageId,
      parentId: row.parentId,
      parent_id: row.parentId || row.parent_id,
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
      parent_id: selectedParentRow.value.id,
      title: childTaskForm.value.title,
      assignee: childTaskForm.value.assignee,
      status: 'TODO'
    })
    ElMessage.success('子项拆解成功')
    childTaskDialogVisible.value = false
    await loadSubTasks(selectedParentStageId.value)
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
  row.customFields[k] = v
  initPropertyForm()
  await saveSubTask(row)
}

const removeProperty = async (row, key) => {
  if (row.customFields && row.customFields[key] !== undefined) {
    delete row.customFields[key]
    await saveSubTask(row)
  }
}

onMounted(async () => {
  // 核心优化：由于左侧菜单骨架现已统一，折叠状态和用户信息均由 MainLayout 统一接管，本页面只纯粹处理矩阵核心协同逻辑
  const queryReqId = route.query.reqId
  if (queryReqId) {
    // 获取由外部（如：需求管理列表）点击跳转过来的需求ID并载入
    const target = requirements.value.find(r => r.id === Number(queryReqId))
    if (target) {
      await switchRequirement(target)
    }
  } else {
    // 如果无传参直达，默认载入当前用户的第一个活跃需求表，防止页面空白
    await loadRequirements()
    if (requirements.value.length > 0) {
      await switchRequirement(requirements.value[0])
    }
  }
})
</script>

<style scoped>
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

/* 过滤状态控制行，保持精致虚线排版 */
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

/* 强力保证：防止树形首列的单元格内容换行，保证排期、缩进与文字在同一水平线上 */
.excel-table-style :deep(.el-table__row) td:first-child .cell {
  display: flex !important;
  align-items: center !important;
  flex-wrap: nowrap !important;
}

/* 高亮电子表格行内悬浮编辑边框指示器 */
.inline-edit-cell {
  min-height: 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: 1;
  overflow: hidden;
  padding: 0 6px;
  border: 1px transparent dashed;
  border-radius: 4px;
  transition: all 0.15s ease-in-out;
}
.inline-edit-cell:hover {
  border-color: #c0c4cc;
  background-color: #fafafa;
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

/* 表格底部快速录入：高度与表格底边框圆角、背景深度融合 */
.excel-quick-append-row {
  height: 48px !important;
  background-color: #fafafa;
  border: 1px solid #ebeef5;
  border-top: none;
  border-radius: 0 0 6px 6px;
  display: flex !important;
  align-items: center !important;
  flex-wrap: nowrap !important;
  padding: 0 16px;
  box-sizing: border-box;
}
.excel-quick-append-row :deep(.el-input__wrapper) {
  background-color: #ffffff !important;
  box-shadow: 0 0 0 1px #dcdfe6 inset !important;
}
.excel-quick-append-row :deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px #c0c4cc inset !important;
}
.excel-quick-append-row :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px #409eff inset !important;
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

/* 1. 强力保证：树形表格每一级子节点的缩进间距 */
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

/* 定制表格 Row 悬浮背景色为莫兰迪系柔和浅蓝色，防疲劳 */
.excel-table-style :deep(.el-table__row:hover > td.el-table__cell) {
  background-color: #f2f7fc !important;
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
  border: 1px transparent dashed;
  border-radius: 4px;
  transition: all 0.15s ease-in-out;
}
.properties-preview-box:hover {
  border-color: #c0c4cc;
  background-color: #fafafa;
}
.properties-placeholder {
  font-size: 11px;
  color: #c0c4cc;
  font-style: italic;
  padding-left: 6px;
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