<template>
  <div class="layout-wrapper">
    <!-- 统一全局左侧侧边栏 -->
    <aside class="sidebar">
      <!-- 悬浮伸缩按钮：绝对定位，不再独占一行 -->
      <el-button 
        link
        @click="isCollapsed = !isCollapsed" 
        class="collapse-toggle-btn"
        :class="{ 'collapsed': isCollapsed }"
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
        <el-menu-item index="/requirements">
          <el-icon><Menu /></el-icon>
          <span>需求事项管理</span>
        </el-menu-item>
        <el-menu-item index="/matrix">
          <el-icon><Checked /></el-icon>
          <span>工作事项矩阵</span>
        </el-menu-item>
      </el-menu>

      <!-- 统一底部用户信息及退出 (自适应折叠状态) -->
      <div class="sidebar-user-footer" :class="{ 'collapsed': isCollapsed }">
        <div class="user-info-text">
          <span class="user-avatar">👤</span>
          <span v-if="!isCollapsed" class="user-name">{{ userStore.nickname }}</span>
        </div>
        <el-button 
          type="danger" 
          link 
          size="small" 
          @click="logout"
          class="logout-btn"
        >
          <el-icon><SwitchButton /></el-icon>
          <span v-if="!isCollapsed" style="margin-left: 6px;">退出登录</span>
        </el-button>
      </div>
    </aside>

    <!-- 右侧子页面统一渲染视口 -->
    <div class="main-container">
      <router-view />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/store/user'
import { Menu, Checked, SwitchButton, Expand, Fold } from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const isCollapsed = ref(false) // 全局共享折叠状态

// 动态计算菜单宽度
const sidebarWidth = computed(() => isCollapsed.value ? '64px' : '240px')

// 监听当前路由，高亮对应的菜单项
const activeMenu = computed(() => {
  return route.path
})

const logout = () => {
  userStore.clearUserInfo()
  router.push('/login')
}
</script>

<style scoped>
/* 1. 一级分栏配置 */
.layout-wrapper {
  display: flex;
  height: 100%; 
  width: 100%;
  overflow: hidden;
}

.sidebar {
  width: v-bind(sidebarWidth);
  transition: width 0.2s ease-in-out;
  background-color: #fbfbfa;
  border-right: 1px solid rgba(55, 53, 47, 0.09);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  position: relative; /* 核心：作为绝对定位按钮的容器基准 */
}

/* 2. 悬浮按钮：不占位，轻量化悬浮在右上角 */
.collapse-toggle-btn {
  position: absolute;
  top: 10px;
  right: 14px; /* 展开时贴在右上角 */
  z-index: 10;
  color: #5f5e5b;
  font-size: 16px;
  width: 32px; /* 调整为更精致的 32px 规格，符合 Notion 悬浮控件质感 */
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

/* 折叠态定位：在 64px 侧边栏内精确居中 (64px - 32px) / 2 = 16px */
.collapse-toggle-btn.collapsed {
  right: 16px; 
}

/* 3. 菜单样式：预留顶部空白，创造呼吸感 */
.sidebar-menu {
  border-right: none;
  flex: 1;
  padding-top: 48px; /* 预留出悬浮按钮的垂直空间，避免首个菜单项被遮挡 */
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

/* 强制重写 Element Plus 折叠态下的菜单样式 */
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

/* 4. 底部用户信息区 */
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

.user-name, .logout-btn span {
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

/* 5. 右侧容器 */
.main-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: #ffffff; 
  overflow: hidden;
}
</style>