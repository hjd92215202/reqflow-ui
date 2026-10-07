<!-- src/features/requirement-workspace/components/Knowledge/RequirementKnowledge.vue -->
<template>
  <div class="req-knowledge-container">
    <!-- 左栏：需求下属文档列表 -->
    <aside class="knowledge-sidebar">
      <div class="sidebar-top-bar">
        <span class="sidebar-title">📄 需求沉淀文档 ({{ docs.length }})</span>
        <el-button type="primary" size="small" @click="handleCreateDoc"> + 新建文档 </el-button>
      </div>

      <div v-loading="loading" class="docs-tree-view">
        <el-alert
          v-if="loadError"
          :title="loadError"
          type="error"
          show-icon
          :closable="false"
          class="docs-load-error"
        >
          <template #default>
            <el-button link type="primary" :loading="loading" @click="loadDocs">重试</el-button>
          </template>
        </el-alert>
        <div
          v-for="d in docs"
          :key="d.id"
          :class="['doc-item-cell', { active: activeDoc?.id === d.id }]"
          @click="selectDoc(d)"
        >
          <span class="doc-icon">📝</span>
          <div class="doc-meta">
            <span class="doc-title-text">{{ d.title || '未命名文档' }}</span>
            <span class="doc-time">{{ formatTime(d.updatedAt) }}</span>
          </div>
        </div>

        <el-empty
          v-if="!loading && !loadError && docs.length === 0"
          description="暂无文档，点击右上角开始沉淀"
          :image-size="50"
        />
      </div>
    </aside>

    <!-- 右栏：沉浸式阅读与快捷编辑 -->
    <main v-if="activeDoc" class="knowledge-preview-pane">
      <div class="preview-header">
        <div class="title-line">
          <h2 class="doc-title">{{ activeDoc.title }}</h2>
          <span class="doc-author">作者：{{ activeDoc.creatorNickname || '系统' }}</span>
        </div>
        <div class="header-actions">
          <el-button size="small" plain @click="goToFullWiki"> 在完整 Wiki 库中编辑 ➔ </el-button>
        </div>
      </div>

      <el-divider style="margin: 12px 0 16px 0" />

      <div class="markdown-render-area">
        <MarkdownPreview :source="activeDoc.content" />
      </div>
    </main>

    <div v-else class="empty-preview-pane">
      <el-empty description="选择左侧文档以浏览内容" :image-size="80" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getWikiListApi, createWikiApi } from '@/features/wiki/api'
import type { WikiDocument } from '@/types'
import { ElMessage } from 'element-plus'
import MarkdownPreview from '@/components/markdown/MarkdownPreview.vue'

const props = defineProps<{
  requirementId: number
}>()

const router = useRouter()
const loading = ref(false)
const loadError = ref('')
const docs = ref<WikiDocument[]>([])
const activeDoc = ref<WikiDocument | null>(null)

const loadDocs = async () => {
  loading.value = true
  loadError.value = ''
  try {
    const data = await getWikiListApi({ requirementId: props.requirementId })
    docs.value = data || []
    if (docs.value.length > 0 && !activeDoc.value) {
      activeDoc.value = docs.value[0]
    }
  } catch {
    loadError.value = docs.value.length
      ? '文档加载失败，仍显示上次成功的结果。'
      : '需求文档加载失败，请检查网络后重试。'
  } finally {
    loading.value = false
  }
}

const selectDoc = (doc: WikiDocument) => {
  activeDoc.value = doc
}

const handleCreateDoc = async () => {
  try {
    const created = await createWikiApi({
      requirementId: props.requirementId,
      title: '技术实施方案设计',
      content:
        '## 1. 架构目标\n在此阐明架构准则与依赖...\n\n## 2. 接口设计\n| 字段 | 类型 | 说明 |\n|---|---|---|\n'
    })
    ElMessage.success('已新建方案文档')
    await loadDocs()
    activeDoc.value = created
  } catch {
    ElMessage.error('创建文档失败，请重试')
  }
}

const goToFullWiki = () => {
  router.push({
    path: '/wiki',
    query: { reqId: props.requirementId }
  })
}

const formatTime = (time?: string) => {
  if (!time) return ''
  return time.split('T')[0] || time
}

onMounted(() => {
  loadDocs()
})
</script>

<style scoped>
.req-knowledge-container {
  display: flex;
  height: 100%;
  width: 100%;
  overflow: hidden;
}

.knowledge-sidebar {
  width: 260px;
  background-color: #fbfbfa;
  border-right: 1px solid rgba(55, 53, 47, 0.08);
  display: flex;
  flex-direction: column;
  padding: 14px;
  flex-shrink: 0;
  box-sizing: border-box;
}

.sidebar-top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.sidebar-title {
  font-size: 12px;
  font-weight: 700;
  color: #8c8c8c;
}

.docs-tree-view {
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
}

.doc-item-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.12s ease;
}

.doc-item-cell:hover {
  background-color: rgba(55, 53, 47, 0.05);
}

.doc-item-cell.active {
  background-color: #e0f0ff;
  color: #2383e2;
}

.doc-icon {
  font-size: 13px;
}

.doc-meta {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.doc-title-text {
  font-size: 13px;
  font-weight: 500;
  color: #37352f;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.doc-time {
  font-size: 11px;
  color: #8c8c8c;
}

.knowledge-preview-pane {
  flex: 1;
  padding: 24px 32px;
  overflow-y: auto;
  box-sizing: border-box;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.doc-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: #37352f;
}

.doc-author {
  font-size: 12px;
  color: #8c8c8c;
  margin-top: 4px;
  display: block;
}

.empty-preview-pane {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
