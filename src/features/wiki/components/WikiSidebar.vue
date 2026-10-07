<!-- src/features/wiki/components/WikiSidebar.vue -->
<template>
  <div :class="['wiki-sidebar', { 'is-collapsed': isCollapsed }]">
    <div v-if="!isCollapsed" class="sidebar-header">
      <span class="sidebar-title">📖 项目 Wiki 库</span>
      <div class="header-btns">
        <el-button type="primary" size="small" @click="emit('create-doc')">+ 新建</el-button>
        <el-button
          link
          class="collapse-btn"
          title="收起侧边栏"
          @click="emit('update:isCollapsed', true)"
        >
          ◀
        </el-button>
      </div>
    </div>

    <!-- 快捷搜索 -->
    <div v-if="!isCollapsed" class="search-box">
      <el-input
        :model-value="searchKeyword"
        placeholder="搜索文档标题或标签..."
        size="small"
        clearable
        @update:model-value="(val: string) => emit('update:searchKeyword', val)"
      >
        <template #prefix>🔍</template>
      </el-input>
    </div>

    <!-- 需求空间与文档列表 -->
    <div v-if="!isCollapsed" class="doc-tree-list">
      <button
        type="button"
        :class="['tree-node-item', { active: activeReqFilter === null }]"
        :aria-current="activeReqFilter === null ? 'page' : undefined"
        @click="emit('select-filter', null)"
      >
        <span class="node-icon">🌐</span>
        <span class="node-label">全部文档 ({{ totalDocCount }})</span>
      </button>

      <el-divider style="margin: 8px 0" />

      <!-- 1. 关联需求经验库分类树 -->
      <div class="collapsible-section">
        <button
          type="button"
          class="category-title clickable-title"
          :aria-expanded="!isReqCollapsed"
          @click="isReqCollapsed = !isReqCollapsed"
        >
          <span>📌 需求项目经验库</span>
          <span :class="['arrow-icon', { 'is-collapsed': isReqCollapsed }]">▼</span>
        </button>
        <el-collapse-transition>
          <div v-show="!isReqCollapsed" class="section-content">
            <button
              v-for="req in requirements"
              :key="req.id"
              type="button"
              :class="['tree-node-item', { active: activeReqFilter === req.id }]"
              :aria-current="activeReqFilter === req.id ? 'page' : undefined"
              @click="emit('select-filter', req.id)"
            >
              <span class="node-icon">📁</span>
              <span class="node-label">{{ req.title }}</span>
              <span class="doc-count-badge">{{ getReqCount(req.id) }}</span>
            </button>
          </div>
        </el-collapse-transition>
      </div>

      <el-divider style="margin: 8px 0" />

      <!-- 2. 文章列表 -->
      <div class="collapsible-section">
        <button
          type="button"
          class="category-title clickable-title"
          :aria-expanded="!isDocListCollapsed"
          @click="isDocListCollapsed = !isDocListCollapsed"
        >
          <span>📄 文章列表 ({{ filteredDocs.length }})</span>
          <span :class="['arrow-icon', { 'is-collapsed': isDocListCollapsed }]">▼</span>
        </button>
        <el-collapse-transition>
          <div v-show="!isDocListCollapsed" class="section-content">
            <button
              v-for="doc in filteredDocs"
              :key="doc.id"
              type="button"
              :class="['doc-item-row', { active: currentDoc && currentDoc.id === doc.id }]"
              :aria-current="currentDoc && currentDoc.id === doc.id ? 'true' : undefined"
              @click="emit('select-doc', doc)"
            >
              <span class="doc-icon">📄</span>
              <div class="doc-meta-info">
                <span class="doc-title-text">{{ doc.title || '未命名文档' }}</span>
                <span class="doc-sub-info">
                  {{ doc.creatorNickname || '系统' }} · {{ formatTime(doc.updatedAt) }}
                </span>
              </div>
            </button>

            <el-empty
              v-if="filteredDocs.length === 0"
              description="暂无相关文档"
              :image-size="50"
            />
          </div>
        </el-collapse-transition>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import type { WikiDocument, Requirement } from '@/types'

const props = defineProps<{
  isCollapsed: boolean
  searchKeyword: string
  totalDocCount: number
  filteredDocs: WikiDocument[]
  requirements: Requirement[]
  currentDoc: WikiDocument | null
  activeReqFilter: number | null
}>()

const emit = defineEmits<{
  (e: 'update:isCollapsed', val: boolean): void
  (e: 'update:searchKeyword', val: string): void
  (e: 'select-filter', reqId: number | null): void
  (e: 'select-doc', doc: WikiDocument): void
  (e: 'create-doc'): void
}>()

const isReqCollapsed = ref(false)
const isDocListCollapsed = ref(false)

const getReqCount = (reqId: number) => {
  return props.filteredDocs.filter(d => d.requirementId === reqId).length
}

const formatTime = (timeStr?: string) => {
  if (!timeStr) return ''
  return timeStr.split('T')[0] || timeStr
}
</script>

<style scoped>
.wiki-sidebar {
  width: 280px;
  background-color: #ffffff;
  border-right: 1px solid rgba(55, 53, 47, 0.09);
  display: flex;
  flex-direction: column;
  padding: 16px;
  flex-shrink: 0;
  transition: all 0.2s ease-in-out;
  box-sizing: border-box;
}

.wiki-sidebar.is-collapsed {
  width: 0 !important;
  padding: 0 !important;
  border-right: none !important;
  overflow: hidden !important;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.header-btns {
  display: flex;
  align-items: center;
  gap: 4px;
}

.collapse-btn {
  padding: 0 4px;
  color: #8c8c8c;
  font-size: 11px;
}

.sidebar-title {
  font-size: 15px;
  font-weight: 700;
  color: #37352f;
}

.search-box {
  margin-bottom: 12px;
}

.doc-tree-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.clickable-title {
  width: 100%;
  border: 0;
  background: transparent;
  font-family: inherit;
  text-align: left;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 4px;
  user-select: none;
}

.arrow-icon {
  font-size: 10px;
  color: #8c8c8c;
  transition: transform 0.2s ease;
}

.arrow-icon.is-collapsed {
  transform: rotate(-90deg);
}

.category-title {
  font-size: 11px;
  font-weight: 700;
  color: #8c8c8c;
  margin: 4px 0;
}

.section-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.tree-node-item,
.doc-item-row {
  width: 100%;
  border: 0;
  background: transparent;
  font-family: inherit;
  font-size: inherit;
  color: #37352f;
  text-align: left;
  display: flex;
  align-items: center;
  padding: 7px 10px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.clickable-title:focus-visible,
.tree-node-item:focus-visible,
.doc-item-row:focus-visible {
  outline: 2px solid rgba(35, 131, 226, 0.55);
  outline-offset: 1px;
}

.tree-node-item:hover,
.doc-item-row:hover {
  background-color: rgba(55, 53, 47, 0.05);
}

.tree-node-item.active,
.doc-item-row.active {
  background-color: #e0f0ff;
  color: #2383e2;
}

.node-icon,
.doc-icon {
  margin-right: 8px;
  font-size: 14px;
}

.node-label {
  font-size: 13px;
  font-weight: 500;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.doc-count-badge {
  font-size: 11px;
  background: #f0f0f0;
  padding: 1px 6px;
  border-radius: 10px;
  color: #8c8c8c;
}

.doc-meta-info {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.doc-title-text {
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.doc-sub-info {
  font-size: 11px;
  color: #8c8c8c;
  margin-top: 2px;
}
</style>
