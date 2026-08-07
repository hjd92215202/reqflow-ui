<template>
  <div class="workbench-workspace">
    <!-- 1. 主页面：项目/需求全局视图 & 阶段列表总览 (全局掌控) -->
    <div class="matrix-board" v-if="selectedRequirement">
      <!-- 1.1 顶栏：项目全局概览 & 需求无缝切换器 -->
      <div class="board-top-info">
        <div>
          <div class="header-title-row">
            <span class="header-req-icon">📋</span>
            <!-- 优化点：需求自由切换下拉框 -->
            <el-select v-model="activeReqId" placeholder="请选择/切换需求项目" size="large" class="header-req-select"
              @change="handleReqSelectChange">
              <el-option v-for="req in requirements" :key="req.id" :label="req.title" :value="req.id">
                <div class="req-option-item">
                  <span class="req-option-title">{{ req.title }}</span>
                  <el-tag :type="getPriorityTag(req.priority)" size="small" style="margin-left: 8px;">
                    {{ req.priority }}
                  </el-tag>
                </div>
              </el-option>
            </el-select>

            <el-tag :type="getPriorityTag(selectedRequirement.priority)" size="small" style="margin-left: 12px;">
              {{ selectedRequirement.priority }} 优先级
            </el-tag>
          </div>
          <p class="board-header-desc" v-if="selectedRequirement.description">{{ selectedRequirement.description }}</p>
        </div>
        <div class="top-action-bar">
          <el-button type="primary" size="default" @click="openCreateStageDialog">➕ 划分新执行阶段</el-button>
        </div>
      </div>

      <el-divider style="margin: 18px 0 20px 0;" />

      <!-- 1.2 核心：所有执行阶段列表总览 (列表样式) -->
      <div class="stages-list-view" v-if="stages.length > 0">
        <div v-for="stage in stages" :key="stage.id" class="stage-list-item" @click="openStageMatrixModal(stage)">
          <!-- 阶段名称与排期信息 -->
          <div class="stage-item-left">
            <span class="stage-item-icon">📍</span>
            <div class="stage-item-info">
              <span class="stage-item-title">{{ stage.title }}</span>
              <span class="stage-item-dates">📅 {{ stage.startDate || '未定' }} 至 {{ stage.endDate || '未定' }}</span>
            </div>
          </div>

          <!-- 阶段状态快速切换 -->
          <div class="stage-item-status" @click.stop>
            <el-radio-group v-model="stage.status" size="small" @change="handleStageStatusChange(stage)">
              <el-radio-button value="TODO">待处理</el-radio-button>
              <el-radio-button value="IN_PROGRESS">进行中</el-radio-button>
              <el-radio-button value="DONE">已完成</el-radio-button>
            </el-radio-group>
          </div>

          <!-- 拆解任务完成度进度条 -->
          <div class="stage-item-progress">
            <span class="progress-count-text">
              进度: {{ getStageTaskStats(stage.id).done }} / {{ getStageTaskStats(stage.id).total }} 项
            </span>
            <el-progress :percentage="getStageTaskStats(stage.id).percent"
              :status="getStageTaskStats(stage.id).percent === 100 ? 'success' : ''" :stroke-width="6"
              style="width: 120px;" />
          </div>

          <!-- 操作按键 -->
          <div class="stage-item-actions" @click.stop>
            <el-button type="primary" link size="small" @click="openStageMatrixModal(stage)">
              进入协同矩阵 ➔
            </el-button>
            <el-button type="danger" link size="small" @click="handleDeleteStage(stage.id)">
              移除
            </el-button>
          </div>
        </div>
      </div>

      <el-empty v-else description="暂无执行阶段，点击右上角“划分新执行阶段”开始拆解" :image-size="100" />
    </div>

    <!-- 未选择需求或没有需求时的占位 -->
    <div class="empty-board-state" v-else>
      <el-empty description="暂无需求事项，请先在【需求事项管理】中录入需求" :image-size="120" />
    </div>

    <!-- 2. 大弹窗：阶段微观协同矩阵 (沉浸式聚焦体验) -->
    <el-dialog v-model="matrixModalVisible" :title="activeStage ? `📍 协同矩阵 · ${activeStage.title}` : '阶段协同矩阵'"
      width="92%" top="3vh" destroy-on-close class="matrix-dialog-wrapper">
      <div v-if="activeStage" class="stage-table-block" style="margin-top: 0;">
        <div class="stage-block-header">
          <div class="stage-title-left">
            <span class="block-stage-name">📍 阶段：{{ activeStage.title }}</span>
            <span class="block-stage-dates">排期：{{ activeStage.startDate || '未定' }} 至 {{ activeStage.endDate || '未定'
              }}</span>
          </div>
          <div class="stage-title-right">
            <el-radio-group v-model="activeStage.status" size="small" @change="handleStageStatusChange(activeStage)">
              <el-radio-button value="TODO">待处理</el-radio-button>
              <el-radio-button value="IN_PROGRESS">进行中</el-radio-button>
              <el-radio-button value="DONE">已完成</el-radio-button>
            </el-radio-group>
            <el-button type="danger" link size="small" @click="handleDeleteStageInModal(activeStage.id)"
              style="margin-left: 20px;">
              移除阶段
            </el-button>
          </div>
        </div>

        <!-- 树形 Excel 协同表格 -->
        <el-table :data="getFilteredTasks(activeStage.id)" border row-key="id" default-expand-all
          :tree-props="{ children: 'children' }" :indent="28" class="excel-table-style"
          @filter-change="handleFilterChange">
          <!-- 1. 子任务标题列 -->
          <el-table-column label="任务与子项内容 (双击编辑 / 回车保存)" min-width="260">
            <template #default="scope">
              <div class="inline-edit-cell" @click.stop @dblclick.stop="startTitleEdit(scope.row)">
                <el-input key="edit-title-input" v-if="editingTitleTaskId === scope.row.id" v-model="scope.row.title"
                  size="small" @blur="finishTitleEdit(scope.row)" @keyup.enter="finishTitleEdit(scope.row)" @click.stop
                  @dblclick.stop v-focus />
                <span key="read-title-text" v-else
                  :class="['cell-text', { 'completed-style': scope.row.status === 'DONE' }]">
                  {{ scope.row.title }}
                </span>
                <el-button class="add-sub-child-btn" size="small" type="primary" link
                  @click.stop="handleInlineAddChild(scope.row, activeStage.id)">
                  + 拆解子项
                </el-button>
              </div>
            </template>
          </el-table-column>

          <!-- 2. 状态列 -->
          <el-table-column label="状态" width="130" align="center" column-key="status"
            :filters="[{ text: '待处理', value: 'TODO' }, { text: '进行中', value: 'IN_PROGRESS' }, { text: '已完成', value: 'DONE' }]">
            <template #default="scope">
              <el-select v-model="scope.row.status" size="small" @change="saveSubTask(scope.row)" @click.stop
                style="width: 100%;">
                <el-option label="待处理" value="TODO" />
                <el-option label="进行中" value="IN_PROGRESS" />
                <el-option label="已完成" value="DONE" />
              </el-select>
            </template>
          </el-table-column>

          <!-- 3. 负责人列 -->
          <el-table-column label="负责人" width="135" align="center" column-key="assignee"
            :filters="getAssigneeFilters(activeStage.id)">
            <template #default="scope">
              <div class="inline-edit-cell" @click.stop @dblclick.stop="startAssigneeEdit(scope.row)">
                <el-input key="edit-assignee-input" v-if="editingAssigneeTaskId === scope.row.id"
                  v-model="scope.row.assignee" size="small" @blur="finishAssigneeEdit(scope.row)"
                  @keyup.enter="finishAssigneeEdit(scope.row)" @click.stop @dblclick.stop v-focus />
                <span v-else class="assignee-tag">👤 {{ scope.row.assignee || '未分配' }}</span>
              </div>
            </template>
          </el-table-column>

          <!-- 4. 排期起止 -->
          <el-table-column label="起止排期" width="200" align="center">
            <template #default="scope">
              <div class="inline-edit-cell date-cell" @click.stop @dblclick.stop="startDateEdit(scope.row)">
                <el-date-picker v-if="editingDateTaskId === scope.row.id" v-model="scope.row.dateRange" type="daterange"
                  range-separator="-" start-placeholder="始" end-placeholder="止" size="small" value-format="YYYY-MM-DD"
                  style="width: 100%;" @change="finishDateEdit(scope.row)" @blur="editingDateTaskId = null" v-focus />
                <span v-else class="date-preview-text">
                  📅 {{ formatDateRange(scope.row) }}
                </span>
              </div>
            </template>
          </el-table-column>

          <!-- 5. 扩展属性标签 -->
          <el-table-column label="🏷️ 扩展属性标签" width="180" align="center">
            <template #default="scope">
              <el-popover placement="top" :width="320" trigger="click" @show="initPropertyForm">
                <template #reference>
                  <div class="properties-preview-box" @click.stop>
                    <template v-if="hasProperties(scope.row.customFields)">
                      <el-tag size="small" type="info" style="cursor:pointer;">
                        ⚙️ {{ Object.keys(scope.row.customFields).length }}个扩展值
                      </el-tag>
                    </template>
                    <span v-else class="properties-placeholder">+ 属性扩展</span>
                  </div>
                </template>

                <div class="property-inspector">
                  <h4 class="inspector-title">📌 属性配置看板</h4>
                  <div class="existing-properties">
                    <div v-for="(val, key) in scope.row.customFields" :key="key" class="property-item-row">
                      <span class="prop-badge"><strong>{{ key }}</strong></span>
                      <el-button type="danger" link size="small" @click="removeProperty(scope.row, key)">移除</el-button>
                    </div>
                    <div v-if="!hasProperties(scope.row.customFields)" class="no-props-placeholder">
                      暂无独立标签属性，可在下方追加
                    </div>
                  </div>

                  <div class="add-property-form">
                    <el-input v-model="newPropForm.key" placeholder="属性名(如: Bug数)" size="small"
                      style="flex: 1.2; margin-right: 6px;" />
                    <el-input v-model="newPropForm.value" placeholder="属性值(如: 3个)" size="small"
                      style="flex: 1.5; margin-right: 6px;" @keyup.enter="addProperty(scope.row)" />
                    <el-button type="primary" size="small" @click="addProperty(scope.row)">添加</el-button>
                  </div>
                </div>
              </el-popover>
            </template>
          </el-table-column>

          <!-- 6. 动态 JSONB 渲染列 -->
          <el-table-column v-for="key in detectedColumnKeys[activeStage.id] || []" :key="key" :column-key="key"
            min-width="140" :filters="getCustomColumnFilters(key, activeStage.id)">
            <template #header>
              <div class="custom-header-wrapper">
                <span>{{ key }}</span>
              </div>
            </template>
            <template #default="scope">
              <div class="inline-edit-cell" @click.stop
                @dblclick.stop="startCustomFieldEdit(scope.row, key, scope.row.customFields[key])">
                <el-input key="edit-custom-input"
                  v-if="editingCustomField.taskId === scope.row.id && editingCustomField.key === key" type="textarea"
                  :autosize="{ minRows: 1 }" v-model="scope.row.customFields[key]" size="small"
                  @blur="finishCustomFieldEdit(scope.row, key)" @click.stop @dblclick.stop v-focus />
                <span v-else class="custom-field-text">
                  {{ scope.row.customFields?.[key] || '-' }}
                </span>
              </div>
            </template>
          </el-table-column>

          <!-- 7. 操作列 -->
          <el-table-column label="操作" width="70" align="center">
            <template #default="scope">
              <el-button type="danger" link size="small"
                @click="handleDeleteSubTask(scope.row.id, activeStage.id)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <!-- 快速添加行 -->
        <div class="excel-quick-append-row" v-if="stageAddForms[activeStage.id]">
          <span class="append-tag">➕ 添加行</span>
          <el-input v-model="stageAddForms[activeStage.id].title" placeholder="添加一级子任务..." size="small"
            style="flex: 3 !important; margin-right: 12px; width: auto !important;" />
          <el-input v-model="stageAddForms[activeStage.id].assignee" placeholder="负责人" size="small"
            style="flex: 1 !important; margin-right: 12px; width: auto !important;" />
          <el-button type="primary" size="small" style="flex-shrink: 0;" @click="handleQuickAddSubTask(activeStage.id)">
            确定添加
          </el-button>
        </div>
      </div>
    </el-dialog>

    <!-- 3. 新建执行阶段微型弹窗 -->
    <el-dialog v-model="stageDialogVisible" title="划分新执行阶段" width="400px" append-to-body>
      <el-form :model="stageForm" label-width="80px">
        <el-form-item label="阶段名称" required>
          <el-input v-model="stageForm.title" placeholder="如：研发编码期 / 业务测试期" />
        </el-form-item>
        <el-form-item label="起止排期">
          <el-date-picker v-model="stageDateRange" type="daterange" range-separator="-" start-placeholder="开始"
            end-placeholder="截止" value-format="YYYY-MM-DD" style="width: 100%;" size="small" />
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
import { ref, onMounted, computed, nextTick } from 'vue'
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

// 大弹窗与沉浸式协同绑定
const matrixModalVisible = ref(false)
const activeStageId = ref(null)

// 计算属性：当前大弹窗聚焦激活的阶段
const activeStage = computed(() => {
  return stages.value.find(s => s.id === activeStageId.value)
})

// 脏值检测原值缓存
const originalValCache = ref('')

// 响应式存储：每个阶段下扫描出的全部自定义属性 Key
const detectedColumnKeys = ref({})

// 状态映射绑定
const stageSubTasks = ref({})
const stageAddForms = ref({})
const taskTimelines = ref({})
const quickLogs = ref({})

// 各列筛选器激活的状态（格式：{ [columnKey]: [selectedValues] }）
const activeFilters = ref({})

// 行内属性配置新表单
const newPropForm = ref({ key: '', value: '' })

// 阶段新建弹窗
const stageDialogVisible = ref(false)
const stageDateRange = ref([])
const stageForm = ref({ title: '', startDate: null, endDate: null })

// 局部独立编辑态标识
const editingTitleTaskId = ref(null)
const editingAssigneeTaskId = ref(null)
const editingDateTaskId = ref(null)
const editingCustomField = ref({ taskId: null, key: null })

// 自动聚焦指令
const vFocus = {
  mounted: (el) => {
    const target = el.querySelector('input, textarea')
    if (target) target.focus()
  }
}

// 标签与排期工具函数
const getPriorityTag = (p) => {
  if (p === 'HIGH') return 'danger'
  if (p === 'MEDIUM') return 'warning'
  return 'info'
}

const formatDateRange = (row) => {
  if (row.startDate && row.endDate) {
    return `${row.startDate} 至 ${row.endDate}`
  }
  return '暂无排期'
}

// 计算阶段完成进度统计（用于全局掌控列表展示）
const getStageTaskStats = (stageId) => {
  const tasks = stageSubTasks.value[stageId] || []
  let total = 0
  let done = 0
  const countTasks = (list) => {
    list.forEach(item => {
      total++
      if (item.status === 'DONE') done++
      if (item.children && item.children.length > 0) countTasks(item.children)
    })
  }
  countTasks(tasks)
  const percent = total > 0 ? Math.round((done / total) * 100) : 0
  return { total, done, percent }
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

    if (node.children && node.children.length > 0) {
      clonedNode.children = filterTreeData(node.children, allowedStatuses, currentFilters)
    }

    const isStatusMatch = allowedStatuses.length === 0 || allowedStatuses.includes(node.status)

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

// 属性计算与缓存
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

const getFilteredTasks = (stageId) => {
  return filteredTasksMap.value[stageId] || []
}

// 列头过滤数据
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
  let hasTooLongText = false

  const collect = (list) => {
    list.forEach(t => {
      const val = t.customFields?.[columnKey]
      if (val && String(val).trim() !== '') {
        const strVal = String(val).trim()
        if (strVal.length > 25 || strVal.includes('\n')) {
          hasTooLongText = true
        }
        uniqueValues.add(strVal)
      } else {
        uniqueValues.add('空')
      }
      if (t.children && t.children.length > 0) collect(t.children)
    })
  }
  collect(tasks)

  if (hasTooLongText) {
    return undefined
  }

  return Array.from(uniqueValues).map(val => ({ text: val, value: val }))
}

const handleFilterChange = (filters) => {
  for (const key in filters) {
    activeFilters.value[key] = filters[key]
  }
}

// ----------------- 数据加载与需求自由切换业务 -----------------

const loadRequirements = async () => {
  try {
    // 传入较大 size，确保协同矩阵下拉选择框能拿到当前用户的所有需求
    const res = await getRequirementsListApi({ page: 0, size: 200 })
    requirements.value = res.content || []
  } catch (error) { }
}

// 核心优化：用户在顶栏下拉菜单中主动切换需求
const handleReqSelectChange = async (reqId) => {
  const target = requirements.value.find(r => r.id === reqId)
  if (target) {
    await switchRequirement(target)
    // 同步更新 URL query，保持刷新页面后停留在此需求
    router.replace({ path: '/matrix', query: { reqId } })
  }
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

    // 预加载当前需求下所有阶段的子任务，使得列表能立即显示准确进度
    if (stageList.length > 0) {
      for (const s of stageList) {
        stageAddForms.value[s.id] = { title: '', assignee: '' }
        await loadSubTasks(s.id)
      }
    }
  } catch (error) { }
}

const handleStageChange = async (stageId) => {
  if (stageId) {
    stageAddForms.value[stageId] = { title: '', assignee: '' }
    await loadSubTasks(stageId)
  }
}

const loadSubTasks = async (stageId) => {
  const flatTaskList = await getSubTasksApi(stageId).catch(() => [])

  const discussions = await getDiscussionsApi(stageId).catch(() => [])

  const latestLogMap = {}
  if (discussions && discussions.length > 0) {
    discussions.forEach(log => {
      latestLogMap[log.stageId] = log.content
    })
  }

  for (let task of flatTaskList) {
    task.dateRange = (task.startDate && task.endDate) ? [task.startDate, task.endDate] : []
    if (!task.customFields) {
      task.customFields = {}
    }
    task.latestLog = latestLogMap[task.id] || ''
  }

  detectedColumnKeys.value[stageId] = scanCustomColumns(flatTaskList)
  stageSubTasks.value[stageId] = arrayToTree(flatTaskList)
}

// 点击阶段列表项，唤醒沉浸式协同大弹窗
const openStageMatrixModal = async (stage) => {
  activeStageId.value = stage.id
  await handleStageChange(stage.id)
  matrixModalVisible.value = true
}

// ----------------- 行内编辑与保存 -----------------

const startTitleEdit = (row) => {
  editingTitleTaskId.value = row.id
  originalValCache.value = row.title || ''
}

const finishTitleEdit = async (row) => {
  editingTitleTaskId.value = null
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
  editingAssigneeTaskId.value = row.id
  originalValCache.value = row.assignee || ''
}

const finishAssigneeEdit = async (row) => {
  editingAssigneeTaskId.value = null
  const currentVal = row.assignee || ''
  if (currentVal === originalValCache.value) {
    return
  }
  await saveSubTask(row)
}

const startDateEdit = (row) => {
  editingDateTaskId.value = row.id
}

const finishDateEdit = async (row) => {
  editingDateTaskId.value = null
  if (row.dateRange && row.dateRange.length === 2) {
    row.startDate = row.dateRange[0]
    row.endDate = row.dateRange[1]
  } else {
    row.startDate = null
    row.endDate = null
  }
  await saveSubTask(row)
}

const startCustomFieldEdit = (row, colKey, currentVal) => {
  editingCustomField.value = { taskId: row.id, key: colKey }
  originalValCache.value = currentVal || ''
}

const finishCustomFieldEdit = async (row, colKey) => {
  editingCustomField.value = { taskId: null, key: null }
  const currentVal = row.customFields?.[colKey] || ''
  if (currentVal === originalValCache.value) {
    return
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

// ----------------- 原地极速拆解子项与行录入 -----------------

const handleInlineAddChild = async (parentRow, stageId) => {
  try {
    const newChild = await createSubTaskApi({
      stageId: stageId,
      parentId: parentRow.id,
      parent_id: parentRow.id,
      title: '新拆解子项',
      assignee: parentRow.assignee || '',
      status: 'TODO'
    })
    ElMessage.success('已新建子项，双击可改名')
    await loadSubTasks(stageId)
    nextTick(() => {
      startTitleEdit(newChild)
    })
  } catch (error) { }
}

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
  } catch (error) { }
}

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
  } catch (error) { }
}

const handleDeleteSubTask = (id, stageId) => {
  ElMessageBox.confirm('移除该项将同步删除其所有子拆解项，是否继续？', '提示', {
    type: 'warning'
  }).then(async () => {
    await deleteSubTaskApi(id)
    ElMessage.success('删除成功')
    await loadSubTasks(stageId)
  }).catch(() => { })
}

// ----------------- 阶段增删改与状态 -----------------

const handleStageStatusChange = async (stage) => {
  try {
    await updateStageApi(stage.id, stage)
    ElMessage.success(`阶段状态已更新: ${stage.status}`)
  } catch (error) { }
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
  } catch (error) { }
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
  }).catch(() => { })
}

const handleDeleteStageInModal = async (id) => {
  await handleDeleteStage(id)
  matrixModalVisible.value = false
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
  await loadRequirements()

  const queryReqId = route.query.reqId
  if (queryReqId) {
    const target = requirements.value.find(r => r.id === Number(queryReqId))
    if (target) {
      await switchRequirement(target)
    } else if (requirements.value.length > 0) {
      await switchRequirement(requirements.value[0])
    }
  } else {
    if (requirements.value.length > 0) {
      await switchRequirement(requirements.value[0])
    }
  }
})
</script>

<style scoped>
/* ================= Notion 级全局设计变量层 ================= */
.workbench-workspace {
  --notion-text: #37352f;
  --notion-bg: #ffffff;
  --notion-border: rgba(55, 53, 47, 0.09);
  --notion-border-light: rgba(55, 53, 47, 0.05);
  --notion-hover: rgba(55, 53, 47, 0.03);
  --el-color-primary: #2383e2;
  --el-border-radius-base: 4px;

  flex: 1;
  padding: 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

/* ================= 主面板与全局项目视图 ================= */
.matrix-board {
  background-color: var(--notion-bg);
  border-radius: 6px;
  padding: 24px;
  border: 1px solid var(--notion-border);
  box-shadow: 0 1px 2px rgba(15, 15, 15, 0.04);
}

.board-top-info {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.header-title-row {
  display: flex;
  align-items: center;
}

.header-req-icon {
  font-size: 18px;
  margin-right: 8px;
}

/* 顶栏需求无缝选择器自定义样式 */
.header-req-select {
  width: 320px;
}

:deep(.header-req-select .el-input__wrapper) {
  box-shadow: none !important;
  background-color: transparent !important;
  padding-left: 0 !important;
}

:deep(.header-req-select .el-input__inner) {
  font-size: 18px !important;
  font-weight: 600 !important;
  color: var(--notion-text) !important;
}

.req-option-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.req-option-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--notion-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 220px;
}

.board-header-desc {
  margin: 8px 0 0 0;
  font-size: 13px;
  color: rgba(55, 53, 47, 0.6);
}

.top-action-bar {
  display: flex;
  gap: 10px;
}

/* ================= 阶段列表视图 (List View Style) ================= */
.stages-list-view {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.stage-list-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 18px;
  border: 1px solid var(--notion-border);
  border-radius: 6px;
  background-color: #ffffff;
  transition: all 0.15s ease-in-out;
  cursor: pointer;
}

.stage-list-item:hover {
  border-color: var(--el-color-primary);
  background-color: #fafdff;
  transform: translateX(2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.stage-item-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 260px;
}

.stage-item-icon {
  font-size: 16px;
}

.stage-item-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.stage-item-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--notion-text);
}

.stage-item-dates {
  font-size: 11px;
  color: rgba(55, 53, 47, 0.5);
}

.stage-item-status {
  display: flex;
  align-items: center;
}

.stage-item-progress {
  display: flex;
  align-items: center;
  gap: 12px;
  background-color: #f7f7f5;
  padding: 6px 12px;
  border-radius: 4px;
}

.progress-count-text {
  font-size: 11px;
  color: rgba(55, 53, 47, 0.65);
  font-weight: 500;
  white-space: nowrap;
}

.stage-item-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* ================= 沉浸式弹窗与表格样式 ================= */
.stage-table-block {
  border: 1px solid var(--notion-border);
  border-radius: 6px;
  overflow: hidden;
}

.stage-block-header {
  height: 48px;
  background-color: #f7f7f5;
  border-bottom: 1px solid var(--notion-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 16px;
}

.block-stage-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--notion-text);
}

.block-stage-dates {
  font-size: 11px;
  color: rgba(55, 53, 47, 0.5);
  margin-left: 12px;
}

.stage-title-right {
  display: flex;
  align-items: center;
}

/* ================= 深度定制 Element 表格样式 ================= */
.excel-table-style {
  --el-table-border-color: var(--notion-border-light) !important;
  --el-table-header-bg-color: #f7f7f5 !important;
}

.excel-table-style :deep(.el-table__row) {
  cursor: cell;
  height: auto !important;
}

.excel-table-style :deep(th.el-table__cell) {
  background-color: #f7f7f5 !important;
  color: rgba(55, 53, 47, 0.6) !important;
  font-weight: 500 !important;
  font-size: 12px;
  letter-spacing: 0.3px;
}

.excel-table-style :deep(.cell) {
  padding: 8px 10px !important;
}

.excel-table-style :deep(.el-table__row) td:first-child .cell {
  display: flex !important;
  align-items: center !important;
  flex-wrap: nowrap !important;
}

.excel-table-style :deep(th.el-table__cell > .cell) {
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  flex-wrap: nowrap !important;
  white-space: nowrap !important;
  overflow: visible !important;
}

.excel-table-style :deep(th.is-left > .cell) {
  justify-content: flex-start !important;
}

.excel-table-style :deep(th.is-right > .cell) {
  justify-content: flex-end !important;
}

.excel-table-style :deep(.el-table__column-filter-trigger) {
  margin-left: 4px !important;
  display: inline-flex !important;
  align-items: center !important;
  vertical-align: middle !important;
}

.excel-table-style :deep(.el-table__row:hover > td.el-table__cell) {
  background-color: #f2f7fc !important;
}

/* ================= 极简行内即时编辑 ================= */
.inline-edit-cell {
  border: 1px dashed transparent;
  padding: 2px 6px;
  border-radius: 3px;
  min-height: 28px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: 1;
  transition: all 0.12s ease-in-out;
}

.inline-edit-cell:hover {
  border-color: rgba(55, 53, 47, 0.16);
  background-color: var(--notion-hover);
}

.add-sub-child-btn {
  visibility: hidden;
  font-size: 11px;
  margin-left: 10px;
  color: var(--el-color-primary);
}

.inline-edit-cell:hover .add-sub-child-btn {
  visibility: visible;
}

.inline-edit-cell :deep(.el-input),
.inline-edit-cell :deep(.el-textarea) {
  width: 100% !important;
  display: block !important;
}

.inline-edit-cell :deep(.el-input__wrapper) {
  box-shadow: none !important;
  background-color: transparent !important;
  padding: 0 !important;
}

.inline-edit-cell :deep(.el-input__inner) {
  font-size: 13px;
  color: var(--notion-text);
  height: 28px;
  border-bottom: 1.5px solid var(--el-color-primary);
  border-radius: 0;
}

.inline-edit-cell :deep(.el-textarea__inner) {
  box-shadow: none !important;
  background-color: transparent !important;
  font-size: 13px !important;
  color: var(--notion-text);
  line-height: 1.6 !important;
  font-family: inherit !important;
  border: none !important;
  border-bottom: 1.5px solid var(--el-color-primary) !important;
  border-radius: 0 !important;
  resize: none;
  min-height: 28px !important;
  box-sizing: border-box !important;
  padding-top: 4px !important;
  padding-bottom: 12px !important;
  padding-left: 0 !important;
  padding-right: 0 !important;
  overflow-y: hidden !important;
  scrollbar-width: none !important;
  -ms-overflow-style: none !important;
}

.inline-edit-cell :deep(.el-textarea__inner)::-webkit-scrollbar {
  display: none !important;
  width: 0 !important;
  height: 0 !important;
}

.date-preview-text {
  font-size: 12px;
  color: rgba(55, 53, 47, 0.7);
}

.custom-field-text,
.cell-text {
  font-size: 13px;
  color: var(--notion-text);
  line-height: 1.6;
  white-space: pre-wrap;
  overflow-wrap: break-word;
  word-break: break-word;
  display: block;
  width: 100%;
  text-align: left;
}

.completed-style {
  text-decoration: line-through;
  color: rgba(55, 53, 47, 0.35);
}

.assignee-tag {
  font-size: 11px;
  background-color: rgba(55, 53, 47, 0.05);
  border: none;
  padding: 3px 8px;
  border-radius: 3px;
  color: var(--notion-text);
  display: inline-flex;
  align-items: center;
  font-weight: 500;
}

/* ================= 底部追加新行区域 ================= */
.excel-quick-append-row {
  height: 48px !important;
  background-color: #fafafa;
  border: 1px solid var(--notion-border);
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
  box-shadow: 0 0 0 1px var(--notion-border) inset !important;
}

.excel-quick-append-row :deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px rgba(55, 53, 47, 0.25) inset !important;
}

.excel-quick-append-row :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 1px var(--el-color-primary) inset !important;
}

.append-tag {
  font-size: 12px;
  color: var(--el-color-primary);
  font-weight: 600;
  margin-right: 15px;
  flex-shrink: 0;
}

.empty-board-state {
  flex: 1;
  background-color: var(--notion-bg);
  border-radius: 4px;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 1px 2px rgba(15, 15, 15, 0.04);
}

/* 树形缩进控制 */
.excel-table-style :deep(.el-table__row--level-1) .el-table__indent {
  padding-left: 32px !important;
}

.excel-table-style :deep(.el-table__row--level-2) .el-table__indent {
  padding-left: 64px !important;
}

.excel-table-style :deep(.el-table__row--level-1) .cell-text {
  color: rgba(55, 53, 47, 0.75) !important;
  font-size: 12.5px;
}

.excel-table-style :deep(.el-table__row--level-1) .assignee-tag {
  opacity: 0.85;
}

/* ================= 属性标签面板与 Inspector ================= */
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
  transition: all 0.12s ease-in-out;
}

.properties-preview-box:hover {
  border-color: rgba(55, 53, 47, 0.16);
  background-color: var(--notion-hover);
}

.properties-placeholder {
  font-size: 11px;
  color: rgba(55, 53, 47, 0.35);
  padding-left: 6px;
}

.property-inspector {
  padding: 5px;
}

.inspector-title {
  margin: 0 0 10px 0;
  font-size: 12px;
  color: var(--notion-text);
  border-bottom: 1px solid var(--notion-border-light);
  padding-bottom: 6px;
  font-weight: 600;
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
  border-bottom: 1px dashed var(--notion-border-light);
}

.property-item-row:last-child {
  border-bottom: none;
}

.prop-badge {
  font-size: 11px;
  color: rgba(55, 53, 47, 0.8);
}

.no-props-placeholder {
  font-size: 11px;
  color: rgba(55, 53, 47, 0.35);
  text-align: center;
  padding: 10px 0;
}

.add-property-form {
  display: flex;
  border-top: 1px solid var(--notion-border-light);
  padding-top: 10px;
}

/* ================= Notion 软色调 Tag ================= */
:deep(.el-tag) {
  border: none !important;
  font-weight: 500;
  border-radius: 3px !important;
  padding: 0 8px !important;
  height: 20px !important;
  line-height: 20px !important;
  font-size: 11px !important;
  letter-spacing: 0.3px;
}

:deep(.el-tag--success) {
  background-color: #e2f5ec !important;
  color: #0d7c50 !important;
}

:deep(.el-tag--warning) {
  background-color: #fdecc8 !important;
  color: #b36b00 !important;
}

:deep(.el-tag--danger) {
  background-color: #ffe2dd !important;
  color: #df4331 !important;
}

:deep(.el-tag--info) {
  background-color: #eeeeee !important;
  color: #555555 !important;
}

:deep(.el-tag--primary) {
  background-color: #e0f0ff !important;
  color: #0f73da !important;
}
</style>