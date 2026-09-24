<!-- src/components/layout/Sidebar.vue -->
<template>
  <aside class="sidebar">
    <!-- 悬浮伸缩按钮 -->
    <el-button
      link
      class="collapse-toggle-btn"
      :class="{ collapsed: isCollapsed }"
      @click="isCollapsed = !isCollapsed"
    >
      <el-icon>
        <Expand v-if="isCollapsed" />
        <Fold v-else />
      </el-icon>
    </el-button>

    <el-menu
      :default-active="activeMenu"
      class="sidebar-menu"
      background-color="#fbfbfa"
      text-color="#5f5e5b"
      active-text-color="#37352f"
      :collapse="isCollapsed"
      :collapse-transition="false"
      router
    >
      <el-menu-item index="/todos">
        <el-icon><Finished /></el-icon>
        <span>我的待办中心</span>
      </el-menu-item>
      <el-menu-item index="/requirements">
        <el-icon><Menu /></el-icon>
        <span>需求事项管理</span>
      </el-menu-item>
      <el-menu-item index="/matrix">
        <el-icon><Checked /></el-icon>
        <span>工作事项矩阵</span>
      </el-menu-item>
      <el-menu-item index="/wiki">
        <el-icon><Notebook /></el-icon>
        <span>项目 Wiki 库</span>
      </el-menu-item>
    </el-menu>

    <!-- 底部用户信息及退出登录 -->
    <div class="sidebar-user-footer" :class="{ collapsed: isCollapsed }">
      <div class="user-info-text">
        <span class="user-avatar">👤</span>
        <span v-if="!isCollapsed" class="user-name">{{ userStore.nickname || '用户' }}</span>
      </div>
      <el-button type="danger" link size="small" class="logout-btn" @click="handleLogout">
        <el-icon><SwitchButton /></el-icon>
        <span v-if="!isCollapsed" style="margin-left: 6px">退出登录</span>
      </el-button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/store/user'
import {
  Menu,
  Checked,
  Finished,
  SwitchButton,
  Expand,
  Fold,
  Notebook
} from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const isCollapsed = ref(false)
const sidebarWidth = computed(() => (isCollapsed.value ? '64px' : '240px'))
const activeMenu = computed(() => route.path)

const handleLogout = () => {
  userStore.clearUserInfo()
  router.push('/login')
}
</script>

<style scoped>
.sidebar {
  width: v-bind(sidebarWidth);
  transition: width 0.2s ease-in-out;
  background-color: #fbfbfa;
  border-right: 1px solid rgba(55, 53, 47, 0.09);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  position: relative;
}

.collapse-toggle-btn {
  position: absolute;
  top: 10px;
  right: 14px;
  z-index: 10;
  color: #5f5e5b;
  font-size: 16px;
  width: 32px;
  height: 32px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.15s ease-in-out;
}

.collapse-toggle-btn:hover {
  background-color: rgba(55, 53, 47, 0.08);
  color: #37352f;
}

.collapse-toggle-btn.collapsed {
  right: 16px;
}

.sidebar-menu {
  border-right: none;
  flex: 1;
  padding-top: 48px;
}

:deep(.el-menu-item) {
  height: 40px;
  line-height: 40px;
  margin: 4px 8px;
  border-radius: 4px;
}

:deep(.el-menu-item.is-active) {
  background-color: rgba(55, 53, 47, 0.06) !important;
  color: #37352f !important;
  font-weight: 500;
}

:deep(.el-menu--collapse) {
  width: 64px !important;
}

:deep(.el-menu--collapse .el-menu-item) {
  margin: 4px 0 !important;
  padding: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 100% !important;
}

:deep(.el-menu--collapse .el-menu-item .el-icon) {
  margin: 0 !important;
  font-size: 18px;
}

.sidebar-user-footer {
  border-top: 1px solid rgba(55, 53, 47, 0.09);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background-color: #fbfbfa;
  overflow: hidden;
  flex-shrink: 0;
  transition: all 0.2s ease-in-out;
  box-sizing: border-box;
}

.sidebar-user-footer.collapsed {
  width: 64px;
  padding: 16px 0;
  align-items: center;
  gap: 16px;
}

.user-info-text {
  display: flex;
  align-items: center;
  color: #37352f;
  font-size: 13px;
  white-space: nowrap;
}

.sidebar-user-footer.collapsed .user-info-text {
  width: 40px;
  height: 40px;
  justify-content: center;
  margin: 0 auto;
}

.user-avatar {
  font-size: 18px;
  margin-right: 8px;
}

.sidebar-user-footer.collapsed .user-avatar {
  margin-right: 0 !important;
}

.user-name,
.logout-btn span {
  font-weight: bold;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: opacity 0.15s ease-in-out;
}

.logout-btn {
  justify-content: flex-start;
  padding-left: 0;
  color: #f56c6c;
}

.sidebar-user-footer.collapsed .logout-btn {
  width: 40px;
  height: 40px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
  border-radius: 4px;
}

.sidebar-user-footer.collapsed .logout-btn:hover {
  background-color: #fef0f0;
}
</style>
