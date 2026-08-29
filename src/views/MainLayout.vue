<template>
  <div class="app-root">
    <!-- 顶部极简 Notion/VSCode 风格自定义标题栏 (由 handleTitlebarMouseDown 统一分发拖拽与双击最大化) -->
    <div class="custom-titlebar" @mousedown="handleTitlebarMouseDown">
      <div class="titlebar-brand">
        <span class="brand-logo">🌊</span>
        <span class="brand-title">ReqFlow</span>
      </div>

      <!-- 中间无缝拖拽与双击区域 -->
      <div class="titlebar-drag-space"></div>

      <!-- 右侧自定义控制按键 (@mousedown.stop 阻止冒泡避免误触发拖拽) -->
      <div class="titlebar-controls" @mousedown.stop>
        <button class="control-btn" @click.stop="minimizeWindow" title="最小化">
          <svg width="10" height="10" viewBox="0 0 10 10">
            <path fill="currentColor" d="M1 5h8v1H1z" />
          </svg>
        </button>
        <button class="control-btn" @click.stop="toggleMaximizeWindow" title="最大化 / 还原">
          <svg width="10" height="10" viewBox="0 0 10 10">
            <path fill="none" stroke="currentColor" stroke-width="1" d="M1.5 1.5h7v7h-7z" />
          </svg>
        </button>
        <button class="control-btn close-btn" @click.stop="closeWindow" title="关闭">
          <svg width="10" height="10" viewBox="0 0 10 10">
            <path fill="currentColor"
              d="M1.707 1 1 1.707 4.293 5 1 8.293 1.707 9 5 5.707 8.293 9 9 8.293 5.707 5 9 1.707 8.293 1 5 4.293z" />
          </svg>
        </button>
      </div>
    </div>

    <!-- 原全局骨架布局 -->
    <div class="layout-wrapper">
      <!-- 统一全局左侧侧边栏 -->
      <aside class="sidebar">
        <!-- 悬浮伸缩按钮：绝对定位，不再独占一行 -->
        <el-button link @click="isCollapsed = !isCollapsed" class="collapse-toggle-btn"
          :class="{ 'collapsed': isCollapsed }">
          <el-icon>
            <Expand v-if="isCollapsed" />
            <Fold v-else />
          </el-icon>
        </el-button>

        <el-menu :default-active="activeMenu" class="sidebar-menu" background-color="#fbfbfa" text-color="#5f5e5b"
          active-text-color="#37352f" :collapse="isCollapsed" :collapse-transition="false" router>

          <el-menu-item index="/todos">
            <el-icon>
              <Finished />
            </el-icon>
            <span>我的待办中心</span>
          </el-menu-item>
          <el-menu-item index="/requirements">
            <el-icon>
              <Menu />
            </el-icon>
            <span>需求事项管理</span>
          </el-menu-item>
          <el-menu-item index="/matrix">
            <el-icon>
              <Checked />
            </el-icon>
            <span>工作事项矩阵</span>
          </el-menu-item>

          <el-menu-item index="/wiki">
            <el-icon>
              <Notebook />
            </el-icon>
            <span>项目 Wiki 库</span>
          </el-menu-item>
        </el-menu>

        <!-- 统一底部用户信息及退出 (自适应折叠状态) -->
        <div class="sidebar-user-footer" :class="{ 'collapsed': isCollapsed }">
          <div class="user-info-text">
            <span class="user-avatar">👤</span>
            <span v-if="!isCollapsed" class="user-name">{{ userStore.nickname }}</span>
          </div>
          <el-button type="danger" link size="small" @click="logout" class="logout-btn">
            <el-icon>
              <SwitchButton />
            </el-icon>
            <span v-if="!isCollapsed" style="margin-left: 6px;">退出登录</span>
          </el-button>
        </div>
      </aside>

      <!-- 右侧子页面统一渲染视口 -->
      <div class="main-container">
        <router-view />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/store/user'
import { Menu, Checked, Finished, SwitchButton, Expand, Fold, Notebook } from '@element-plus/icons-vue'
import { getCurrentWindow } from '@tauri-apps/api/window'

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

// ----------------- 核心修复：精准分发双击最大化与单击拖拽 -----------------
let lastClickTime = 0

const handleTitlebarMouseDown = async (e) => {
  // 仅响应鼠标左键，且忽略右侧控制按键区域
  if (e.button !== 0) return
  if (e.target.closest('.titlebar-controls, button, input, select, textarea')) {
    return
  }

  const now = Date.now()
  // 双击判定：浏览器连击数 e.detail === 2 或两次点击间隔小于 350ms
  const isDoubleClick = e.detail === 2 || (now - lastClickTime < 350)
  lastClickTime = now

  try {
    const appWindow = getCurrentWindow()
    if (isDoubleClick) {
      // 捕获双击：直接执行窗口最大化/还原，不再向下触发系统拖拽
      lastClickTime = 0
      await appWindow.toggleMaximize()
    } else {
      // 单击：正常启动窗口原生拖拽
      await appWindow.startDragging()
    }
  } catch (err) {
    // 浏览器环境静默忽略
  }
}

const minimizeWindow = async () => {
  try {
    const appWindow = getCurrentWindow()
    await appWindow.minimize()
  } catch (err) { }
}

const toggleMaximizeWindow = async () => {
  try {
    const appWindow = getCurrentWindow()
    await appWindow.toggleMaximize()
  } catch (err) { }
}

const closeWindow = async () => {
  try {
    const appWindow = getCurrentWindow()
    await appWindow.close()
  } catch (err) { }
}
</script>

<style scoped>
/* 0. 根视图与自定义标题栏样式 */
.app-root {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background-color: #fbfbfa;
}

.custom-titlebar {
  height: 32px;
  background-color: #fbfbfa;
  border-bottom: 1px solid rgba(55, 53, 47, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 0 0 12px;
  user-select: none;
  flex-shrink: 0;
  cursor: default;
}

.titlebar-brand {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #37352f;
}

.brand-logo {
  font-size: 14px;
}

.brand-title {
  letter-spacing: 0.5px;
}

.titlebar-drag-space {
  flex: 1;
  height: 100%;
}

.titlebar-controls {
  display: flex;
  align-items: center;
  height: 100%;
}

.control-btn {
  width: 42px;
  height: 100%;
  border: none;
  background: transparent;
  color: #5f5e5b;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.12s ease;
}

.control-btn:hover {
  background-color: rgba(55, 53, 47, 0.08);
  color: #37352f;
}

.control-btn.close-btn:hover {
  background-color: #e81123;
  color: #ffffff;
}

/* 1. 一级分栏配置 */
.layout-wrapper {
  display: flex;
  flex: 1;
  width: 100%;
  overflow: hidden;
  min-height: 0;
}

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

/* 2. 悬浮按钮：不占位，轻量化悬浮在右上角 */
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

/* 3. 菜单样式 */
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

/* 5. 右侧容器 */
.main-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: #ffffff;
  overflow: hidden;
}
</style>