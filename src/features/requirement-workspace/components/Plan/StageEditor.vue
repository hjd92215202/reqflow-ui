<template>
  <el-dialog
    v-model="visible"
    :title="stage ? '编辑执行阶段' : '新增执行阶段'"
    width="min(520px, calc(100vw - 32px))"
    append-to-body
    :close-on-click-modal="false"
    :close-on-press-escape="!submitting"
    :show-close="!submitting"
  >
    <el-form label-position="top" :disabled="submitting">
      <el-form-item label="阶段名称" required>
        <el-input
          v-model="formTitle"
          maxlength="255"
          placeholder="例如：需求分析 / 架构设计 / 核心研发"
        />
      </el-form-item>
      <el-form-item label="起止排期">
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始"
          end-placeholder="截止"
          value-format="YYYY-MM-DD"
          style="width: 100%"
          @change="datesChanged = true"
        />
      </el-form-item>
      <el-collapse v-if="available" v-model="expanded">
        <el-collapse-item title="阶段目标与产出（选填）" name="standards">
          <el-form-item label="阶段目标">
            <el-input
              v-model="goal"
              type="textarea"
              :rows="3"
              maxlength="10000"
              placeholder="本阶段要解决什么问题？"
            />
          </el-form-item>
          <el-form-item label="预期产出">
            <el-input
              v-model="expectedOutput"
              type="textarea"
              :rows="3"
              maxlength="10000"
              placeholder="结束时应交付哪些结果？"
            />
          </el-form-item>
          <el-form-item label="结束条件">
            <el-input
              v-model="exitCriteria"
              type="textarea"
              :rows="3"
              maxlength="10000"
              placeholder="满足什么条件才可结束本阶段？"
            />
          </el-form-item>
        </el-collapse-item>
      </el-collapse>
    </el-form>
    <template #footer>
      <el-button :disabled="submitting" @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleConfirm">保存阶段</el-button>
    </template>
  </el-dialog>
</template>
<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import type { Stage, StageFormPayload } from '@/types'
import { useExecutionStandards } from '../../composables/useExecutionStandards'
const props = defineProps<{ modelValue: boolean; stage?: Stage | null }>()
const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'submit', payload: StageFormPayload, complete: (saved: boolean) => void): void
}>()
const { available } = useExecutionStandards()
const visible = ref(props.modelValue)
const formTitle = ref('')
const dateRange = ref<[string, string] | [] | null>([])
const datesChanged = ref(false)
const goal = ref('')
const expectedOutput = ref('')
const exitCriteria = ref('')
const expanded = ref<string[]>([])
const submitting = ref(false)
watch(
  () => props.modelValue,
  val => {
    visible.value = val
    if (!val) return
    const stage = props.stage
    formTitle.value = stage?.title || ''
    dateRange.value = stage?.startDate && stage.endDate ? [stage.startDate, stage.endDate] : []
    datesChanged.value = false
    goal.value = stage?.goal || ''
    expectedOutput.value = stage?.expectedOutput || ''
    exitCriteria.value = stage?.exitCriteria || ''
    expanded.value = goal.value || expectedOutput.value || exitCriteria.value ? ['standards'] : []
    submitting.value = false
  },
  { immediate: true }
)
watch(visible, val => emit('update:modelValue', val))
const handleConfirm = () => {
  if (submitting.value) return
  if (!formTitle.value.trim()) {
    ElMessage.warning('阶段名称不能为空')
    return
  }
  const payload: StageFormPayload = { title: formTitle.value.trim() }
  // Preserve one-sided legacy dates when the date picker has not changed.
  if (!props.stage || datesChanged.value) {
    payload.startDate = dateRange.value?.[0] || null
    payload.endDate = dateRange.value?.[1] || null
  }
  if (available.value)
    Object.assign(payload, {
      goal: goal.value.trim() || null,
      expectedOutput: expectedOutput.value.trim() || null,
      exitCriteria: exitCriteria.value.trim() || null
    })
  submitting.value = true
  emit('submit', payload, saved => {
    submitting.value = false
    if (saved) visible.value = false
  })
}
</script>
