<!-- src/features/requirement-workspace/components/Plan/StageList.vue -->
<template>
  <div v-if="stages.length > 0" class="plan-stage-list">
    <div v-for="(st, idx) in stages" :key="st.id" class="plan-stage-item">
      <div class="stage-seq-col">0{{ idx + 1 }}</div>

      <!-- 阶段标题与行内重命名 -->
      <div class="stage-title-col">
        <el-input
          v-if="editingTitleId === st.id"
          v-model="st.title"
          size="small"
          autofocus
          @blur="saveTitle(st)"
          @keyup.enter="saveTitle(st)"
          @keyup.esc="editingTitleId = null"
        />
        <div v-else class="stage-title-text" title="双击就地重命名" @dblclick="startEditTitle(st)">
          <span>{{ st.title }}</span>
          <span class="edit-hover-hint">✏️</span>
        </div>

        <div class="stage-schedule-line">
          📅
          <el-date-picker
            v-if="editingDateId === st.id"
            v-model="tempDateRange"
            type="daterange"
            range-separator="-"
            start-placeholder="始"
            end-placeholder="止"
            size="small"
            value-format="YYYY-MM-DD"
            @change="saveDate(st)"
            @blur="editingDateId = null"
          />
          <span
            v-else
            class="clickable-schedule"
            title="点击修改起止排期"
            @click="startEditDate(st)"
          >
            {{ st.startDate || '未定' }} 至 {{ st.endDate || '未定' }}
          </span>
        </div>
      </div>

      <!-- 状态单选切换 -->
      <div class="stage-status-col">
        <el-radio-group
          v-model="st.status"
          size="small"
          @change="emit('update-stage', st.id, { status: st.status })"
        >
          <el-radio-button value="TODO">待处理</el-radio-button>
          <el-radio-button value="IN_PROGRESS">进行中</el-radio-button>
          <el-radio-button value="DONE">已完成</el-radio-button>
        </el-radio-group>
      </div>

      <!-- 进入 Execution 操作 -->
      <div class="stage-action-col">
        <el-button type="primary" link size="small" @click="emit('go-execution', st.id)">
          前往执行拆解 ➔
        </el-button>
        <el-button type="danger" link size="small" @click="emit('delete-stage', st.id)">
          删除
        </el-button>
      </div>
    </div>
  </div>

  <el-empty
    v-else
    description="暂无计划阶段，请点击右上角【+ 新增阶段】制定排期"
    :image-size="90"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { Stage } from '@/types'

defineProps<{
  stages: Stage[]
}>()

const emit = defineEmits<{
  (e: 'update-stage', id: number, data: Partial<Stage>): void
  (e: 'delete-stage', id: number): void
  (e: 'go-execution', stageId: number): void
}>()

const editingTitleId = ref<number | null>(null)
const editingDateId = ref<number | null>(null)
const tempDateRange = ref<[string, string] | []>([])
const cachedTitle = ref('')

const startEditTitle = (stage: Stage) => {
  editingTitleId.value = stage.id
  cachedTitle.value = stage.title
}

const saveTitle = (stage: Stage) => {
  editingTitleId.value = null
  const newT = stage.title.trim()
  if (!newT) {
    stage.title = cachedTitle.value
    return
  }
  if (newT !== cachedTitle.value) {
    emit('update-stage', stage.id, { title: newT })
  }
}

const startEditDate = (stage: Stage) => {
  editingDateId.value = stage.id
  tempDateRange.value = stage.startDate && stage.endDate ? [stage.startDate, stage.endDate] : []
}

const saveDate = (stage: Stage) => {
  editingDateId.value = null
  const startDate = tempDateRange.value[0] || null
  const endDate = tempDateRange.value[1] || null
  stage.startDate = startDate
  stage.endDate = endDate
  emit('update-stage', stage.id, { startDate, endDate })
}
</script>

<style scoped>
.plan-stage-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.plan-stage-item {
  display: flex;
  align-items: center;
  padding: 14px 18px;
  background-color: #ffffff;
  border: 1px solid rgba(55, 53, 47, 0.08);
  border-radius: 6px;
  gap: 16px;
}

.stage-seq-col {
  font-family: ui-monospace, monospace;
  font-size: 13px;
  font-weight: 700;
  color: #8c8c8c;
}

.stage-title-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stage-title-text {
  font-size: 14px;
  font-weight: 600;
  color: #37352f;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.edit-hover-hint {
  opacity: 0;
  font-size: 11px;
  transition: opacity 0.15s ease;
}

.stage-title-text:hover .edit-hover-hint {
  opacity: 1;
}

.stage-schedule-line {
  font-size: 11.5px;
  color: #8c8c8c;
}

.clickable-schedule {
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 3px;
}

.clickable-schedule:hover {
  background-color: rgba(35, 131, 226, 0.08);
  color: #2383e2;
}

.stage-status-col {
  flex-shrink: 0;
}

.stage-action-col {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
