<!-- src/components/layout/TitleBar.vue -->
<template>
  <div class="custom-titlebar" data-tauri-drag-region @dblclick="handleTitlebarDblClick">
    <!-- 左侧 Logo 与品牌 -->
    <div class="titlebar-brand" data-tauri-drag-region>
      <img src="@/assets/logo.png" class="brand-logo" alt="ReqFlow Logo" />
      <span class="brand-title">ReqFlow</span>
    </div>

    <!-- 中间区域：大面积空白均继承 data-tauri-drag-region 原生拖拽与双击 -->
    <div class="titlebar-center" data-tauri-drag-region>
      <slot name="center" />
    </div>

    <!-- 右侧原生窗口控制键 (必须彻底阻断原生拖拽区域) -->
    <div class="titlebar-controls" @dblclick.stop @mousedown.stop>
      <slot name="actions" />
      <button class="control-btn" title="最小化" @click.stop="minimizeWindow">
        <svg width="10" height="10" viewBox="0 0 10 10">
          <path fill="currentColor" d="M1 5h8v1H1z" />
        </svg>
      </button>
      <button class="control-btn" title="最大化 / 还原" @click.stop="toggleMaximizeWindow">
        <svg width="10" height="10" viewBox="0 0 10 10">
          <path fill="none" stroke="currentColor" stroke-width="1" d="M1.5 1.5h7v7h-7z" />
        </svg>
      </button>
      <button class="control-btn close-btn" title="关闭" @click.stop="closeWindow">
        <svg width="10" height="10" viewBox="0 0 10 10">
          <path
            fill="currentColor"
            d="M1.707 1 1 1.707 4.293 5 1 8.293 1.707 9 5 5.707 8.293 9 9 8.293 5.707 5 9 1.707 8.293 1 5 4.293z"
          />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { getCurrentWindow } from '@tauri-apps/api/window'

// 核心：由原生的 dblclick 事件统一调度最大化，绝不与拖拽抢占冲突
const handleTitlebarDblClick = async (e: MouseEvent) => {
  const target = e.target as HTMLElement
  // 排除下拉框、按钮、输入框内部的双击，避免误触
  if (
    target.closest(
      '.titlebar-controls, .el-select, .el-input, .el-dialog, button, input, select, textarea, a'
    )
  ) {
    return
  }

  try {
    const appWindow = getCurrentWindow()
    await appWindow.toggleMaximize()
  } catch (err) {}
}

const minimizeWindow = async () => {
  try {
    const appWindow = getCurrentWindow()
    await appWindow.minimize()
  } catch (err) {}
}

const toggleMaximizeWindow = async () => {
  try {
    const appWindow = getCurrentWindow()
    await appWindow.toggleMaximize()
  } catch (err) {}
}

const closeWindow = async () => {
  try {
    const appWindow = getCurrentWindow()
    await appWindow.close()
  } catch (err) {}
}
</script>

<style scoped>
.custom-titlebar {
  height: 34px;
  background-color: #fbfbfa;
  border-bottom: 1px solid rgba(55, 53, 47, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 0 0 14px;
  user-select: none;
  flex-shrink: 0;
  cursor: default;
}

.titlebar-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  color: #37352f;
  flex-shrink: 0;
  pointer-events: none; /* 让鼠标事件直接穿透至具备拖拽属性的父容器 */
}

.brand-logo {
  width: 16px;
  height: 16px;
  object-fit: contain;
  border-radius: 3px;
}

.brand-title {
  letter-spacing: 0.5px;
}

/* 核心：占满剩余全部空白，允许任意空白处拖拽和双击 */
.titlebar-center {
  flex: 1;
  height: 100%;
  display: flex;
  align-items: center;
  padding: 0 16px;
}

/* 下拉菜单等交互组件必须脱离拖拽区域，保证点击灵敏 */
:deep(.titlebar-center .project-selector-container) {
  cursor: default;
}

.titlebar-controls {
  display: flex;
  align-items: center;
  height: 100%;
  flex-shrink: 0;
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
</style>
