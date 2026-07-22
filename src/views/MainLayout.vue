<template>
  <div class="layout-wrapper">
    <!-- 统一全局左侧侧边栏 (支持动态折叠与过渡动画) -->
    <aside class="sidebar">
      <div class="brand" :class="{ 'collapsed': isCollapsed }">
        <span v-if="!isCollapsed" class="logo-text">🌊 ReqFlow</span>
        <!-- 菜单折叠切换按钮 -->
        <el-button 
          type="text" 
          @click="isCollapsed = !isCollapsed" 
          class="collapse-toggle-btn"
        >
          <el-icon>
            <Expand v-if="isCollapsed" />
            <Fold v-else />
          </el-icon>
        </el-button>
      </div>
      
      <el-menu
        :default-active="activeMenu"
        class="sidebar-menu"
        background-color="#001529"
        text-color="#a6adb4"
        active-text-color="#ffffff"
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
.layout-wrapper {
  display: flex;
  height: 100vh;
  overflow: hidden;
}
.sidebar {
  width: v-bind(sidebarWidth);
  transition: width 0.2s ease-in-out;
  background-color: #001529;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}
.brand {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  background-color: #002140;
  overflow: hidden;
  flex-shrink: 0;
}
.logo-text {
  font-size: 18px;
  font-weight: bold;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
}
.collapse-toggle-btn {
  color: #ffffff;
  font-size: 16px;
  padding: 0;
}
.sidebar-menu {
  border-right: none;
  flex: 1;
}

/* 统一底部用户信息区 */
.sidebar-user-footer {
  border-top: 1px solid #002140;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background-color: #001529;
  overflow: hidden;
  flex-shrink: 0;
  transition: all 0.2s ease-in-out;
}
.sidebar-user-footer.collapsed {
  align-items: center;
  padding: 16px 0;
}
.sidebar-user-footer.collapsed .user-info-text {
  justify-content: center;
}
.sidebar-user-footer.collapsed .logout-btn {
  justify-content: center;
  padding-left: 0;
  width: 100%;
}
.user-info-text {
  display: flex;
  align-items: center;
  color: #ffffff;
  font-size: 13px;
  white-space: nowrap;
}
.user-avatar {
  font-size: 16px;
  margin-right: 8px;
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

.main-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: #f0f2f5;
  overflow: hidden;
}
</style>