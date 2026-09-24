<!-- src/features/matrix/components/StageCardList.vue -->
<template>
  <div v-if="stages.length > 0" class="stages-list-view">
    <div
      v-for="stage in paginatedStages"
      :key="stage.id"
      class="stage-list-item"
      @click="emit('open-matrix', stage)"
    >
      <!-- 1. 阶段名称与原地改期 -->
      <div class="stage-item-left">
        <span class="stage-item-icon">📍</span>
        <div class="stage-item-info" @click.stop>
          <!-- 行内重命名输入框 -->
          <el-input
            v-if="editingStageId === stage.id"
            v-model="stage.title"
            size="small"
            class="inline-stage-title-input"
            autofocus
            @blur="finishTitleEdit(stage)"
            @keyup.enter="finishTitleEdit(stage)"
            @keyup.esc="cancelTitleEdit(stage)"
            @click.stop
            @dblclick.stop
          />
          <span
            v-else
            class="stage-item-title"
            title="双击即可原地修改阶段名称"
            @dblclick.stop="startTitleEdit(stage)"
          >
            {{ stage.title }} <i class="edit-hint-icon">✏️</i>
          </span>

          <!-- 阶段排期：点击弹出日期选择 -->
          <div class="stage-item-dates-wrapper" @click.stop>
            <el-date-picker
              v-if="editingStageDateId === stage.id"
              v-model="stage.dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始"
              end-placeholder="截止"
              size="small"
              value-format="YYYY-MM-DD"
              style="width: 220px"
              @change="finishDateEdit(stage)"
              @blur="editingStageDateId = null"
            />
            <span
              v-else
              class="stage-item-dates clickable-date"
              title="点击修改阶段起止排期"
              @click.stop="startDateEdit(stage)"
            >
              📅 {{ stage.startDate || '未定' }} 至 {{ stage.endDate || '未定' }}
              <i class="edit-hint-icon">✏️</i>
            </span>
          </div>
        </div>
      </div>

      <!-- 2. 阶段状态单选切换 -->
      <div class="stage-item-status" @click.stop>
        <el-radio-group v-model="stage.status" size="small" @change="handleStatusChange(stage)">
          <el-radio-button value="TODO">待处理</el-radio-button>
          <el-radio-button value="IN_PROGRESS">进行中</el-radio-button>
          <el-radio-button value="DONE">已完成</el-radio-button>
        </el-radio-group>
      </div>

      <!-- 3. 子任务完成度进度条 -->
      <div class="stage-item-progress">
        <span class="progress-count-text">
          进度: {{ getStats(stage.id).done }} / {{ getStats(stage.id).total }} 项
        </span>
        <el-progress
          :percentage="getStats(stage.id).percent"
          :status="getStats(stage.id).percent === 100 ? 'success' : ''"
          :stroke-width="6"
          style="width: 120px"
        />
      </div>

      <!-- 4. 操作按键区 -->
      <div class="stage-item-actions" @click.stop>
        <el-button type="primary" link size="small" @click.stop="emit('open-matrix', stage)">
          进入协同矩阵 ➔
        </el-button>
        <el-button type="danger" link size="small" @click.stop="handleDelete(stage.id)">
          移除
        </el-button>
      </div>
    </div>

    <!-- 分页条 -->
    <div class="pagination-wrapper" style="margin-top: 15px">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[5, 10, 20]"
        layout="total, sizes, prev, pager, next, jumper"
        :total="stages.length"
      />
    </div>
  </div>

  <el-empty
    v-else
    description="暂无执行阶段，点击右上角“划分新执行阶段”开始拆解"
    :image-size="100"
  />
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { updateStageApi, deleteStageApi } from '../api/stage'
import type { Stage, SubTask } from '@/types'
import { calculateStageTaskStats } from '../composables/useMatrixTree'
import { ElMessage, ElMessageBox } from 'element-plus'

const props = defineProps<{
  stages: Stage[]
  subTasksMap: Record<number, SubTask[]>
}>()

const emit = defineEmits<{
  (e: 'refresh'): void
  (e: 'open-matrix', stage: Stage): void
}>()

const currentPage = ref(1)
const pageSize = ref(5)

const paginatedStages = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return props.stages.slice(start, start + pageSize.value)
})

const editingStageId = ref<number | null>(null)
const editingStageDateId = ref<number | null>(null)
const originalTitleCache = ref('')

const getStats = (stageId: number) => {
  return calculateStageTaskStats(props.subTasksMap[stageId] || [])
}

const startTitleEdit = (stage: Stage) => {
  editingStageId.value = stage.id
  originalTitleCache.value = stage.title || ''
}

const cancelTitleEdit = (stage: Stage) => {
  stage.title = originalTitleCache.value
  editingStageId.value = null
}

const finishTitleEdit = async (stage: Stage) => {
  editingStageId.value = null
  const newTitle = stage.title?.trim()
  if (!newTitle) {
    stage.title = originalTitleCache.value
    ElMessage.warning('阶段名称不能为空')
    return
  }
  if (newTitle === originalTitleCache.value) return

  stage.title = newTitle
  try {
    await updateStageApi(stage.id, stage)
    ElMessage.success('阶段名称修改成功')
    emit('refresh')
  } catch (err) {
    stage.title = originalTitleCache.value
  }
}

const startDateEdit = (stage: Stage) => {
  stage.dateRange = stage.startDate && stage.endDate ? [stage.startDate, stage.endDate] : []
  editingStageDateId.value = stage.id
}

const finishDateEdit = async (stage: Stage) => {
  editingStageDateId.value = null
  if (stage.dateRange && stage.dateRange.length === 2) {
    stage.startDate = stage.dateRange[0]
    stage.endDate = stage.dateRange[1]
  } else {
    stage.startDate = null
    stage.endDate = null
  }
  try {
    await updateStageApi(stage.id, stage)
    ElMessage.success('阶段排期修改成功')
    emit('refresh')
  } catch (err) {
    ElMessage.error('更新阶段排期失败')
  }
}

const handleStatusChange = async (stage: Stage) => {
  try {
    await updateStageApi(stage.id, stage)
    ElMessage.success(`阶段状态已更新: ${stage.status}`)
    emit('refresh')
  } catch (err) {}
}

const handleDelete = (id: number) => {
  ElMessageBox.confirm('确定要移除此执行阶段吗？该阶段下的任务将同步清除。', '警告', {
    type: 'warning'
  })
    .then(async () => {
      await deleteStageApi(id)
      ElMessage.success('阶段已被移除')
      emit('refresh')
    })
    .catch(() => {})
}
</script>

<style scoped>
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
  border: 1px solid rgba(55, 53, 47, 0.09);
  border-radius: 6px;
  background-color: #ffffff;
  transition: all 0.15s ease-in-out;
  cursor: pointer;
}

.stage-list-item:hover {
  border-color: #2383e2;
  background-color: #fafdff;
  transform: translateX(2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.stage-item-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 280px;
}

.stage-item-icon {
  font-size: 16px;
}

.stage-item-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.inline-stage-title-input {
  width: 220px !important;
}

.stage-item-title {
  font-size: 14px;
  font-weight: 600;
  color: #37352f;
  display: flex;
  align-items: center;
  gap: 4px;
}

.edit-hint-icon {
  font-style: normal;
  font-size: 11px;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.stage-item-title:hover .edit-hint-icon {
  opacity: 1;
}

.stage-item-dates-wrapper {
  display: inline-flex;
  align-items: center;
}

.stage-item-dates {
  font-size: 11px;
  color: rgba(55, 53, 47, 0.5);
}

.clickable-date {
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
  transition: all 0.15s ease;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.clickable-date:hover {
  background-color: rgba(35, 131, 226, 0.08);
  color: #2383e2 !important;
}

.clickable-date:hover .edit-hint-icon {
  opacity: 1;
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

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
}
</style>
