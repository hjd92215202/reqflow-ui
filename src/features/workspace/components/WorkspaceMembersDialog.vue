<template>
  <el-dialog v-model="visible" title="工作空间成员" width="440px" @open="loadMembers">
    <div v-if="canManage" class="member-add-row">
      <el-input
        v-model="username"
        placeholder="输入对方的用户名"
        clearable
        @keyup.enter="addMember"
      />
      <el-button type="primary" :loading="saving" @click="addMember">添加</el-button>
    </div>
    <p class="member-hint">
      {{
        canManage
          ? '成员可以查看并协作处理此工作空间中的需求。'
          : '成员可查看并协作处理需求；成员管理由所有者负责。'
      }}
    </p>
    <el-table v-loading="loading" :data="members" size="small" empty-text="还没有添加成员">
      <el-table-column label="成员">
        <template #default="{ row }">
          <div class="member-name">
            {{ row.displayName }}<span>@{{ row.username }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column v-if="canManage" label="操作" width="80" align="right">
        <template #default="{ row }">
          <el-button link type="danger" @click="removeMember(row)">移除</el-button>
        </template>
      </el-table-column>
    </el-table>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  addWorkspaceMemberApi,
  getWorkspaceMembersApi,
  removeWorkspaceMemberApi,
  type WorkspaceMember
} from '../api'

const visible = defineModel<boolean>({ required: true })
const props = defineProps<{ workspaceId: number | null }>()
const members = ref<WorkspaceMember[]>([])
const canManage = ref(false)
const username = ref('')
const loading = ref(false)
const saving = ref(false)

const loadMembers = async () => {
  if (!props.workspaceId) return
  loading.value = true
  try {
    const result = await getWorkspaceMembersApi(props.workspaceId)
    members.value = result.members
    canManage.value = result.canManage
  } catch {
    ElMessage.error('成员列表加载失败')
  } finally {
    loading.value = false
  }
}

const addMember = async () => {
  const name = username.value.trim()
  if (!props.workspaceId || !name) return
  saving.value = true
  try {
    await addWorkspaceMemberApi(props.workspaceId, name)
    username.value = ''
    ElMessage.success('成员已添加')
    await loadMembers()
  } catch {
    ElMessage.error('添加失败，请检查用户名或权限')
  } finally {
    saving.value = false
  }
}

const removeMember = async (member: WorkspaceMember) => {
  if (!props.workspaceId) return
  try {
    await ElMessageBox.confirm(`确定从工作空间移除 ${member.displayName}？`, '移除成员', {
      type: 'warning'
    })
    await removeWorkspaceMemberApi(props.workspaceId, member.userId)
    members.value = members.value.filter(item => item.userId !== member.userId)
    ElMessage.success('成员已移除')
  } catch (error) {
    if (error !== 'cancel') ElMessage.error('移除失败')
  }
}
</script>

<style scoped>
.member-add-row {
  display: flex;
  gap: 8px;
}
.member-hint {
  margin: 10px 0 14px;
  color: #85837f;
  font-size: 12px;
}
.member-name {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.member-name span {
  color: #96948f;
  font-size: 11px;
}
</style>
