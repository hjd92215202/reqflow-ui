<!-- src/components/app/AppShell.vue -->
<template>
  <div class="shell">
    <!-- 顶栏无边框拖拽区 -->
    <div class="titlebar" @mousedown="handleTitlebarMouseDown">
      <div class="brand">
        <img src="@/assets/logo.png" alt="ReqFlow" />
        <span>ReqFlow</span>
      </div>
      <div class="titlebar-spacer"></div>
      <div class="window-actions" @mousedown.stop>
        <button title="最小化" @click.stop="minimize">
          <svg viewBox="0 0 10 10"><path fill="currentColor" d="M1 5h8v1H1z" /></svg>
        </button>
        <button title="最大化 / 还原" @click.stop="maximize">
          <svg viewBox="0 0 10 10">
            <path fill="none" stroke="currentColor" stroke-width="1" d="M1.5 1.5h7v7h-7z" />
          </svg>
        </button>
        <button class="close" title="关闭" @click.stop="close">
          <svg viewBox="0 0 10 10">
            <path
              fill="currentColor"
              d="M1.707 1 1 1.707 4.293 5 1 8.293 1.707 9 5 5.707 8.293 9 9 8.293 5.707 5 9 1.707 8.293 1 5 4.293z"
            />
          </svg>
        </button>
      </div>
    </div>

    <div class="body">
      <!-- 侧边栏 -->
      <aside :class="['sidebar', { collapsed }]">
        <div class="sidebar-top">
          <button
            class="collapse-btn"
            :title="collapsed ? '展开' : '收起'"
            @click="collapsed = !collapsed"
          >
            <component :is="collapsed ? Expand : Fold" />
          </button>
        </div>

        <div v-if="!collapsed" class="brand-space">
          <span class="workspace-name">ENGINEERING WORKSPACE</span>
        </div>

        <!-- 主导航菜单：黄金三角支柱 -->
        <nav class="nav">
          <button
            v-for="item in navItems"
            :key="item.path"
            :class="['nav-item', { active: isActive(item.path) }]"
            @click="router.push(item.path)"
          >
            <component :is="item.icon" />
            <span v-if="!collapsed">{{ item.label }}</span>
          </button>
        </nav>

        <div class="sidebar-divider"></div>

        <!-- 真实最近访问记录 -->
        <div v-if="!collapsed" class="recent">
          <div class="section-label">最近访问</div>
          <button
            v-for="req in recentRequirements"
            :key="req.id"
            class="recent-item"
            :title="req.title"
            @click="openRequirement(req)"
          >
            <span class="recent-dot"></span>
            <span class="recent-title">{{ req.title }}</span>
          </button>
          <div v-if="!recentRequirements.length" class="empty-mini">暂无最近需求</div>
        </div>

        <!-- 侧栏底部操作区 -->
        <div class="sidebar-bottom">
          <button class="user-row" title="退出登录" @click="logout">
            <span class="avatar">{{ initials }}</span>
            <span v-if="!collapsed" class="user-name">{{ userStore.nickname || '工程师' }}</span>
            <SwitchButton v-if="!collapsed" />
          </button>
        </div>
      </aside>

      <!-- 主视图插槽 -->
      <main class="content">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/store/user'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { Menu, Finished, SwitchButton, Notebook, Fold, Expand } from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const collapsed = ref(false)

const navItems = [
  { path: '/workspace', label: '总览', icon: Menu },
  { path: '/my-work', label: '待办', icon: Finished },
  { path: '/requirements', label: '需求', icon: Notebook }
]

const recentRequirements = ref([])

const loadRecentRequirements = () => {
  try {
    const raw = localStorage.getItem('rf_recent_requirements')
    recentRequirements.value = raw ? JSON.parse(raw) : []
  } catch {
    recentRequirements.value = []
  }
}

onMounted(() => {
  loadRecentRequirements()
  window.addEventListener('storage', loadRecentRequirements)
})

const initials = computed(() => (userStore.nickname || 'R').slice(0, 1).toUpperCase())

const isActive = path => {
  if (path === '/requirements') {
    return route.path === '/requirements' || route.path.startsWith('/requirement/')
  }
  return route.path === path
}

const openRequirement = req => {
  router.push({ path: `/requirement/${req.id}`, query: { tab: 'overview' } })
}

const logout = () => {
  userStore.clearUserInfo()
  router.push('/login')
}

// 无边框原生拖拽与双击最大化
let lastClick = 0
const handleTitlebarMouseDown = async e => {
  if (e.button !== 0 || e.target.closest('button,input,select,textarea')) return
  const now = Date.now()
  const dbl = e.detail === 2 || now - lastClick < 300
  lastClick = now
  try {
    const w = getCurrentWindow()
    if (dbl) {
      await w.toggleMaximize()
      lastClick = 0
    } else {
      await w.startDragging()
    }
  } catch {}
}

const minimize = async () => {
  try {
    await getCurrentWindow().minimize()
  } catch {}
}
const maximize = async () => {
  try {
    await getCurrentWindow().toggleMaximize()
  } catch {}
}
const close = async () => {
  try {
    await getCurrentWindow().close()
  } catch {}
}
</script>

<style scoped>
.shell {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--rf-canvas);
}

.titlebar {
  height: var(--rf-topbar);
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--rf-border);
  background: #fff;
  user-select: none;
  flex-shrink: 0;
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-left: 12px;
  font-weight: 700;
  font-size: 12px;
  letter-spacing: 0.2px;
}

.brand img {
  width: 17px;
  height: 17px;
  border-radius: 4px;
}

.titlebar-spacer {
  flex: 1;
}

.window-actions {
  height: 100%;
  display: flex;
}

.window-actions button {
  width: 42px;
  height: 100%;
  border: 0;
  background: transparent;
  color: var(--rf-text-2);
  display: grid;
  place-items: center;
  cursor: pointer;
}

.window-actions button:hover {
  background: #f2f4f7;
}

.window-actions .close:hover {
  background: #d84a4a;
  color: #fff;
}

.window-actions svg {
  width: 13px;
  height: 13px;
}

.body {
  display: flex;
  flex: 1;
  min-height: 0;
}

.sidebar {
  width: var(--rf-sidebar);
  background: #fff;
  border-right: 1px solid var(--rf-border);
  display: flex;
  flex-direction: column;
  transition: width 0.18s ease;
}

.sidebar.collapsed {
  width: 62px;
}

.sidebar-top {
  height: 46px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  padding: 0 10px;
}

.collapse-btn {
  width: 30px;
  height: 30px;
  border: 0;
  background: transparent;
  color: var(--rf-text-3);
  border-radius: 6px;
  cursor: pointer;
  display: grid;
  place-items: center;
}

.collapse-btn:hover {
  background: var(--rf-subtle);
  color: var(--rf-text);
}

.brand-space {
  padding: 0 16px 12px;
}

.workspace-name {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 1.2px;
  color: var(--rf-text-3);
}

.nav {
  padding: 0 8px;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.nav-item {
  height: 38px;
  border: 0;
  background: transparent;
  color: var(--rf-text-2);
  border-radius: 7px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 11px;
  cursor: pointer;
  text-align: left;
  font-size: 13px;
  font-weight: 600;
}

.nav-item svg {
  width: 16px;
  height: 16px;
}

.nav-item:hover {
  background: #f6f7f9;
  color: var(--rf-text);
}

.nav-item.active {
  background: var(--rf-brand-soft);
  color: var(--rf-brand);
}

.sidebar-divider {
  height: 1px;
  background: var(--rf-border);
  margin: 13px 16px;
}

.recent {
  padding: 0 9px;
  flex: 1;
  overflow-y: auto;
}

.section-label {
  font-size: 9px;
  font-weight: 800;
  color: var(--rf-text-3);
  padding: 7px 8px;
  letter-spacing: 0.8px;
}

.recent-item {
  display: flex;
  align-items: center;
  gap: 7px;
  width: 100%;
  border: 0;
  background: transparent;
  text-align: left;
  padding: 8px 9px;
  border-radius: 6px;
  color: var(--rf-text-2);
  font-size: 12px;
  cursor: pointer;
}

.recent-item:hover {
  background: var(--rf-subtle);
  color: var(--rf-text);
}

.recent-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--rf-text-3);
  flex-shrink: 0;
}

.recent-title {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.empty-mini {
  padding: 10px 8px;
  color: var(--rf-text-3);
  font-size: 11px;
}

.sidebar-bottom {
  padding: 9px;
  border-top: 1px solid var(--rf-border);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.user-row {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 8px;
  border: 0;
  background: transparent;
  padding: 8px 7px;
  color: var(--rf-text-2);
  cursor: pointer;
  border-radius: 7px;
}

.user-row:hover {
  background: var(--rf-subtle);
}

.avatar {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: #edf0ff;
  color: var(--rf-brand);
  display: grid;
  place-items: center;
  font-size: 11px;
  font-weight: 800;
}

.user-name {
  font-size: 12px;
  font-weight: 600;
  flex: 1;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-row svg {
  width: 14px;
  height: 14px;
}

.content {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: auto;
  background: var(--rf-canvas);
}
</style>
