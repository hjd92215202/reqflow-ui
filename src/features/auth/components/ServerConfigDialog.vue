<!-- src/features/auth/components/ServerConfigDialog.vue -->
<template>
  <el-dialog
    v-model="visible"
    title="⚙️ 服务器连接设置"
    width="420px"
    append-to-body
    :close-on-click-modal="false"
    @mousedown.stop
  >
    <el-form label-position="top">
      <el-form-item label="后端服务地址 (Server URL)">
        <el-input
          v-model="tempServerUrl"
          placeholder="例如: http://192.168.1.100:8080 或 http://localhost:8080"
          clearable
          @keyup.enter="handleSave"
        />
      </el-form-item>
      <div class="server-dialog-tip">
        💡
        说明：系统会将数据保存在您指定的私有化后端实例中。首次设置保存后，下次启动将自动连接，无需重复输入。
      </div>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="handleSave">保存配置</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useUserStore } from '@/store/user'
import { ElMessage } from 'element-plus'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void
}>()

const userStore = useUserStore()
const visible = ref(props.modelValue)
const tempServerUrl = ref('')

watch(
  () => props.modelValue,
  val => {
    visible.value = val
    if (val) {
      tempServerUrl.value = userStore.serverUrl || ''
    }
  }
)

watch(visible, val => {
  emit('update:modelValue', val)
})

const handleSave = () => {
  if (!tempServerUrl.value.trim()) {
    ElMessage.warning('服务器地址不能为空')
    return
  }
  userStore.setServerUrl(tempServerUrl.value)
  ElMessage.success('服务器地址已更新')
  visible.value = false
}
</script>

<style scoped>
.server-dialog-tip {
  font-size: 12px;
  color: #909399;
  line-height: 1.6;
  margin-top: 4px;
}
</style>
