<!-- src/layouts/MainLayout.vue -->
<template>
  <div class="app-root">
    <!-- 顶栏注入项目选择器与审计流水触发按钮 -->
    <TitleBar>
      <template #center>
        <ProjectSelector />
      </template>
      <template #actions>
        <button
          class="control-btn"
          title="工程操作审计流水"
          @click.stop="activityDrawerVisible = true"
        >
          <el-icon :size="14"><Clock /></el-icon>
        </button>
      </template>
    </TitleBar>

    <div class="layout-wrapper">
      <Sidebar />
      <main class="main-container">
        <router-view />
      </main>
    </div>

    <!-- 侧滑操作审计流水抽屉 -->
    <ActivityDrawer v-model="activityDrawerVisible" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import TitleBar from '@/components/layout/TitleBar.vue'
import Sidebar from '@/components/layout/Sidebar.vue'
import ProjectSelector from '@/features/workspace/components/ProjectSelector.vue'
import ActivityDrawer from '@/features/activity/components/ActivityDrawer.vue'
import { Clock } from '@element-plus/icons-vue'

const activityDrawerVisible = ref(false)
</script>

<style scoped>
.app-root {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  background-color: #fbfbfa;
}

.layout-wrapper {
  display: flex;
  flex: 1;
  width: 100%;
  overflow: hidden;
  min-height: 0;
}

.main-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: #ffffff;
  overflow: hidden;
  min-width: 0;
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
</style>
