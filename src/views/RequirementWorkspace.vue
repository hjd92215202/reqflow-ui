<!-- src/views/RequirementWorkspace.vue -->
<template>
  <div class="workspace">
    <!-- 面包屑与需求头 -->
    <header class="workspace-head">
      <div class="crumb" @click="router.push('/requirements')">需求 <span>/</span></div>
      <div class="title-row">
        <h1>{{ requirement?.title || '需求加载中...' }}</h1>

        <!-- 点击优先级快速切换 -->
        <el-dropdown trigger="click" @command="handleQuickPriorityChange">
          <span class="interactive-chip" title="点击修改优先级">
            <StatusChip v-if="requirement" :status="requirement.priority" />
            <i class="arrow-icon">▾</i>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="HIGH">P1 (高)</el-dropdown-item>
              <el-dropdown-item command="MEDIUM">P2 (中)</el-dropdown-item>
              <el-dropdown-item command="LOW">P3 (低)</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>

        <!-- 点击状态快速切换 -->
        <el-dropdown trigger="click" @command="handleQuickStatusChange">
          <span class="interactive-chip" title="点击修改状态">
            <StatusChip v-if="requirement" :status="requirement.status" />
            <i class="arrow-icon">▾</i>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="TODO">待处理</el-dropdown-item>
              <el-dropdown-item command="IN_PROGRESS">进行中</el-dropdown-item>
              <el-dropdown-item command="TESTING">测试中</el-dropdown-item>
              <el-dropdown-item command="DONE">已完成</el-dropdown-item>
              <el-dropdown-item command="SUSPENDED">已挂起</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>

        <!-- 编辑需求基础信息按钮 -->
        <el-button
          v-if="requirement"
          link
          type="primary"
          size="small"
          class="edit-req-btn"
          @click="openEditReqModal"
        >
          ✏️ 编辑需求与排期
        </el-button>
      </div>

      <p>{{ requirement?.description || '补充需求背景和成功标准，让团队知道为什么做。' }}</p>

      <div class="meta">
        <span class="clickable-meta-date" title="点击修改需求排期" @click="openEditReqModal">
          📅 交付排期：{{ formatReqSchedule(requirement) }} ✏️
        </span>
        <span>完成度 {{ percent }}%</span>
        <span>{{ stages.length }} 个阶段</span>
      </div>
    </header>

    <!-- 动态选项卡：三个标准支柱 -->
    <nav class="tabs">
      <button
        v-for="t in availableTabs"
        :key="t.value"
        :class="{ active: tab === t.value }"
        @click="tab = t.value"
      >
        {{ t.label }}
      </button>
    </nav>

    <!-- 1. 概览 Tab (单栏饱满布局) -->
    <section v-if="tab === 'overview'" class="overview-layout">
      <div class="surface progress-card">
        <div class="section-head">
          <div>
            <h2>交付概览</h2>
            <span>全需求各阶段整体推进情况</span>
          </div>
          <el-button type="primary" size="small" @click="tab = 'execution'">继续执行</el-button>
        </div>
        <div class="overview-progress">
          <div class="big-percent">{{ percent }}<small>%</small></div>
          <div class="bar"><i :style="{ width: percent + '%' }"></i></div>
          <span>{{ doneTasks }} / {{ totalTasks }} 个任务完成</span>
        </div>
      </div>

      <div class="surface stage-card">
        <div class="section-head">
          <div>
            <h2>阶段列表</h2>
            <span>按交付里程碑拆解推进</span>
          </div>
          <el-button text size="small" @click="tab = 'execution'">管理与编辑阶段 ➔</el-button>
        </div>

        <div class="stage-list-body">
          <div
            v-for="(s, i) in paginatedOverviewStages"
            :key="s.id"
            class="stage-row"
            @click="handleSelectStage(s)"
          >
            <span class="index">{{
              String((overviewStagePage - 1) * overviewStagePageSize + i + 1).padStart(2, '0')
            }}</span>
            <div class="stage-main">
              <strong>{{ s.title }}</strong>
              <span>{{ s.startDate || '未定' }} → {{ s.endDate || '未定' }}</span>
            </div>
            <StatusChip :status="s.status" />
            <span class="stage-percent">{{ stagePercent(s.id) }}%</span>
          </div>
          <el-empty v-if="!stages.length && !loading" description="还没有阶段" />
        </div>

        <div v-if="stages.length > overviewStagePageSize" class="card-pagination">
          <el-pagination
            v-model:current-page="overviewStagePage"
            :page-size="overviewStagePageSize"
            :total="stages.length"
            layout="total, prev, pager, next"
            size="small"
          />
        </div>
      </div>
    </section>

    <!-- 2. 执行 Tab -->
    <section
      v-else-if="tab === 'execution'"
      class="execution unified-container"
      :class="{ 'with-inspector': Boolean(selectedTask) }"
    >
      <aside class="stage-nav surface">
        <div class="section-title">执行阶段</div>
        <div class="stage-nav-list">
          <div
            v-for="s in stages"
            :key="s.id"
            :class="['stage-nav-item', { active: selectedStage?.id === s.id }]"
            @click="selectStage(s)"
          >
            <div class="stage-btn-main">
              <span class="stage-btn-title" :title="s.title">{{ s.title }}</span>
              <small>{{ stagePercent(s.id) }}%</small>
            </div>

            <el-dropdown trigger="click" @click.stop>
              <span class="stage-more-btn">⋯</span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="openEditStage(s)">✏️ 修改阶段与排期</el-dropdown-item>
                  <el-dropdown-item divided style="color: #f56c6c" @click="handleDeleteStage(s)">
                    🗑️ 删除该阶段
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
        <el-button text class="add-stage" @click="openCreateStage">+ 新阶段</el-button>
      </aside>

      <div class="task-area surface">
        <div class="task-head">
          <div>
            <span class="eyebrow">EXECUTION</span>
            <div class="stage-title-heading">
              <h2>{{ selectedStage?.title || '请选择阶段' }}</h2>
              <el-button
                v-if="selectedStage"
                link
                size="small"
                type="primary"
                @click="openEditStage(selectedStage)"
              >
                ✏️ 修改此阶段
              </el-button>
            </div>
            <p
              class="clickable-stage-schedule"
              title="点击修改阶段排期"
              @click="selectedStage && openEditStage(selectedStage)"
            >
              📅 排期：{{ selectedStage?.startDate || '未定' }} →
              {{ selectedStage?.endDate || '未定' }}
            </p>
          </div>

          <div class="task-actions">
            <el-button type="primary" size="small" @click="createTask">+ 添加任务</el-button>
          </div>
        </div>

        <div v-if="selectedStage" class="task-grid-wrapper">
          <div class="task-grid-head">
            <span>任务项 (点击行查看/编辑备注)</span>
            <span>状态</span>
            <span>负责人</span>
            <span>任务排期</span>
            <span>操作</span>
          </div>

          <div class="task-grid-body">
            <div
              v-for="task in paginatedTasks"
              :key="task.id"
              :class="['task-row', { 'is-selected': selectedTask?.id === task.id }]"
              @click="selectTaskForDetail(task)"
            >
              <div class="task-title">
                <span class="indent" :style="{ width: task.level * 18 + 'px' }"></span>
                <button
                  class="checkbox"
                  :class="{ done: task.status === 'DONE' }"
                  title="切换完成状态"
                  @click.stop="toggleTask(task)"
                >
                  {{ task.status === 'DONE' ? '✓' : '' }}
                </button>
                <strong :class="{ doneText: task.status === 'DONE' }">{{ task.title }}</strong>

                <el-tooltip
                  v-if="hasNoteOrCustom(task)"
                  :content="getTaskNoteSummary(task)"
                  placement="top"
                  :show-after="200"
                >
                  <span class="note-badge">📝 备注</span>
                </el-tooltip>
              </div>

              <button class="cell-button" @click.stop="cycleStatus(task)">
                <StatusChip :status="task.status" />
              </button>

              <button class="cell-button text" @click.stop="editAssignee(task)">
                {{ task.assignee || '未分配' }}
              </button>

              <div
                class="cell-date-pill"
                :title="task.startDate || task.endDate ? '点击在详情中修改排期' : '点击设置排期'"
                @click.stop="selectTaskForDetail(task)"
              >
                <span v-if="task.startDate || task.endDate" class="date-text-active">
                  📅 {{ formatDateRange(task) }}
                </span>
                <span v-else class="date-text-empty"> + 未排期 </span>
              </div>

              <div class="row-actions" @click.stop>
                <el-button text size="small" @click.stop="addChild(task)">+ 子项</el-button>
                <el-button text type="danger" size="small" @click.stop="removeTask(task)">
                  删除
                </el-button>
              </div>
            </div>

            <div v-if="!flatTasks.length" class="empty-task">
              <el-empty description="这个阶段还没有任务" />
            </div>
          </div>

          <div class="task-pagination-wrapper">
            <el-pagination
              v-model:current-page="taskCurrentPage"
              v-model:page-size="taskPageSize"
              :page-sizes="[10, 15, 20]"
              layout="total, sizes, prev, pager, next"
              :total="flatTasks.length"
              size="small"
              @size-change="taskCurrentPage = 1"
            />
          </div>
        </div>
      </div>

      <!-- 任务详情 Inspector 面板 -->
      <aside v-if="selectedTask" class="inspector surface">
        <div class="inspector-head">
          <div class="inspector-title">
            <span>TASK DETAILS</span>
            <h3>{{ selectedTask.title }}</h3>
          </div>
          <el-button text size="small" @click="selectedTask = null">✕</el-button>
        </div>

        <div class="inspector-body">
          <div class="prop-item">
            <label>任务名称</label>
            <el-input
              v-model="selectedTask.title"
              size="small"
              @blur="saveSelectedTask"
              @keyup.enter="saveSelectedTask"
            />
          </div>

          <div class="prop-item">
            <label>状态</label>
            <el-select
              v-model="selectedTask.status"
              size="small"
              style="width: 100%"
              @change="saveSelectedTask"
            >
              <el-option label="待处理" value="TODO" />
              <el-option label="进行中" value="IN_PROGRESS" />
              <el-option label="已完成" value="DONE" />
            </el-select>
          </div>

          <div class="prop-item">
            <label>负责人</label>
            <el-input
              v-model="selectedTask.assignee"
              size="small"
              placeholder="指派给..."
              @blur="saveSelectedTask"
              @keyup.enter="saveSelectedTask"
            />
          </div>

          <div class="prop-item">
            <label>起止排期</label>
            <el-date-picker
              v-model="selectedTaskDateRange"
              type="daterange"
              range-separator="-"
              start-placeholder="开始"
              end-placeholder="截止"
              size="small"
              value-format="YYYY-MM-DD"
              style="width: 100%"
              @change="handleInspectorDateChange"
            />
          </div>

          <div class="prop-item notes-section">
            <div class="notes-header">
              <label>📝 执行备注与说明</label>
              <span class="save-tip">失焦自动保存</span>
            </div>
            <el-input
              v-model="selectedTaskNote"
              type="textarea"
              :rows="4"
              placeholder="在此记录任务执行说明、排查记录、设计链接或联调进展..."
              @blur="saveSelectedTaskNote"
            />
          </div>

          <div class="prop-item custom-props">
            <div class="notes-header">
              <label>扩展属性 (JSONB)</label>
              <el-button link size="small" type="primary" @click="promptAddCustomField"
                >+ 加字段</el-button
              >
            </div>
            <div
              v-for="(val, key) in customFieldsExcludingNote"
              :key="key"
              class="custom-field-row"
            >
              <span class="custom-key" :title="key">{{ key }}:</span>
              <el-input
                v-model="selectedTask.customFields[key]"
                size="small"
                class="custom-val-input"
                @blur="saveSelectedTask"
              />
              <span class="delete-prop-btn" title="删除该字段" @click="deleteCustomField(key)"
                >✕</span
              >
            </div>
          </div>
        </div>
      </aside>
    </section>

    <!-- 3. 知识库 Tab -->
    <section v-else class="surface full knowledge-section unified-container">
      <template v-if="!activeDoc">
        <div class="section-head">
          <div>
            <h2>需求知识库</h2>
            <span>技术方案、踩坑记录与实施复盘文档列表</span>
          </div>
          <div class="knowledge-head-actions">
            <el-input
              v-model="docSearchKeyword"
              clearable
              size="small"
              placeholder="搜索文档标题或标签..."
              style="width: 220px"
            >
              <template #prefix>⌕</template>
            </el-input>
            <el-button type="primary" size="small" @click="createNewDoc">+ 新建文档</el-button>
          </div>
        </div>

        <div class="doc-table-container">
          <el-table
            :data="paginatedDocs"
            class="doc-list-table"
            row-key="id"
            height="100%"
            @row-click="openDocEditor"
          >
            <el-table-column label="文档标题" min-width="260">
              <template #default="{ row }">
                <div class="doc-title-cell">
                  <span class="doc-table-badge">DOC</span>
                  <strong class="doc-title-text">{{ row.title || '未命名文档' }}</strong>
                </div>
              </template>
            </el-table-column>

            <el-table-column label="标签 / 分类" width="200">
              <template #default="{ row }">
                <div v-if="row.tags" class="doc-tags-wrap">
                  <el-tag
                    v-for="tag in formatTags(row.tags)"
                    :key="tag"
                    size="small"
                    effect="plain"
                    class="doc-tag-item"
                  >
                    {{ tag }}
                  </el-tag>
                </div>
                <span v-else class="empty-tag-text">未分类</span>
              </template>
            </el-table-column>

            <el-table-column label="更新时间" width="180" align="center">
              <template #default="{ row }">
                <span class="doc-date-text">{{ formatFullDate(row.updatedAt) }}</span>
              </template>
            </el-table-column>

            <el-table-column label="操作" width="180" align="right">
              <template #default="{ row }">
                <div class="doc-actions-cell" @click.stop>
                  <el-button link type="primary" size="small" @click="openDocEditor(row)">
                    编辑 ➔
                  </el-button>
                  <el-button link size="small" @click="shareDoc(row)"> 分享 </el-button>
                  <el-button link type="danger" size="small" @click="removeDoc(row)">
                    删除
                  </el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>

          <div v-if="!filteredDocs.length" class="empty-knowledge-list">
            <el-empty description="暂无符合条件的知识文档，点击右上角「+ 新建文档」" />
          </div>
        </div>

        <div class="doc-pagination-wrapper">
          <el-pagination
            v-model:current-page="docCurrentPage"
            v-model:page-size="docPageSize"
            :page-sizes="[10, 15, 20]"
            layout="total, sizes, prev, pager, next"
            :total="filteredDocs.length"
            size="small"
            @size-change="docCurrentPage = 1"
          />
        </div>
      </template>

      <!-- 沉浸式编辑器 -->
      <template v-else>
        <div class="doc-editor-container">
          <div class="editor-head">
            <div class="editor-back" @click="activeDoc = null">
              <span>← 返回文档列表</span>
              <h2>{{ activeDoc.title || '未命名文档' }}</h2>
            </div>
            <div class="editor-actions">
              <div class="view-tabs">
                <button :class="{ active: editorMode === 'edit' }" @click="editorMode = 'edit'">
                  编辑
                </button>
                <button :class="{ active: editorMode === 'split' }" @click="editorMode = 'split'">
                  分屏
                </button>
                <button
                  :class="{ active: editorMode === 'preview' }"
                  @click="editorMode = 'preview'"
                >
                  阅读
                </button>
              </div>
              <el-button size="small" @click="shareDoc(activeDoc)">分享</el-button>
              <el-button type="primary" size="small" :loading="savingDoc" @click="saveActiveDoc">
                保存
              </el-button>
            </div>
          </div>

          <div class="doc-meta-inputs">
            <el-input
              v-model="activeDoc.title"
              placeholder="文档标题"
              class="title-input"
              size="small"
            />
            <el-input
              v-model="activeDoc.tags"
              placeholder="标签，逗号隔开 (如: 技术方案,架构)"
              size="small"
            />
          </div>

          <div class="doc-body-split" :class="'mode-' + editorMode">
            <div v-show="editorMode !== 'preview'" class="editor-pane">
              <MarkdownEditor v-model="activeDoc.content" />
            </div>
            <div v-if="editorMode === 'split'" class="split-divider"></div>
            <div v-show="editorMode !== 'edit'" class="preview-pane">
              <MarkdownPreview :source="activeDoc.content" :editable-task="true" />
            </div>
          </div>
        </div>
      </template>
    </section>

    <!-- 分享文档链接弹窗 -->
    <el-dialog v-model="shareVisible" title="分享文档" width="490px">
      <p class="share-tip">生成基于 16 位随机令牌的只读公开链接，对方免登录直接查看。</p>
      <el-input v-model="shareUrl" readonly class="share-input">
        <template #append>
          <el-button @click="copyShareUrl">复制</el-button>
        </template>
      </el-input>
      <template #footer>
        <el-button @click="shareVisible = false">关闭</el-button>
        <el-button type="primary" @click="copyShareUrl">复制链接</el-button>
      </template>
    </el-dialog>

    <!-- 阶段弹窗 -->
    <el-dialog
      v-model="stageDialog"
      :title="isEditingStage ? '修改执行阶段' : '添加执行阶段'"
      width="460px"
    >
      <el-form :model="stageForm" label-position="top">
        <el-form-item label="阶段名称" required>
          <el-input v-model="stageForm.title" placeholder="例如：开发编码、测试验收、上线发布" />
        </el-form-item>
        <el-form-item v-if="isEditingStage" label="阶段状态">
          <el-select v-model="stageForm.status" style="width: 100%">
            <el-option label="待处理" value="TODO" />
            <el-option label="进行中" value="IN_PROGRESS" />
            <el-option label="已完成" value="DONE" />
          </el-select>
        </el-form-item>
        <el-form-item label="起止排期">
          <el-date-picker v-model="stageForm.range" type="daterange" value-format="YYYY-MM-DD" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="stageDialog = false">取消</el-button>
        <el-button type="primary" @click="saveStage">
          {{ isEditingStage ? '保存修改' : '确认添加' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 需求属性编辑弹窗 -->
    <el-dialog v-model="reqDialogVisible" title="编辑需求" width="520px" destroy-on-close>
      <el-form :model="reqForm" label-position="top">
        <el-form-item label="需求名称" required>
          <el-input v-model="reqForm.title" placeholder="需求名称" />
        </el-form-item>
        <el-form-item label="为什么做？(业务背景与目标)">
          <el-input
            v-model="reqForm.description"
            type="textarea"
            :rows="4"
            placeholder="描述业务背景、核心价值与成功标准..."
          />
        </el-form-item>
        <div class="form-grid-two">
          <el-form-item label="优先级">
            <el-select v-model="reqForm.priority" style="width: 100%">
              <el-option label="P1 (高)" value="HIGH" />
              <el-option label="P2 (中)" value="MEDIUM" />
              <el-option label="P3 (低)" value="LOW" />
            </el-select>
          </el-form-item>
          <el-form-item label="目标交付日期">
            <el-date-picker
              v-model="reqForm.endDate"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="选择交付日期"
              style="width: 100%"
            />
          </el-form-item>
        </div>
        <el-form-item label="需求状态">
          <el-select v-model="reqForm.status" style="width: 100%">
            <el-option label="待处理" value="TODO" />
            <el-option label="进行中" value="IN_PROGRESS" />
            <el-option label="测试中" value="TESTING" />
            <el-option label="已完成" value="DONE" />
            <el-option label="已挂起" value="SUSPENDED" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="reqDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveRequirement">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getRequirementsListApi, updateRequirementApi } from '@/api/requirement'
import { getStagesApi, createStageApi, updateStageApi, deleteStageApi } from '@/api/stage'
import { getSubTasksApi, createSubTaskApi, updateSubTaskApi, deleteSubTaskApi } from '@/api/subtask'
import {
  getWikiListApi,
  createWikiApi,
  updateWikiApi,
  deleteWikiApi,
  getDocShareTokenApi
} from '@/api/wiki'
import { useUserStore } from '@/store/user'
import StatusChip from '@/components/workspace/StatusChip.vue'
import MarkdownEditor from '@/components/markdown/MarkdownEditor.vue'
import MarkdownPreview from '@/components/markdown/MarkdownPreview.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const loading = ref(false)
const requirement = ref(null)
const stages = ref([])

const cleanTab = t => (t === 'plan' || t === 'activity' ? 'overview' : t || 'overview')
const tab = ref(cleanTab(route.query.tab))

const selectedStage = ref(null)
const tasks = ref({})
const docs = ref([])
const docSearchKeyword = ref('')

// 需求排期与属性弹窗
const reqDialogVisible = ref(false)
const reqForm = ref({})

// 阶段弹窗状态
const stageDialog = ref(false)
const isEditingStage = ref(false)
const editingStageId = ref(null)
const stageForm = ref({ title: '', status: 'TODO', range: [] })

// 分页状态
const overviewStagePage = ref(1)
const overviewStagePageSize = ref(5)
const taskCurrentPage = ref(1)
const taskPageSize = ref(10)
const docCurrentPage = ref(1)
const docPageSize = ref(10)

// 任务详情抽屉
const selectedTask = ref(null)
const selectedTaskDateRange = ref([])
const selectedTaskNote = ref('')

// 知识库状态
const activeDoc = ref(null)
const editorMode = ref('split')
const savingDoc = ref(false)
const shareVisible = ref(false)
const shareUrl = ref('')

const availableTabs = [
  { value: 'overview', label: 'Overview' },
  { value: 'execution', label: 'Execution' },
  { value: 'knowledge', label: 'Knowledge' }
]

// 需求总体进度百分比
const percent = computed(() => {
  const all = Object.values(tasks.value).flat()
  if (!all.length) return 0
  const done = all.filter(t => t.status === 'DONE').length
  return Math.round((done / all.length) * 100)
})

const totalTasks = computed(() => Object.values(tasks.value).flat().length)
const doneTasks = computed(
  () =>
    Object.values(tasks.value)
      .flat()
      .filter(t => t.status === 'DONE').length
)

const paginatedOverviewStages = computed(() => {
  const start = (overviewStagePage.value - 1) * overviewStagePageSize.value
  return stages.value.slice(start, start + overviewStagePageSize.value)
})

const filteredDocs = computed(() => {
  const q = docSearchKeyword.value.trim().toLowerCase()
  if (!q) return docs.value
  return docs.value.filter(
    d => (d.title || '').toLowerCase().includes(q) || (d.tags || '').toLowerCase().includes(q)
  )
})

const paginatedDocs = computed(() => {
  const start = (docCurrentPage.value - 1) * docPageSize.value
  return filteredDocs.value.slice(start, start + docPageSize.value)
})

const formatTags = tags => {
  if (!tags) return []
  return tags
    .split(/[,，]/)
    .map(t => t.trim())
    .filter(Boolean)
}

const flatTasks = computed(() => {
  if (!selectedStage.value) return []
  const list = tasks.value[selectedStage.value.id] || []
  return buildTree(list)
})

const paginatedTasks = computed(() => {
  const start = (taskCurrentPage.value - 1) * taskPageSize.value
  const end = start + taskPageSize.value
  return flatTasks.value.slice(start, end)
})

const buildTree = list => {
  const out = []
  const map = {}
  list.forEach(x => {
    if (!x.customFields) x.customFields = {}
    x.children = []
    map[x.id] = x
  })
  list.forEach(x => {
    if (x.parentId && map[x.parentId]) {
      map[x.parentId].children.push(x)
    } else {
      out.push(x)
    }
  })
  const flat = (arr, l = 0) =>
    arr.flatMap(x => [{ ...x, level: l }, ...flat(x.children || [], l + 1)])
  return flat(out)
}

const stagePercent = id => {
  const list = tasks.value[id] || []
  if (!list.length) return 0
  return Math.round((list.filter(t => t.status === 'DONE').length / list.length) * 100)
}

const selectStage = async s => {
  selectedStage.value = s
  selectedTask.value = null
  taskCurrentPage.value = 1
  if (!tasks.value[s.id]) {
    try {
      tasks.value[s.id] = await getSubTasksApi(s.id)
    } catch {
      tasks.value[s.id] = []
    }
  }
}

const handleSelectStage = s => {
  selectStage(s)
  tab.value = 'execution'
}

// ---------------- 需求属性编辑核心逻辑 ----------------
const formatReqSchedule = r => {
  if (!r) return '未定'
  if (r.startDate && r.endDate) return `${r.startDate} 至 ${r.endDate}`
  if (r.endDate) return `截止: ${r.endDate}`
  return '未设定排期'
}

const openEditReqModal = () => {
  if (!requirement.value) return
  reqForm.value = { ...requirement.value }
  reqDialogVisible.value = true
}

const handleQuickPriorityChange = async priority => {
  if (!requirement.value) return
  requirement.value.priority = priority
  await updateRequirementApi(requirement.value.id, requirement.value)
  ElMessage.success('需求优先级已更新')
}

const handleQuickStatusChange = async status => {
  if (!requirement.value) return
  requirement.value.status = status
  await updateRequirementApi(requirement.value.id, requirement.value)
  ElMessage.success('需求状态已更新')
}

const saveRequirement = async () => {
  if (!reqForm.value.title?.trim()) {
    return ElMessage.warning('需求名称不能为空')
  }

  try {
    const updated = await updateRequirementApi(reqForm.value.id, reqForm.value)
    requirement.value = { ...requirement.value, ...updated }
    reqDialogVisible.value = false
    ElMessage.success('需求已保存')
  } catch {}
}

// ---------------- 阶段增、删、改逻辑 ----------------
const openCreateStage = () => {
  isEditingStage.value = false
  editingStageId.value = null
  stageForm.value = { title: '', status: 'TODO', range: [] }
  stageDialog.value = true
}

const openEditStage = s => {
  isEditingStage.value = true
  editingStageId.value = s.id
  stageForm.value = {
    title: s.title,
    status: s.status || 'TODO',
    range: s.startDate && s.endDate ? [s.startDate, s.endDate] : []
  }
  stageDialog.value = true
}

const saveStage = async () => {
  if (!stageForm.value.title.trim()) {
    return ElMessage.warning('阶段名称不能为空')
  }

  const startDate = stageForm.value.range?.[0] || null
  const endDate = stageForm.value.range?.[1] || null

  try {
    if (isEditingStage.value) {
      const payload = {
        id: editingStageId.value,
        requirementId: requirement.value.id,
        title: stageForm.value.title,
        status: stageForm.value.status,
        startDate,
        endDate
      }
      const updated = await updateStageApi(editingStageId.value, payload)
      const idx = stages.value.findIndex(item => item.id === editingStageId.value)
      if (idx !== -1) {
        stages.value[idx] = { ...stages.value[idx], ...updated }
      }
      if (selectedStage.value?.id === editingStageId.value) {
        selectedStage.value = { ...selectedStage.value, ...updated }
      }
      ElMessage.success('阶段修改成功')
    } else {
      const created = await createStageApi({
        requirementId: requirement.value.id,
        title: stageForm.value.title,
        startDate,
        endDate
      })
      stages.value.push(created)
      tasks.value[created.id] = []
      if (!selectedStage.value) {
        selectedStage.value = created
      }
      ElMessage.success('阶段添加成功')
    }
    stageDialog.value = false
  } catch {}
}

const handleDeleteStage = s => {
  ElMessageBox.confirm(
    `确定要删除阶段「${s.title}」吗？该阶段下的所有子任务将被一并删除。`,
    '删除阶段',
    {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning'
    }
  )
    .then(async () => {
      await deleteStageApi(s.id)
      delete tasks.value[s.id]
      stages.value = stages.value.filter(item => item.id !== s.id)
      if (selectedStage.value?.id === s.id) {
        selectedStage.value = stages.value.length ? stages.value[0] : null
        selectedTask.value = null
      }
      ElMessage.success('阶段已删除')
    })
    .catch(() => {})
}

// ---------------- 任务操作 ----------------
const formatDateRange = task => {
  if (task.startDate && task.endDate) {
    return `${task.startDate} ~ ${task.endDate}`
  }
  if (task.endDate) return `截止: ${task.endDate}`
  return ''
}

const toggleTask = async t => {
  const newStatus = t.status === 'DONE' ? 'IN_PROGRESS' : 'DONE'
  t.status = newStatus

  const currentStageId = selectedStage.value?.id
  if (currentStageId && tasks.value[currentStageId]) {
    const original = tasks.value[currentStageId].find(item => item.id === t.id)
    if (original) original.status = newStatus
    tasks.value = { ...tasks.value }
  }

  if (selectedTask.value && selectedTask.value.id === t.id) {
    selectedTask.value.status = newStatus
  }

  try {
    await updateSubTaskApi(t.id, { ...t, status: newStatus })
  } catch {
    ElMessage.error('更新状态失败')
  }
}

const cycleStatus = async t => {
  const next = { TODO: 'IN_PROGRESS', IN_PROGRESS: 'DONE', DONE: 'TODO' }
  const newStatus = next[t.status] || 'TODO'

  t.status = newStatus
  const currentStageId = selectedStage.value?.id
  if (currentStageId && tasks.value[currentStageId]) {
    const original = tasks.value[currentStageId].find(item => item.id === t.id)
    if (original) original.status = newStatus
    tasks.value = { ...tasks.value }
  }

  if (selectedTask.value && selectedTask.value.id === t.id) {
    selectedTask.value.status = newStatus
  }

  try {
    await updateSubTaskApi(t.id, { ...t, status: newStatus })
  } catch {}
}

const editAssignee = t => {
  ElMessageBox.prompt('请输入任务负责人姓名', '指定负责人', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    inputValue: t.assignee || ''
  })
    .then(async ({ value }) => {
      const val = (value || '').trim()
      t.assignee = val
      const currentStageId = selectedStage.value?.id
      if (currentStageId && tasks.value[currentStageId]) {
        const original = tasks.value[currentStageId].find(item => item.id === t.id)
        if (original) original.assignee = val
        tasks.value = { ...tasks.value }
      }
      if (selectedTask.value?.id === t.id) {
        selectedTask.value.assignee = val
      }
      await updateSubTaskApi(t.id, { ...t })
      ElMessage.success('负责人已更新')
    })
    .catch(() => {})
}

const removeTask = t => {
  ElMessageBox.confirm('确定要删除该任务吗？其子项也将同步删除。', '删除任务', { type: 'warning' })
    .then(async () => {
      await deleteSubTaskApi(t.id)
      if (selectedTask.value?.id === t.id) {
        selectedTask.value = null
      }
      const currentStageId = selectedStage.value?.id
      if (currentStageId && tasks.value[currentStageId]) {
        tasks.value[currentStageId] = tasks.value[currentStageId].filter(item => item.id !== t.id)
        tasks.value = { ...tasks.value }
      }
      ElMessage.success('任务已删除')
    })
    .catch(() => {})
}

const addChild = async t => {
  try {
    const created = await createSubTaskApi({
      stageId: selectedStage.value.id,
      parentId: t.id,
      parent_id: t.id,
      title: '新拆解子项',
      assignee: t.assignee || '',
      status: 'TODO',
      customFields: {}
    })
    const currentStageId = selectedStage.value.id
    if (!tasks.value[currentStageId]) tasks.value[currentStageId] = []
    tasks.value[currentStageId].push(created)
    tasks.value = { ...tasks.value }
  } catch {}
}

const createTask = async () => {
  if (!selectedStage.value) return
  try {
    const created = await createSubTaskApi({
      stageId: selectedStage.value.id,
      title: '新任务',
      assignee: '',
      status: 'TODO',
      customFields: {}
    })
    const currentStageId = selectedStage.value.id
    if (!tasks.value[currentStageId]) tasks.value[currentStageId] = []
    tasks.value[currentStageId].push(created)
    tasks.value = { ...tasks.value }
    ElMessage.success('任务已添加')
  } catch {}
}

const selectTaskForDetail = task => {
  selectedTask.value = task
  if (!task.customFields) task.customFields = {}
  selectedTaskDateRange.value = task.startDate && task.endDate ? [task.startDate, task.endDate] : []
  selectedTaskNote.value = task.customFields['备注'] || ''
}

const hasNoteOrCustom = task => {
  if (!task.customFields) return false
  return Object.keys(task.customFields).some(k => Boolean(task.customFields[k]))
}

const getTaskNoteSummary = task => {
  if (!task.customFields) return '暂无备注'
  const note = task.customFields['备注']
  if (note) return note
  const firstKey = Object.keys(task.customFields)[0]
  return `${firstKey}: ${task.customFields[firstKey]}`
}

const saveSelectedTask = async () => {
  if (!selectedTask.value) return
  try {
    await updateSubTaskApi(selectedTask.value.id, { ...selectedTask.value })
    const currentStageId = selectedStage.value?.id
    if (currentStageId && tasks.value[currentStageId]) {
      const idx = tasks.value[currentStageId].findIndex(i => i.id === selectedTask.value.id)
      if (idx !== -1) {
        tasks.value[currentStageId][idx] = { ...selectedTask.value }
        tasks.value = { ...tasks.value }
      }
    }
  } catch {}
}

const saveSelectedTaskNote = async () => {
  if (!selectedTask.value) return
  if (!selectedTask.value.customFields) selectedTask.value.customFields = {}
  selectedTask.value.customFields['备注'] = selectedTaskNote.value
  await saveSelectedTask()
  ElMessage.success('备注已保存')
}

const handleInspectorDateChange = async () => {
  if (!selectedTask.value) return
  if (selectedTaskDateRange.value && selectedTaskDateRange.value.length === 2) {
    selectedTask.value.startDate = selectedTaskDateRange.value[0]
    selectedTask.value.endDate = selectedTaskDateRange.value[1]
  } else {
    selectedTask.value.startDate = null
    selectedTask.value.endDate = null
  }
  await saveSelectedTask()
}

const customFieldsExcludingNote = computed(() => {
  if (!selectedTask.value?.customFields) return {}
  const res = {}
  Object.keys(selectedTask.value.customFields).forEach(k => {
    if (k !== '备注') res[k] = selectedTask.value.customFields[k]
  })
  return res
})

const promptAddCustomField = () => {
  ElMessageBox.prompt('请输入扩展属性名称（如：Bug单号、设计稿Link、测试人）', '添加属性', {
    confirmButtonText: '添加',
    cancelButtonText: '取消'
  })
    .then(({ value }) => {
      const key = (value || '').trim()
      if (!key) return
      if (!selectedTask.value.customFields) selectedTask.value.customFields = {}
      selectedTask.value.customFields[key] = ''
      saveSelectedTask()
    })
    .catch(() => {})
}

const deleteCustomField = key => {
  delete selectedTask.value.customFields[key]
  saveSelectedTask()
}

// ---------------- 知识库 ----------------
const openDocEditor = doc => {
  activeDoc.value = { ...doc, content: doc.content || '' }
}

const createNewDoc = async () => {
  try {
    const created = await createWikiApi({
      title: '新设计方案',
      content: '# 技术架构方案设计\n\n## 1. 业务目标\n\n## 2. 方案全景\n\n## 3. 风险与回滚',
      requirementId: requirement.value?.id,
      tags: '方案'
    })
    ElMessage.success('文档已创建')
    await loadDocs()
    activeDoc.value = created
  } catch {}
}

const removeDoc = doc => {
  ElMessageBox.confirm(`确定要彻底删除文档「${doc.title}」吗？`, '删除文档', { type: 'warning' })
    .then(async () => {
      await deleteWikiApi(doc.id)
      ElMessage.success('文档已删除')
      await loadDocs()
    })
    .catch(() => {})
}

const saveActiveDoc = async () => {
  if (!activeDoc.value) return
  savingDoc.value = true
  try {
    await updateWikiApi(activeDoc.value.id, activeDoc.value)
    ElMessage.success('文档已保存')
    await loadDocs()
  } finally {
    savingDoc.value = false
  }
}

const shareDoc = async doc => {
  if (!doc || !doc.id) return
  try {
    const res = await getDocShareTokenApi(doc.id)
    const token = res.shareToken || res.token || res
    shareUrl.value = `${userStore.serverUrl.replace(/\/$/, '')}/share/wiki/${token}`
    shareVisible.value = true
  } catch {
    ElMessage.error('获取分享链接失败')
  }
}

const copyShareUrl = () => {
  if (!shareUrl.value) return
  navigator.clipboard.writeText(shareUrl.value).then(() => {
    ElMessage.success('分享链接已复制到剪贴板')
    shareVisible.value = false
  })
}

const loadDocs = async () => {
  try {
    docs.value = (await getWikiListApi({ requirementId: requirement.value?.id })) || []
  } catch {
    docs.value = []
  }
}

const recordRecentRequirement = req => {
  if (!req || req.id === undefined) return
  try {
    const raw = localStorage.getItem('rf_recent_requirements')
    let list = raw ? JSON.parse(raw) : []
    list = list.filter(x => Number(x.id) !== Number(req.id))
    list.unshift({ id: req.id, title: req.title })
    localStorage.setItem('rf_recent_requirements', JSON.stringify(list.slice(0, 8)))
    window.dispatchEvent(new Event('storage'))
  } catch {}
}

const load = async () => {
  loading.value = true
  try {
    const res = await getRequirementsListApi({ page: 0, size: 200 })
    const list = res?.content || res || []
    requirement.value = list.find(x => Number(x.id) === Number(route.params.id))

    if (requirement.value) {
      recordRecentRequirement(requirement.value)

      stages.value = await getStagesApi(requirement.value.id).catch(() => [])

      if (stages.value.length) {
        await Promise.all(
          stages.value.map(async s => {
            try {
              tasks.value[s.id] = await getSubTasksApi(s.id)
            } catch {
              tasks.value[s.id] = []
            }
          })
        )
        selectedStage.value = stages.value[0]
      }

      await loadDocs()
    }
  } finally {
    loading.value = false
  }
}

const formatFullDate = s => (s ? String(s).replace('T', ' ').slice(0, 16) : '')

onMounted(load)
watch(
  () => route.query.tab,
  v => {
    if (v) tab.value = cleanTab(v)
  }
)
watch(
  () => route.params.id,
  () => {
    load()
  }
)
watch(
  () => docSearchKeyword.value,
  () => {
    docCurrentPage.value = 1
  }
)
</script>

<style scoped>
.workspace {
  height: 100%;
  padding: 20px 28px 24px;
  max-width: 1560px;
  margin: 0 auto;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.workspace-head {
  padding: 0 0 14px;
  flex-shrink: 0;
}

.crumb {
  font-size: 11px;
  color: var(--rf-text-3);
  cursor: pointer;
  margin-bottom: 6px;
}

.crumb span {
  padding: 0 5px;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.title-row h1 {
  margin: 0;
  font-size: 26px;
  letter-spacing: -0.5px;
}

.interactive-chip {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 4px;
  border-radius: 4px;
  transition: all 0.15s ease;
}

.interactive-chip:hover {
  background: var(--rf-subtle);
}

.arrow-icon {
  font-style: normal;
  font-size: 10px;
  color: var(--rf-text-3);
}

.edit-req-btn {
  margin-left: 6px;
  font-size: 12px;
}

.workspace-head > p {
  max-width: 820px;
  color: var(--rf-text-2);
  font-size: 13px;
  margin: 6px 0;
}

.meta {
  display: flex;
  gap: 18px;
  color: var(--rf-text-3);
  font-size: 11px;
  align-items: center;
}

.clickable-meta-date {
  cursor: pointer;
  color: var(--rf-brand);
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 4px;
  transition: background-color 0.15s;
}

.clickable-meta-date:hover {
  background: var(--rf-brand-soft);
}

.tabs {
  display: flex;
  gap: 2px;
  border-bottom: 1px solid var(--rf-border);
  margin-bottom: 14px;
  flex-shrink: 0;
}

.tabs button {
  border: 0;
  background: transparent;
  padding: 8px 14px;
  color: var(--rf-text-2);
  font-size: 12px;
  font-weight: 700;
  border-bottom: 2px solid transparent;
  cursor: pointer;
}

.tabs button.active {
  color: var(--rf-brand);
  border-bottom-color: var(--rf-brand);
}

.overview-layout {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.surface {
  background: #fff;
  border: 1px solid var(--rf-border);
  border-radius: 12px;
}

.unified-container {
  height: auto !important;
  flex: 1;
  min-height: 0;
}

.progress-card {
  flex-shrink: 0;
}

.stage-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.stage-list-body {
  flex: 1;
  overflow-y: auto;
}

.card-pagination {
  padding: 10px 16px;
  display: flex;
  justify-content: flex-end;
  border-top: 1px solid var(--rf-border);
  background: #fff;
  flex-shrink: 0;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid var(--rf-border);
  flex-shrink: 0;
}

.section-head h2 {
  margin: 0;
  font-size: 14px;
}

.section-head span {
  font-size: 11px;
  color: var(--rf-text-3);
  display: block;
  margin-top: 3px;
}

.overview-progress {
  padding: 20px 20px;
  display: grid;
  grid-template-columns: 70px 1fr 80px;
  gap: 18px;
  align-items: center;
}

.big-percent {
  font-size: 34px;
  font-weight: 800;
}

.big-percent small {
  font-size: 14px;
  margin-left: 2px;
}

.bar {
  height: 8px;
  background: #eef0f3;
  border-radius: 999px;
  overflow: hidden;
}

.bar i {
  display: block;
  height: 100%;
  background: var(--rf-brand);
}

.stage-row {
  display: grid;
  grid-template-columns: 38px 1fr auto 52px;
  align-items: center;
  gap: 10px;
  padding: 12px 18px;
  border-bottom: 1px solid #f0f1f3;
  cursor: pointer;
}

.stage-row:hover {
  background: #fafbff;
}

.index {
  color: var(--rf-text-3);
  font: 700 10px ui-monospace;
}

.stage-main strong {
  font-size: 13px;
}

.stage-main span {
  display: block;
  color: var(--rf-text-3);
  font-size: 10px;
  margin-top: 3px;
}

.stage-percent {
  font-size: 11px;
  color: var(--rf-text-2);
  text-align: right;
}

.execution {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 210px 1fr;
  gap: 14px;
  transition: all 0.2s ease;
}

.execution.with-inspector {
  grid-template-columns: 200px 1fr 340px;
}

.stage-nav {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 10px;
  overflow: hidden;
}

.stage-nav-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stage-nav-item {
  width: 100%;
  padding: 8px 10px;
  border-radius: 7px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 6px;
  color: var(--rf-text-2);
  font-size: 11px;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.stage-nav-item:hover {
  background: #f7f8fa;
}

.stage-nav-item.active {
  background: var(--rf-brand-soft);
  color: var(--rf-brand);
}

.stage-btn-main {
  flex: 1;
  min-width: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 4px;
}

.stage-btn-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stage-more-btn {
  font-size: 12px;
  color: var(--rf-text-3);
  padding: 0 4px;
  border-radius: 4px;
  opacity: 0;
  transition: all 0.15s ease;
}

.stage-nav-item:hover .stage-more-btn {
  opacity: 1;
}

.stage-more-btn:hover {
  background: rgba(0, 0, 0, 0.06);
  color: var(--rf-text);
}

.add-stage {
  margin-top: 6px;
  flex-shrink: 0;
}

.task-area {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.task-head {
  padding: 12px 18px;
  border-bottom: 1px solid var(--rf-border);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-shrink: 0;
}

.stage-title-heading {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 3px 0 2px;
}

.stage-title-heading h2 {
  margin: 0;
  font-size: 17px;
}

.clickable-stage-schedule {
  margin: 0;
  color: var(--rf-text-3);
  font-size: 10.5px;
  cursor: pointer;
  transition: color 0.15s;
}

.clickable-stage-schedule:hover {
  color: var(--rf-brand);
}

.task-grid-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.task-grid-head,
.task-row {
  display: grid;
  grid-template-columns: minmax(220px, 1fr) 100px 100px 160px 110px;
  align-items: center;
}

.task-grid-head {
  background: #f8f9fb;
  color: var(--rf-text-3);
  font-size: 10px;
  font-weight: 700;
  padding: 8px 12px;
  flex-shrink: 0;
}

.task-grid-body {
  flex: 1;
  overflow-y: auto;
}

.task-row {
  min-height: 44px;
  border-bottom: 1px solid #f0f1f3;
  padding: 0 12px;
  font-size: 11px;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.task-row:hover {
  background: #fafbff;
}

.task-row.is-selected {
  background: #f2f5ff !important;
  border-left: 3px solid var(--rf-brand);
}

.task-title {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 6px;
}

.note-badge {
  font-size: 9.5px;
  color: var(--rf-brand);
  background: var(--rf-brand-soft);
  padding: 1px 6px;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
}

.checkbox {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1px solid #cfd4da;
  background: #fff;
  color: #fff;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  cursor: pointer;
  transition: all 0.15s ease;
}

.checkbox.done {
  background: var(--rf-success) !important;
  border-color: var(--rf-success) !important;
}

.doneText {
  text-decoration: line-through;
  color: var(--rf-text-3);
}

.cell-button {
  border: 0;
  background: transparent;
  cursor: pointer;
  text-align: left;
}

.cell-date-pill {
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  transition: background-color 0.15s;
  display: inline-flex;
  align-items: center;
}

.cell-date-pill:hover {
  background-color: var(--rf-subtle);
}

.date-text-active {
  font-size: 10.5px;
  color: var(--rf-text-2);
}

.date-text-empty {
  font-size: 10.5px;
  color: var(--rf-text-3);
}

.cell-date-pill:hover .date-text-empty {
  color: var(--rf-brand);
}

.row-actions {
  display: flex;
  gap: 4px;
}

.task-pagination-wrapper {
  height: 48px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  border-top: 1px solid var(--rf-border);
  background: #fff;
  flex-shrink: 0;
}

.inspector {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: slideIn 0.2s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.inspector-head {
  padding: 12px 16px;
  border-bottom: 1px solid var(--rf-border);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  flex-shrink: 0;
}

.inspector-title span {
  font-size: 9px;
  font-weight: 800;
  color: var(--rf-brand);
  letter-spacing: 1px;
}

.inspector-title h3 {
  margin: 3px 0 0;
  font-size: 14px;
  color: var(--rf-text);
}

.inspector-body {
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
  flex: 1;
}

.prop-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.prop-item label {
  font-size: 11px;
  font-weight: 700;
  color: var(--rf-text-2);
}

.notes-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.save-tip {
  font-size: 9.5px;
  color: var(--rf-text-3);
}

.custom-props {
  border-top: 1px dashed var(--rf-border);
  padding-top: 12px;
}

.custom-field-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
}

.custom-key {
  font-size: 11px;
  color: var(--rf-text-2);
  width: 70px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.custom-val-input {
  flex: 1;
}

.delete-prop-btn {
  color: #98a2b3;
  cursor: pointer;
  padding: 2px 5px;
}

.delete-prop-btn:hover {
  color: var(--rf-danger);
}

.knowledge-section {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.knowledge-head-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.doc-table-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 0 18px;
}

.doc-list-table {
  width: 100%;
  cursor: pointer;
}

.doc-title-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.doc-table-badge {
  font: 800 9px ui-monospace;
  color: var(--rf-brand);
  background: var(--rf-brand-soft);
  padding: 1px 6px;
  border-radius: 4px;
}

.doc-title-text {
  font-size: 13.5px;
  color: var(--rf-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.doc-tags-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.doc-tag-item {
  border-radius: 4px;
  font-size: 10px;
}

.empty-tag-text {
  font-size: 11px;
  color: var(--rf-text-3);
}

.doc-date-text {
  font-size: 11px;
  color: var(--rf-text-3);
}

.doc-actions-cell {
  display: flex;
  justify-content: flex-end;
  gap: 4px;
}

.empty-knowledge-list {
  padding: 40px;
}

.doc-pagination-wrapper {
  height: 48px;
  padding: 0 18px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  border-top: 1px solid var(--rf-border);
  background: #fff;
  flex-shrink: 0;
}

.doc-editor-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.editor-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 18px;
  border-bottom: 1px solid var(--rf-border);
  flex-shrink: 0;
}

.editor-back {
  cursor: pointer;
}

.editor-back span {
  font-size: 11px;
  color: var(--rf-brand);
}

.editor-back h2 {
  font-size: 17px;
  margin: 2px 0 0;
}

.editor-actions {
  display: flex;
  gap: 10px;
  align-items: center;
}

.view-tabs {
  display: flex;
  border: 1px solid var(--rf-border);
  border-radius: 6px;
  padding: 2px;
  background: #fafbfc;
}

.view-tabs button {
  border: 0;
  background: transparent;
  padding: 5px 9px;
  font-size: 11px;
  color: var(--rf-text-2);
  cursor: pointer;
  border-radius: 4px;
}

.view-tabs button.active {
  background: #fff;
  color: var(--rf-text);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.doc-meta-inputs {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 10px;
  padding: 10px 18px;
  border-bottom: 1px solid var(--rf-border);
  flex-shrink: 0;
}

.title-input :deep(.el-input__inner) {
  font-weight: 700;
}

.doc-body-split {
  flex: 1;
  min-height: 0;
  display: flex;
}

.editor-pane,
.preview-pane {
  flex: 1;
  min-width: 0;
  overflow: auto;
}

.preview-pane {
  padding: 20px 24px;
}

.split-divider {
  width: 1px;
  background: var(--rf-border);
}

.share-tip {
  font-size: 12px;
  color: var(--rf-text-2);
  margin: 0 0 14px 0;
}

.form-grid-two {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
</style>
