<template>
  <div class="wiki-workspace">
    <!-- 左侧文档与项目导航树 (支持整体伸缩) -->
    <div :class="['wiki-sidebar', { 'is-collapsed': isSidebarCollapsed }]">
      <div class="sidebar-header" v-if="!isSidebarCollapsed">
        <span class="sidebar-title">📖 项目 Wiki 库</span>
        <div class="header-btns">
          <el-button type="primary" size="small" @click="handleCreateNewDoc(null)">+ 新建</el-button>
          <!-- 侧边栏收起按钮 -->
          <el-button link class="collapse-btn" @click="isSidebarCollapsed = true" title="收起侧边栏">
            ◀
          </el-button>
        </div>
      </div>

      <!-- 快捷搜索 -->
      <div class="search-box" v-if="!isSidebarCollapsed">
        <el-input v-model="searchKeyword" placeholder="搜索文档标题或标签..." size="small" clearable>
          <template #prefix>🔍</template>
        </el-input>
      </div>

      <!-- 需求空间与文档列表 -->
      <div class="doc-tree-list" v-loading="loading" v-if="!isSidebarCollapsed">
        <!-- 全部与通用经验目录 -->
        <div
          :class="['tree-node-item', { active: activeReqFilter === null && (!currentDoc || !currentDoc.id) }]"
          @click="selectFilter(null)"
        >
          <span class="node-icon">🌐</span>
          <span class="node-label">全部文档 ({{ allDocs.length }})</span>
        </div>

        <el-divider style="margin: 8px 0;" />

        <!-- 1. 关联需求经验库分类树 (支持折叠) -->
        <div class="collapsible-section">
          <div class="category-title clickable-title" @click="isReqCategoryCollapsed = !isReqCategoryCollapsed">
            <span>📌 需求项目经验库</span>
            <span :class="['arrow-icon', { 'is-collapsed': isReqCategoryCollapsed }]">▼</span>
          </div>
          <el-collapse-transition>
            <div v-show="!isReqCategoryCollapsed" class="section-content">
              <div
                v-for="req in requirements"
                :key="req.id"
                :class="['tree-node-item', { active: activeReqFilter === req.id }]"
                @click="selectFilter(req.id)"
              >
                <span class="node-icon">📁</span>
                <span class="node-label">{{ req.title }}</span>
                <span class="doc-count-badge">{{ getReqDocCount(req.id) }}</span>
              </div>
            </div>
          </el-collapse-transition>
        </div>

        <el-divider style="margin: 8px 0;" />

        <!-- 2. 当前筛选目录下的文档列表 (支持折叠) -->
        <div class="collapsible-section">
          <div class="category-title clickable-title" @click="isDocListCollapsed = !isDocListCollapsed">
            <span>📄 文章列表 ({{ filteredDocs.length }})</span>
            <span :class="['arrow-icon', { 'is-collapsed': isDocListCollapsed }]">▼</span>
          </div>
          <el-collapse-transition>
            <div v-show="!isDocListCollapsed" class="section-content">
              <div
                v-for="doc in filteredDocs"
                :key="doc.id"
                :class="['doc-item-row', { active: currentDoc && currentDoc.id === doc.id }]"
                @click="selectDoc(doc)"
              >
                <span class="doc-icon">📄</span>
                <div class="doc-meta-info">
                  <span class="doc-title-text">{{ doc.title || '未命名文档' }}</span>
                  <span class="doc-sub-info">{{ doc.creatorNickname || '系统' }} · {{ formatTime(doc.updatedAt) }}</span>
                </div>
              </div>

              <el-empty v-if="filteredDocs.length === 0" description="暂无相关文档" :image-size="50" />
            </div>
          </el-collapse-transition>
        </div>
      </div>
    </div>

    <!-- 右侧文档编辑与阅读主视口 -->
    <div class="wiki-main-container" v-if="currentDoc">
      <!-- 1. 顶栏操作与模式切换 -->
      <div class="doc-top-bar">
        <div class="top-bar-left">
          <!-- 侧边栏收起时的快捷展开悬浮按钮 -->
          <el-button
            v-if="isSidebarCollapsed"
            link
            class="expand-sidebar-btn"
            @click="isSidebarCollapsed = false"
            title="展开侧边栏"
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
          <!-- 模式切换控制器 -->
          <el-radio-group v-model="viewMode" size="small" class="view-mode-switch">
            <el-radio-button value="edit">✏️ 编辑</el-radio-button>
            <el-radio-button value="split">🌗 分屏</el-radio-button>
            <el-radio-button value="preview">📖 预览</el-radio-button>
          </el-radio-group>

          <el-button type="success" size="default" :loading="saving" @click="handleSaveDoc">💾 保存文档</el-button>
          <el-button type="danger" link size="small" @click="handleDeleteDoc">删除文章</el-button>
        </div>
      </div>

      <!-- 2. 标题与属性配置栏 -->
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
            <el-select v-model="currentDoc.requirementId" placeholder="无 (通用经验)" size="small" style="width: 220px;" clearable>
              <el-option v-for="req in requirements" :key="req.id" :label="req.title" :value="req.id" />
            </el-select>
          </div>

          <div class="prop-item">
            <span class="prop-label">经验标签:</span>
            <el-input v-model="currentDoc.tags" placeholder="多个用逗号隔开，如: 踩坑记录,架构方案" size="small" style="width: 280px;" />
          </div>
        </div>

        <!-- 3. Markdown 格式化与模板工具栏 (仅在编辑或分屏模式展示) -->
        <div class="markdown-toolbar-bar" v-if="viewMode !== 'preview'">
          <div class="tool-group">
            <span class="tool-group-label">快捷语法:</span>
            <el-button-group size="small">
              <el-button @click="insertMarkdown('**', '**', '粗体文字')" title="粗体"><b>B</b></el-button>
              <el-button @click="insertMarkdown('*', '*', '斜体文字')" title="斜体"><i>I</i></el-button>
              <el-button @click="insertMarkdown('~~', '~~', '删除文本')" title="删除线"><del>S</del></el-button>
              <el-button @click="insertMarkdown('### ', '', '小标题')" title="标题">H</el-button>
              <el-button @click="insertMarkdown('`', '`', 'code')" title="行内代码">&lt;/&gt;</el-button>
              <el-button @click="insertCodeBlock" title="代码块">代码块</el-button>
              <el-button @click="insertMarkdown('> ', '', '引用说明...')" title="引用">”</el-button>
              <el-button @click="insertMarkdown('- [ ] ', '', '待办清单任务')" title="任务待办">☑️</el-button>
              <el-button @click="insertMarkdown('- ', '', '无序列表项')" title="列表">• 列表</el-button>
              <el-button @click="insertTable" title="表格">📊 表格</el-button>
            </el-button-group>
          </div>

          <div class="tool-group templates-group">
            <span class="tool-group-label">⚡️ 经验模板:</span>
            <el-button size="small" link type="primary" @click="applyTemplate('TECH')">🛠️ 架构方案</el-button>
            <el-button size="small" link type="warning" @click="applyTemplate('PIT')">⚠️ 排坑记录</el-button>
            <el-button size="small" link type="success" @click="applyTemplate('REVIEW')">🎯 项目复盘</el-button>
            <el-button size="small" link type="info" @click="applyTemplate('CHANGE')">📝 变更说明</el-button>
          </div>
        </div>
      </div>

      <!-- 4. Markdown 编辑与实时渲染视口 -->
      <div :class="['doc-content-workspace', `mode-${viewMode}`]">
        <!-- 左侧/编辑面板 -->
        <div class="editor-pane" v-show="viewMode === 'edit' || viewMode === 'split'">
          <textarea
            ref="textareaRef"
            v-model="currentDoc.content"
            placeholder="在此撰写经验复盘、技术细节、踩坑记录... (支持 Markdown 语法与上方快捷工具)"
            class="custom-markdown-editor"
          ></textarea>
        </div>

        <!-- 分割标识线 (分屏模式可见) -->
        <div class="split-divider" v-if="viewMode === 'split'"></div>

        <!-- 右侧/预览面板 -->
        <div class="preview-pane" v-show="viewMode === 'preview' || viewMode === 'split'">
          <div class="markdown-preview-body" v-html="renderedMarkdown"></div>
        </div>
      </div>
    </div>

    <!-- 未选择文档时的占位视图 -->
    <div class="empty-main-state" v-else>
      <el-empty description="选择左侧文档进行阅读与编辑，或点击 [+ 新建文档] 开始沉淀" :image-size="120" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getWikiListApi, createWikiApi, updateWikiApi, deleteWikiApi } from '@/api/wiki'
import { getRequirementsListApi } from '@/api/requirement'
import { ElMessage, ElMessageBox } from 'element-plus'

const route = useRoute()

const loading = ref(false)
const saving = ref(false)

const allDocs = ref([])
const requirements = ref([])
const activeReqFilter = ref(null)
const searchKeyword = ref('')

const currentDoc = ref(null)
const textareaRef = ref(null)

// 视图模式: 'edit' | 'split' | 'preview'
const viewMode = ref('split')

// 侧边栏与分类折叠控制状态
const isSidebarCollapsed = ref(false)
const isReqCategoryCollapsed = ref(false)
const isDocListCollapsed = ref(false)

// 过滤计算属性
const filteredDocs = computed(() => {
  if (!Array.isArray(allDocs.value)) return []
  let list = allDocs.value

  if (activeReqFilter.value !== null) {
    list = list.filter(d => d && d.requirementId === activeReqFilter.value)
  }

  if (searchKeyword.value && searchKeyword.value.trim()) {
    const kw = searchKeyword.value.toLowerCase()
    list = list.filter(d => d && (
      (d.title && String(d.title).toLowerCase().includes(kw)) ||
      (d.tags && String(d.tags).toLowerCase().includes(kw))
    ))
  }

  return list
})

const getReqDocCount = (reqId) => {
  if (!Array.isArray(allDocs.value)) return 0
  return allDocs.value.filter(d => d && d.requirementId === reqId).length
}

// ----------------- 轻量级高性能安全 Markdown 渲染引擎 -----------------
const parseMarkdownToHtml = (rawText) => {
  if (!rawText) return '<div class="empty-preview-hint">✍️ 开始输入内容，实时 Markdown 渲染将在此呈现...</div>'

  let text = rawText
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // 1. 代码块
  text = text.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (match, lang, code) => {
    return `<div class="code-block-wrapper"><div class="code-block-header">${lang || 'code'}</div><pre class="code-block"><code>${code.trim()}</code></pre></div>`
  })

  // 2. 行内代码
  text = text.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')

  // 3. 标题
  text = text.replace(/^###### (.*$)/gim, '<h6>$1</h6>')
  text = text.replace(/^##### (.*$)/gim, '<h5>$1</h5>')
  text = text.replace(/^#### (.*$)/gim, '<h4>$1</h4>')
  text = text.replace(/^### (.*$)/gim, '<h3>$1</h3>')
  text = text.replace(/^## (.*$)/gim, '<h2>$1</h2>')
  text = text.replace(/^# (.*$)/gim, '<h1>$1</h1>')

  // 4. 分割线
  text = text.replace(/^(?:---|\*\*\*|___)\s*$/gim, '<hr class="markdown-hr" />')

  // 5. 待办清单
  text = text.replace(/^\s*-\s*\[x\]\s+(.*$)/gim, '<div class="task-list-item is-checked"><span class="checkbox-icon">✓</span><span class="task-text">$1</span></div>')
  text = text.replace(/^\s*-\s*\[\s*\]\s+(.*$)/gim, '<div class="task-list-item"><span class="checkbox-icon">○</span><span class="task-text">$1</span></div>')

  // 6. 引用块
  text = text.replace(/^\> (.*$)/gim, '<blockquote class="markdown-quote">$1</blockquote>')

  // 7. 列表
  text = text.replace(/^\s*-\s+(.*$)/gim, '<li class="ul-item">• $1</li>')
  text = text.replace(/^\s*(\d+)\.\s+(.*$)/gim, '<li class="ol-item"><span class="num">$1.</span> $2</li>')

  // 8. 粗体、斜体、删除线
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  text = text.replace(/~~(.*?)~~/g, '<del>$1</del>')
  text = text.replace(/\*(.*?)\*/g, '<em>$1</em>')

  // 9. 表格
  text = text.replace(/((?:\|[^\n]+\|\n?)+)/g, (match) => {
    const lines = match.trim().split('\n').filter(l => l.trim().length > 0)
    if (lines.length < 2) return match

    let html = '<table class="markdown-table">'
    lines.forEach((line, index) => {
      if (line.includes('---')) return
      const cols = line.split('|').filter((_, i, arr) => i > 0 && i < arr.length - 1)
      if (index === 0) {
        html += '<thead><tr>' + cols.map(c => `<th>${c.trim()}</th>`).join('') + '</tr></thead><tbody>'
      } else {
        html += '<tr>' + cols.map(c => `<td>${c.trim()}</td>`).join('') + '</tr>'
      }
    })
    html += '</tbody></table>'
    return html
  })

  // 10. 链接与图片
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="markdown-img" />')
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="markdown-link">$1 🔗</a>')

  // 11. 换行
  text = text.replace(/\n\n/g, '<div class="paragraph-gap"></div>')
  text = text.replace(/\n/g, '<br/>')

  return text
}

const renderedMarkdown = computed(() => {
  return parseMarkdownToHtml(currentDoc.value?.content || '')
})

// ----------------- 快捷 Markdown 语法插入 -----------------
const insertMarkdown = (prefix, suffix, placeholder = '') => {
  const el = textareaRef.value
  if (!el || !currentDoc.value) return

  const start = el.selectionStart
  const end = el.selectionEnd
  const content = currentDoc.value.content || ''
  const selectedText = content.substring(start, end) || placeholder

  const newText = prefix + selectedText + suffix
  currentDoc.value.content = content.substring(0, start) + newText + content.substring(end)

  setTimeout(() => {
    el.focus()
    el.setSelectionRange(start + prefix.length, start + prefix.length + selectedText.length)
  }, 0)
}

const insertCodeBlock = () => {
  insertMarkdown('```javascript\n', '\n```', '// 在此输入代码...')
}

const insertTable = () => {
  const tableTemplate = '\n| 模块 / 功能 | 说明 | 负责人 | 状态 |\n|---|---|---|---|\n| 接口联调 | 核心数据拉取 | 张三 | 进行中 |\n'
  insertMarkdown('', '', tableTemplate)
}

// ----------------- 数据加载与保存 -----------------
const loadData = async () => {
  loading.value = true
  try {
    const reqRes = await getRequirementsListApi({ page: 0, size: 200 })
    requirements.value = (reqRes && reqRes.content) ? reqRes.content : (Array.isArray(reqRes) ? reqRes : [])

    const docsRes = await getWikiListApi()
    allDocs.value = Array.isArray(docsRes) ? docsRes : []

    const queryReqId = route.query.reqId
    if (queryReqId) {
      activeReqFilter.value = Number(queryReqId)
    }

    if (allDocs.value.length > 0 && !currentDoc.value) {
      currentDoc.value = { ...allDocs.value[0] }
    }
  } catch (e) {
  } finally {
    loading.value = false
  }
}

const selectFilter = (reqId) => {
  activeReqFilter.value = reqId
}

const selectDoc = (doc) => {
  currentDoc.value = { ...doc }
}

const handleCreateNewDoc = async (reqId) => {
  try {
    const newDoc = await createWikiApi({
      title: '未命名复盘文档',
      content: '## 1. 概述\n在此记录实施要点与技术细节...\n\n- [ ] 关键技术项 1\n- [x] 已完成事项\n',
      requirementId: reqId || activeReqFilter.value,
      tags: '经验复盘'
    })
    ElMessage.success('已新建文档')
    await loadData()
    currentDoc.value = newDoc
  } catch (e) {}
}

const handleSaveDoc = async () => {
  if (!currentDoc.value) return
  if (!currentDoc.value.title || !currentDoc.value.title.trim()) {
    ElMessage.warning('文档标题不能为空')
    return
  }
  saving.value = true
  try {
    await updateWikiApi(currentDoc.value.id, currentDoc.value)
    ElMessage.success('文档保存成功')
    await loadData()
  } catch (e) {
  } finally {
    saving.value = false
  }
}

const handleDeleteDoc = () => {
  if (!currentDoc.value) return
  ElMessageBox.confirm('确定要删除这篇 Wiki 文档吗？', '提示', { type: 'warning' }).then(async () => {
    await deleteWikiApi(currentDoc.value.id)
    ElMessage.success('已删除')
    currentDoc.value = null
    await loadData()
  }).catch(() => {})
}

const applyTemplate = (type) => {
  if (!currentDoc.value) return
  const templates = {
    TECH: `## 🛠️ 技术方案 & 架构设计

### 1. 业务背景
简要说明本次需求的业务价值与背景...

### 2. 技术架构与流程
* **数据库变更**: 新增字段 / 数据表说明
* **核心接口设计**: API 接口及参数逻辑

\`\`\`json
{
  "api": "/api/demo",
  "method": "POST"
}
\`\`\`

### 3. 风险评估与应对
* 风险点 1: 应对措施...`,

    PIT: `## ⚠️ 踩坑与排坑记录

### 1. 问题现象
说明排查过程中遇到的 Exception / Bug 现象...

### 2. 原因深度分析
剖析导致该问题的根本原因...

### 3. 最终解决方案
给出可复用的修复代码或配置调整...`,

    REVIEW: `## 🎯 项目实施复盘总结

### 1. 目标达成情况
- [x] 功能点 1 按时上线
- [ ] 功能点 2 延期说明

### 2. 经验与做得好的
本次实施中值得团队推广的最佳实践...

### 3. 待改进与改进措施
流程中的不足及下阶段改进动作...`,

    CHANGE: `## 📝 需求变更说明记录

### 1. 变更原因
说明业务方或技术侧发起的变更缘由...

### 2. 影响范围与排期调整
| 影响模块 | 原定排期 | 调整后排期 | 责任人 |
|---|---|---|---|
| 核心接口 | 2026-08-01 | 2026-08-05 | 研发A |`
  }

  if (templates[type]) {
    currentDoc.value.content = (currentDoc.value.content || '') + '\n\n' + templates[type]
    ElMessage.success('已套用模板')
  }
}

const formatTime = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return ''
  return timeStr.split('T')[0] || timeStr
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
  position: relative;
}

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

/* 侧边栏收起态样式 */
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

.collapse-btn:hover {
  color: #2383e2;
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

/* 分类标题可折叠与箭头旋转 */
.clickable-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  padding: 4px 6px;
  border-radius: 4px;
  user-select: none;
  transition: background-color 0.15s ease;
}

.clickable-title:hover {
  background-color: rgba(55, 53, 47, 0.05);
  color: #37352f;
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
  display: flex;
  align-items: center;
  padding: 7px 10px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.15s ease;
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
  flex-shrink: 0;
}

.top-bar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.expand-sidebar-btn {
  font-size: 12px;
  color: #2383e2;
  font-weight: 600;
  padding: 0;
}

.author-info {
  font-size: 12px;
  color: #8c8c8c;
}

.top-bar-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.doc-header-editor {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 12px;
  flex-shrink: 0;
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

/* Markdown 工具栏 */
.markdown-toolbar-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #f9f9f8;
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid rgba(55, 53, 47, 0.06);
  flex-wrap: wrap;
  gap: 8px;
}

.tool-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.tool-group-label {
  font-size: 11px;
  font-weight: 600;
  color: #8c8c8c;
}

/* 编辑与渲染工作区 */
.doc-content-workspace {
  flex: 1;
  display: flex;
  overflow: hidden;
  border: 1px solid rgba(55, 53, 47, 0.1);
  border-radius: 6px;
  background-color: #ffffff;
}

.editor-pane {
  flex: 1;
  display: flex;
  height: 100%;
  overflow: hidden;
}

.custom-markdown-editor {
  width: 100%;
  height: 100%;
  padding: 16px;
  border: none;
  outline: none;
  resize: none;
  font-family: 'Consolas', 'Menlo', 'Monaco', 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.7;
  color: #37352f;
  background-color: #fafaf9;
  box-sizing: border-box;
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
  background-color: #ffffff;
  box-sizing: border-box;
}

/* Markdown 预览富文本样式 (Notion 风格) */
:deep(.markdown-preview-body) {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  color: #37352f;
  line-height: 1.7;
  font-size: 14.5px;
}

:deep(.empty-preview-hint) {
  color: #a8abb2;
  font-style: italic;
  font-size: 13px;
  padding: 40px 0;
  text-align: center;
}

:deep(h1) {
  font-size: 22px;
  font-weight: 700;
  margin: 16px 0 10px 0;
  padding-bottom: 6px;
  border-bottom: 1px solid #eaecef;
}

:deep(h2) {
  font-size: 18px;
  font-weight: 700;
  margin: 16px 0 8px 0;
  color: #2383e2;
}

:deep(h3) {
  font-size: 15px;
  font-weight: 600;
  margin: 12px 0 6px 0;
}

:deep(.inline-code) {
  background-color: #f2f2f1;
  color: #eb5757;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 13px;
  font-family: monospace;
}

:deep(.code-block-wrapper) {
  background-color: #282c34;
  border-radius: 6px;
  margin: 12px 0;
  overflow: hidden;
}

:deep(.code-block-header) {
  background-color: #21252b;
  color: #abb2bf;
  font-size: 11px;
  padding: 4px 12px;
  text-transform: uppercase;
  font-family: monospace;
}

:deep(.code-block) {
  margin: 0;
  padding: 14px 16px;
  color: #abb2bf;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  line-height: 1.5;
  overflow-x: auto;
}

:deep(.markdown-quote) {
  margin: 10px 0;
  padding: 6px 14px;
  border-left: 4px solid #2383e2;
  background-color: #f7f9fc;
  color: #606266;
}

:deep(.task-list-item) {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 4px 0;
}

:deep(.task-list-item.is-checked) {
  text-decoration: line-through;
  color: #909399;
}

:deep(.checkbox-icon) {
  font-size: 12px;
  font-weight: bold;
  color: #2383e2;
}

:deep(.ul-item), :deep(.ol-item) {
  margin: 4px 0;
  padding-left: 6px;
}

:deep(.markdown-hr) {
  border: none;
  height: 1px;
  background-color: #e4e7ed;
  margin: 16px 0;
}

:deep(.markdown-table) {
  width: 100%;
  border-collapse: collapse;
  margin: 12px 0;
  font-size: 13px;
}

:deep(.markdown-table th), :deep(.markdown-table td) {
  border: 1px solid #dcdfe6;
  padding: 8px 12px;
  text-align: left;
}

:deep(.markdown-table th) {
  background-color: #f5f7fa;
  font-weight: 600;
}

:deep(.markdown-link) {
  color: #2383e2;
  text-decoration: none;
}

:deep(.markdown-link:hover) {
  text-decoration: underline;
}

:deep(.paragraph-gap) {
  height: 10px;
}

.empty-main-state {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #ffffff;
}
</style>