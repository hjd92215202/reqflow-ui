<!-- src/features/wiki/index.vue -->
<template>
  <div class="wiki-workspace">
    <!-- 1. 左侧侧边栏组件 -->
    <WikiSidebar
      v-model:is-collapsed="isSidebarCollapsed"
      v-model:search-keyword="searchKeyword"
      :total-doc-count="allDocs.length"
      :filtered-docs="filteredDocs"
      :requirements="requirements"
      :current-doc="currentDoc"
      :active-req-filter="activeReqFilter"
      @select-filter="reqId => (activeReqFilter = reqId)"
      @select-doc="doc => (currentDoc = { ...doc })"
      @create-doc="handleCreateNewDoc"
    />

    <!-- 2. 右侧文档编辑与阅读主视口 -->
    <div v-if="currentDoc" class="wiki-main-container">
      <!-- 顶栏操作与模式切换 -->
      <div class="doc-top-bar">
        <div class="top-bar-left">
          <el-button
            v-if="isSidebarCollapsed"
            link
            class="expand-sidebar-btn"
            title="展开侧边栏"
            @click="isSidebarCollapsed = false"
          >
            ▶ 展开目录
          </el-button>
          <el-tag v-if="currentDoc.requirementTitle" type="primary" size="small">
            📌 关联需求：{{ currentDoc.requirementTitle }}
          </el-tag>
          <el-tag v-else type="info" size="small">🌐 全局实践文档</el-tag>
          <span class="author-info">👤 作者: {{ currentDoc.creatorNickname || '管理员' }}</span>
        </div>

        <div class="top-bar-actions">
          <el-radio-group v-model="viewMode" size="small">
            <el-radio-button value="edit">✏️ 编辑</el-radio-button>
            <el-radio-button value="split">🌗 分屏</el-radio-button>
            <el-radio-button value="preview">📖 预览</el-radio-button>
          </el-radio-group>
          <el-button
            type="primary"
            plain
            size="default"
            :loading="sharing"
            @click="handleOneClickShare"
          >
            🔗 分享文档
          </el-button>
          <el-button type="success" size="default" :loading="saving" @click="handleSaveDoc">
            💾 保存文档
          </el-button>
          <el-button type="danger" link size="small" @click="handleDeleteDoc">删除文章</el-button>
        </div>
      </div>

      <!-- 标题与属性配置 -->
      <div class="doc-header-editor">
        <el-input
          v-model="currentDoc.title"
          placeholder="输入文档标题..."
          class="doc-title-input"
          size="large"
        />
        <div class="doc-properties-bar">
          <div class="prop-item">
            <span class="prop-label">关联需求:</span>
            <el-select
              v-model="currentDoc.requirementId"
              placeholder="无 (通用经验)"
              size="small"
              style="width: 220px"
              clearable
              @change="handleRequirementChange"
            >
              <el-option
                v-for="req in requirements"
                :key="req.id"
                :label="req.title"
                :value="req.id"
              />
            </el-select>
          </div>
          <div class="prop-item">
            <span class="prop-label">经验标签:</span>
            <el-input
              v-model="currentDoc.tags"
              placeholder="多个用逗号隔开，如: 踩坑记录,架构方案"
              size="small"
              style="width: 280px"
            />
          </div>
        </div>

        <!-- 3. 专业工具栏组件 -->
        <WikiToolbar
          v-if="viewMode !== 'preview'"
          @wrap="handleWrap"
          @insert-block="handleInsertBlock"
          @template="applyTemplate"
        />
      </div>

      <!-- 4. Markdown 编辑与预览分屏工作区 -->
      <div :class="['doc-content-workspace', `mode-${viewMode}`]">
        <div v-show="viewMode === 'edit' || viewMode === 'split'" class="editor-pane">
          <MarkdownEditor
            ref="editorRef"
            v-model="currentDoc.content"
            @scroll-change="handleEditorScroll"
          />
        </div>
        <div v-if="viewMode === 'split'" class="split-divider"></div>
        <div
          v-show="viewMode === 'preview' || viewMode === 'split'"
          ref="previewPaneRef"
          class="preview-pane"
        >
          <MarkdownPreview
            :source="currentDoc.content"
            :editable-task="true"
            @task-toggle="handleTaskToggle"
          />
        </div>
      </div>

      <!-- 5. 反向链接与工程上下文透视卡片 (Backlinks) -->
      <WikiBacklinksCard
        :current-doc="currentDoc"
        :requirements="requirements"
        :all-docs="allDocs"
        @switch-doc="doc => (currentDoc = { ...doc })"
      />
    </div>

    <!-- 未选择文档占位 -->
    <div v-else class="empty-main-state">
      <el-empty
        description="选择左侧文档进行阅读与编辑，或点击 [+ 新建文档] 开始沉淀"
        :image-size="120"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import {
  getWikiListApi,
  createWikiApi,
  updateWikiApi,
  deleteWikiApi,
  getDocShareTokenApi
} from './api'
import { getRequirementsListApi } from '@/features/requirement/api'
import { useUserStore } from '@/store/user'
import type { WikiDocument, Requirement } from '@/types'
import { ElMessage, ElMessageBox } from 'element-plus'
import MarkdownEditor, { type MarkdownEditorExpose } from '@/components/markdown/MarkdownEditor.vue'
import MarkdownPreview, { type TaskTogglePayload } from '@/components/markdown/MarkdownPreview.vue'
import WikiSidebar from './components/WikiSidebar.vue'
import WikiToolbar from './components/WikiToolbar.vue'
import WikiBacklinksCard from './components/WikiBacklinksCard.vue'

const route = useRoute()
const userStore = useUserStore()

const saving = ref(false)
const sharing = ref(false)
const allDocs = ref<WikiDocument[]>([])
const requirements = ref<Requirement[]>([])
const activeReqFilter = ref<number | null>(null)
const searchKeyword = ref('')
const currentDoc = ref<WikiDocument | null>(null)
const viewMode = ref<'edit' | 'split' | 'preview'>('split')
const isSidebarCollapsed = ref(false)

const editorRef = ref<MarkdownEditorExpose | null>(null)
const previewPaneRef = ref<HTMLDivElement | null>(null)

const filteredDocs = computed(() => {
  let list = allDocs.value
  if (activeReqFilter.value !== null) {
    list = list.filter(d => d.requirementId === activeReqFilter.value)
  }
  if (searchKeyword.value.trim()) {
    const kw = searchKeyword.value.toLowerCase()
    list = list.filter(
      d =>
        (d.title && d.title.toLowerCase().includes(kw)) ||
        (d.tags && d.tags.toLowerCase().includes(kw))
    )
  }
  return list
})

const handleEditorScroll = (ratio: number) => {
  if (viewMode.value !== 'split' || !previewPaneRef.value) return
  const el = previewPaneRef.value
  el.scrollTop = ratio * (el.scrollHeight - el.clientHeight)
}

const handleTaskToggle = ({ index, checked }: TaskTogglePayload) => {
  if (!currentDoc.value?.content) return
  const lines = currentDoc.value.content.split('\n')
  let currentTaskIdx = 0
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*-\s*\[([ xX])\]\s+/.test(lines[i])) {
      if (currentTaskIdx === index) {
        lines[i] = checked
          ? lines[i].replace(/^(\s*-\s*\[)[ xX](\]\s+)/, '$1x$2')
          : lines[i].replace(/^(\s*-\s*\[)[ xX](\]\s+)/, '$1 $2')
        break
      }
      currentTaskIdx++
    }
  }
  currentDoc.value.content = lines.join('\n')
}

const handleWrap = (prefix: string, suffix: string, placeholder?: string) => {
  editorRef.value?.wrapSelection(prefix, suffix, placeholder)
}

const handleInsertBlock = (text: string) => {
  editorRef.value?.insertBlock(text)
}

const handleRequirementChange = (reqId: number | null) => {
  if (!currentDoc.value) return
  if (reqId) {
    const matched = requirements.value.find(r => r.id === reqId)
    currentDoc.value.requirementTitle = matched ? matched.title : ''
  } else {
    currentDoc.value.requirementTitle = ''
  }
}

// 核心优化：一键静默生成并直接写入系统剪贴板，彻底干掉弹窗
const handleOneClickShare = async () => {
  if (!currentDoc.value?.id) {
    ElMessage.warning('请先选择或保存当前文档')
    return
  }

  sharing.value = true
  try {
    const res = await getDocShareTokenApi(currentDoc.value.id)
    const baseUrl = userStore.serverUrl
      ? userStore.serverUrl.replace(/\/$/, '')
      : 'http://localhost:8080'
    const fullShareUrl = `${baseUrl}/share/wiki/${res.shareToken}`

    await navigator.clipboard.writeText(fullShareUrl)
    ElMessage.success({
      message: '🔗 安全只读分享链接已直接复制到剪贴板！',
      duration: 3000
    })
  } catch (err) {
    ElMessage.error('生成分享链接失败')
  } finally {
    sharing.value = false
  }
}

const loadData = async () => {
  try {
    const reqRes = await getRequirementsListApi({ page: 0, size: 200 })
    requirements.value = Array.isArray(reqRes) ? reqRes : reqRes?.content || []

    const docsRes = await getWikiListApi()
    allDocs.value = docsRes || []

    if (route.query.reqId) {
      activeReqFilter.value = Number(route.query.reqId)
    }
    if (allDocs.value.length > 0 && !currentDoc.value) {
      currentDoc.value = { ...allDocs.value[0] }
    }
  } catch (e) {}
}

const handleCreateNewDoc = async () => {
  try {
    const newDoc = await createWikiApi({
      title: '未命名复盘文档',
      content:
        '## 1. 概述\n在此记录实施要点与技术细节...\n\n- [ ] 关键技术项 1\n- [x] 已完成事项\n',
      requirementId: activeReqFilter.value,
      tags: '经验复盘'
    })
    ElMessage.success('已新建文档')
    await loadData()
    currentDoc.value = newDoc
  } catch (e) {}
}

const handleSaveDoc = async () => {
  if (!currentDoc.value?.title?.trim()) {
    ElMessage.warning('文档标题不能为空')
    return
  }
  saving.value = true
  try {
    await updateWikiApi(currentDoc.value.id, currentDoc.value)
    ElMessage.success('文档保存成功')
    await loadData()
  } finally {
    saving.value = false
  }
}

const handleDeleteDoc = () => {
  if (!currentDoc.value) return
  ElMessageBox.confirm('确定要删除这篇 Wiki 文档吗？', '提示', { type: 'warning' })
    .then(async () => {
      await deleteWikiApi(currentDoc.value!.id)
      ElMessage.success('已删除')
      currentDoc.value = null
      await loadData()
    })
    .catch(() => {})
}

const applyTemplate = (type: 'TECH' | 'PIT' | 'REVIEW' | 'CHANGE') => {
  if (!currentDoc.value) return
  const templates: Record<string, string> = {
    TECH: '## 🛠️ 技术方案 & 架构设计\n\n### 1. 业务背景\n简要说明本次需求的业务价值与背景...\n\n### 2. 技术架构与流程\n* 核心接口设计与数据模型变更...',
    PIT: '## ⚠️ 踩坑与排坑记录\n\n### 1. 问题现象\n说明 Exception / Bug 现象...\n\n### 2. 根因深度分析\n根本原因...\n\n### 3. 最终解决方案\n修复代码及调整说明...',
    REVIEW:
      '## 🎯 项目实施复盘总结\n\n### 1. 目标达成情况\n- [x] 功能点 1 按时上线\n\n### 2. 团队最佳实践\n值得推广的经验...',
    CHANGE:
      '## 📝 需求变更说明记录\n\n### 1. 变更原因\n说明业务方或技术侧变更背景...\n\n### 2. 排期调整说明...'
  }
  currentDoc.value.content = (currentDoc.value.content || '') + '\n\n' + templates[type]
  ElMessage.success('已套用模板')
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.wiki-workspace {
  flex: 1;
  display: flex;
  height: 100%;
  background-color: #f5f7fa;
  overflow: hidden;
}

.wiki-main-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: #ffffff;
  padding: 20px 28px;
  overflow: hidden;
}

.doc-top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(55, 53, 47, 0.08);
  padding-bottom: 12px;
  margin-bottom: 14px;
}

.top-bar-left,
.top-bar-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.expand-sidebar-btn {
  font-size: 12px;
  color: #2383e2;
  font-weight: 600;
}

.author-info {
  font-size: 12px;
  color: #8c8c8c;
}

.doc-header-editor {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 12px;
}

.doc-title-input :deep(.el-input__wrapper) {
  box-shadow: none !important;
  padding-left: 0 !important;
}

.doc-title-input :deep(.el-input__inner) {
  font-size: 22px !important;
  font-weight: 700 !important;
  color: #37352f !important;
}

.doc-properties-bar {
  display: flex;
  align-items: center;
  gap: 20px;
  background-color: #fcfcfb;
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid rgba(55, 53, 47, 0.06);
}

.prop-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.prop-label {
  font-size: 12px;
  color: #8c8c8c;
}

.doc-content-workspace {
  flex: 1;
  display: flex;
  overflow: hidden;
  border: 1px solid rgba(55, 53, 47, 0.1);
  border-radius: 6px;
  min-height: 0;
}

.editor-pane {
  flex: 1;
  display: flex;
  height: 100%;
  overflow: hidden;
}

.split-divider {
  width: 1px;
  background-color: rgba(55, 53, 47, 0.1);
}

.preview-pane {
  flex: 1;
  height: 100%;
  overflow-y: auto;
  padding: 20px 24px;
  box-sizing: border-box;
}

.empty-main-state {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
