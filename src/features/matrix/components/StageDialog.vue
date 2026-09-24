<!-- src/features/matrix/components/StageDialog.vue -->
<template>
  <el-dialog
    v-model="visible"
    title="划分新执行阶段"
    width="420px"
    append-to-body
    :close-on-click-modal="false"
  >
    <el-form label-width="80px">
      <el-form-item label="阶段名称" required>
        <el-input v-model="title" placeholder="如：需求评审期 / 研发编码期 / 业务测试期" />
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
          size="small"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">确定划分</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { createStageApi } from '../api/stage'
import { ElMessage } from 'element-plus'

const props = defineProps<{
  modelValue: boolean
  requirementId: number | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
  (e: 'created'): void
}>()

const visible = ref(props.modelValue)
const submitting = ref(false)
const title = ref('')
const dateRange = ref<[string, string] | []>([])

watch(
  () => props.modelValue,
  val => {
    visible.value = val
    if (val) {
      title.value = ''
      dateRange.value = []
    }
  }
)

watch(visible, val => {
  emit('update:modelValue', val)
})

const handleSubmit = async () => {
  if (!title.value.trim()) {
    ElMessage.warning('阶段名称不能为空')
    return
  }
  if (!props.requirementId) {
    ElMessage.warning('未关联有效需求')
    return
  }

  submitting.value = true
  try {
    await createStageApi({
      requirementId: props.requirementId,
      title: title.value.trim(),
      startDate: dateRange.value[0] || null,
      endDate: dateRange.value[1] || null
    })
    ElMessage.success('执行阶段划分成功')
    visible.value = false
    emit('created')
  } catch (err) {
  } finally {
    submitting.value = false
  }
}
</script>
