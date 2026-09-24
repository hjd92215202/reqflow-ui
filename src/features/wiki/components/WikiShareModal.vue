<!-- src/features/wiki/components/WikiShareModal.vue -->
<template>
  <el-dialog v-model="visible" title="🔗 生成只读分享链接" width="480px" append-to-body>
    <p style="font-size: 13px; color: #606266; margin-top: 0">
      复制此链接后发送给他人，对方无需登录系统即可在浏览器中只读查看此文档。
    </p>
    <el-input v-model="shareUrl" readonly size="default">
      <template #append>
        <el-button type="primary" @click="handleCopy">复制链接</el-button>
      </template>
    </el-input>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { getDocShareTokenApi } from '../api'
import { useUserStore } from '@/store/user'
import { ElMessage } from 'element-plus'

const props = defineProps<{
  modelValue: boolean
  docId: number | undefined
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
}>()

const userStore = useUserStore()
const visible = ref(props.modelValue)
const shareUrl = ref('')

watch(
  () => props.modelValue,
  async val => {
    visible.value = val
    if (val && props.docId) {
      try {
        const res = await getDocShareTokenApi(props.docId)
        const serverUrl = userStore.serverUrl || 'http://localhost:8080'
        shareUrl.value = `${serverUrl.replace(/\/$/, '')}/share/wiki/${res.shareToken}`
      } catch (err) {
        ElMessage.error('获取分享链接失败')
        visible.value = false
      }
    }
  }
)

watch(visible, val => {
  emit('update:modelValue', val)
})

const handleCopy = () => {
  navigator.clipboard.writeText(shareUrl.value).then(() => {
    ElMessage.success('安全分享链接已复制到剪贴板！')
    visible.value = false
  })
}
</script>
