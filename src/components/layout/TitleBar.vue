<!-- src/components/layout/TitleBar.vue -->
<template>
  <div class="custom-titlebar" @mousedown="handleTitlebarMouseDown">
    <div class="titlebar-brand">
      <img src="@/assets/logo.png" class="brand-logo" alt="ReqFlow Logo" />
      <span class="brand-title">ReqFlow</span>
    </div>

    <!-- 中间插槽：为后续接入 Workspace / Project 选择器做准备 -->
    <div class="titlebar-center">
      <slot name="center" />
    </div>

    <!-- 右侧原生窗口控制键 -->
    <div class="titlebar-controls" @mousedown.stop>
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

let lastClickTime = 0

// 精准分发双击最大化与单击拖拽，杜绝冲突
const handleTitlebarMouseDown = async (e: MouseEvent) => {
  if (e.button !== 0) return
  const target = e.target as HTMLElement
  if (target.closest('.titlebar-controls, .titlebar-center, button, input, select, textarea')) {
    return
  }

  const now = Date.now()
  const isDoubleClick = e.detail === 2 || now - lastClickTime < 350
  lastClickTime = now

  try {
    const appWindow = getCurrentWindow()
    if (isDoubleClick) {
      lastClickTime = 0
      await appWindow.toggleMaximize()
    } else {
      await appWindow.startDragging()
    }
  } catch (err) {
    // 纯 Web 环境静默忽略
  }
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
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  color: #37352f;
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

.titlebar-center {
  flex: 1;
  height: 100%;
  display: flex;
  align-items: center;
  padding: 0 12px;
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
</style>
