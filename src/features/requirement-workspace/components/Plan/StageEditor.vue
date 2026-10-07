<!-- src/features/requirement-workspace/components/Plan/StageEditor.vue -->
<template>
  <el-dialog
    v-model="visible"
    :title="isEdit ? '编辑执行阶段' : '新增执行阶段'"
    width="440px"
    append-to-body
    :close-on-click-modal="false"
  >
    <el-form label-position="top">
      <el-form-item label="阶段名称" required>
        <el-input v-model="formTitle" placeholder="例如：需求分析 / 架构设计 / 核心研发" />
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
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleConfirm"> 确定 </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import type { Stage } from '@/types'

const props = defineProps<{
  modelValue: boolean
  stage?: Stage | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'submit', payload: { title: string; dateRange: [string, string] | [] }): void
}>()

const visible = ref(props.modelValue)
const isEdit = ref(false)
const formTitle = ref('')
const dateRange = ref<[string, string] | []>([])
const submitting = ref(false)

watch(
  () => props.modelValue,
  val => {
    visible.value = val
    if (val) {
      if (props.stage) {
        isEdit.value = true
        formTitle.value = props.stage.title
        dateRange.value =
          props.stage.startDate && props.stage.endDate
            ? [props.stage.startDate, props.stage.endDate]
            : []
      } else {
        isEdit.value = false
        formTitle.value = ''
        dateRange.value = []
      }
    }
  }
)

watch(visible, val => {
  emit('update:modelValue', val)
})

const handleConfirm = () => {
  if (!formTitle.value.trim()) {
    ElMessage.warning('阶段名称不能为空')
    return
  }
  emit('submit', {
    title: formTitle.value.trim(),
    dateRange: dateRange.value
  })
  visible.value = false
}
</script>
