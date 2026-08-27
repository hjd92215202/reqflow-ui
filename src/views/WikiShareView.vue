<template>
  <div class="share-page-container">
    <!-- 顶部极简只读状态栏 (吸顶固定) -->
    <header class="share-header">
      <div class="share-brand">
        <span class="brand-logo">🌊</span>
        <span class="brand-name">ReqFlow Wiki</span>
        <el-tag size="small" type="info" effect="plain" class="readonly-badge">📖 只读分享模式</el-tag>
      </div>
      <div class="share-header-actions">
        <el-button size="small" @click="handleCopyContent">📋 复制正文</el-button>
      </div>
    </header>

    <!-- 文档主体滚动区域 -->
    <div class="share-scroll-wrapper">
      <main class="share-main-body" v-loading="loading">
        <template v-if="doc">
          <!-- 标题与 Meta 信息 -->
          <div class="article-header">
            <h1 class="article-title">{{ doc.title || '未命名文档' }}</h1>
            
            <div class="article-meta-row">
              <div class="meta-left">
                <span class="meta-item">👤 作者: <b>{{ doc.creatorNickname || '管理员' }}</b></span>
                <span class="meta-item">🕒 更新于: {{ formatTime(doc.updatedAt) }}</span>
              </div>
              <div class="meta-right">
                <el-tag v-if="doc.requirementTitle" type="primary" size="small">
                  📌 {{ doc.requirementTitle }}
                </el-tag>
                <el-tag v-if="doc.tags" type="warning" size="small">
                  🏷️ {{ doc.tags }}
                </el-tag>
              </div>
            </div>
          </div>

          <el-divider style="margin: 16px 0 24px 0;" />

          <!-- Markdown 渲染正文 -->
          <article class="markdown-preview-body" v-html="renderedMarkdown"></article>
        </template>

        <el-empty v-else-if="!loading" description="该分享文档不存在或已被删除" :image-size="120" />
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getSharedWikiDetailApi } from '@/api/wiki'
import { ElMessage } from 'element-plus'

const route = useRoute()
const loading = ref(false)
const doc = ref(null)

// ----------------- 轻量级 Markdown 渲染引擎 -----------------
const parseMarkdownToHtml = (rawText) => {
  if (!rawText) return '<div class="empty-hint">（此文档暂无正文内容）</div>'

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
  return parseMarkdownToHtml(doc.value?.content || '')
})

const loadSharedDoc = async () => {
  const docId = route.params.id
  const serverUrl = route.query.serverUrl
  if (!docId) return

  loading.value = true
  try {
    doc.value = await getSharedWikiDetailApi(docId, serverUrl)
    document.title = `${doc.value.title || '知识文档'} - ReqFlow Wiki`
  } catch (error) {
    ElMessage.error('无法读取分享文档，请确认服务器连接正常')
  } finally {
    loading.value = false
  }
}

const handleCopyContent = () => {
  if (!doc.value?.content) return
  navigator.clipboard.writeText(doc.value.content).then(() => {
    ElMessage.success('已复制正文 Markdown 内容到剪贴板')
  })
}

const formatTime = (timeStr) => {
  if (!timeStr) return ''
  return timeStr.replace('T', ' ').substring(0, 16)
}

onMounted(() => {
  loadSharedDoc()
})
</script>

<style scoped>
/* 整个页面铺满视口，采用 Flex 纵向布局 */
.share-page-container {
  height: 100vh;
  width: 100vw;
  background-color: #fcfcfb;
  display: flex;
  flex-direction: column;
  color: #37352f;
  overflow: hidden;
  box-sizing: border-box;
}

/* 顶部吸顶固定栏 */
.share-header {
  height: 48px;
  background-color: #ffffff;
  border-bottom: 1px solid rgba(55, 53, 47, 0.09);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
  flex-shrink: 0;
  z-index: 10;
}

.share-brand {
  display: flex;
  align-items: center;
  gap: 8px;
}

.brand-logo {
  font-size: 18px;
}

.brand-name {
  font-size: 14px;
  font-weight: 700;
  color: #37352f;
}

.readonly-badge {
  font-size: 11px !important;
  margin-left: 6px;
}

/* 核心滚动视口容器 */
.share-scroll-wrapper {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 32px 16px 80px 16px;
  box-sizing: border-box;
  -webkit-overflow-scrolling: touch;
}

/* 正文白底卡片 */
.share-main-body {
  max-width: 880px;
  margin: 0 auto;
  background: #ffffff;
  padding: 40px 48px;
  border-radius: 8px;
  border: 1px solid rgba(55, 53, 47, 0.08);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  box-sizing: border-box;
}

.article-title {
  margin: 0 0 16px 0;
  font-size: 28px;
  font-weight: 700;
  color: #37352f;
  line-height: 1.3;
}

.article-meta-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  font-size: 12px;
  color: #8c8c8c;
}

.meta-left {
  display: flex;
  gap: 16px;
}

.meta-right {
  display: flex;
  gap: 8px;
}

/* Markdown 富文本样式 */
:deep(.markdown-preview-body) {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  color: #37352f;
  line-height: 1.8;
  font-size: 15px;
  word-break: break-word;
}

:deep(.empty-hint) {
  color: #909399;
  font-style: italic;
  padding: 40px 0;
  text-align: center;
}

:deep(h1) {
  font-size: 24px;
  font-weight: 700;
  margin: 24px 0 12px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid #eaecef;
}

:deep(h2) {
  font-size: 20px;
  font-weight: 700;
  margin: 20px 0 10px 0;
  color: #2383e2;
}

:deep(h3) {
  font-size: 16px;
  font-weight: 600;
  margin: 16px 0 8px 0;
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
  margin: 16px 0;
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
  padding: 16px;
  color: #abb2bf;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13.5px;
  line-height: 1.6;
  overflow-x: auto;
}

:deep(.markdown-quote) {
  margin: 12px 0;
  padding: 8px 16px;
  border-left: 4px solid #2383e2;
  background-color: #f7f9fc;
  color: #606266;
}

:deep(.task-list-item) {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 6px 0;
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
  margin: 6px 0;
}

:deep(.markdown-table) {
  width: 100%;
  border-collapse: collapse;
  margin: 16px 0;
  font-size: 13.5px;
}

:deep(.markdown-table th), :deep(.markdown-table td) {
  border: 1px solid #dcdfe6;
  padding: 10px 14px;
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
  height: 12px;
}

/* 移动端/窄屏自适应 */
@media (max-width: 768px) {
  .share-scroll-wrapper {
    padding: 16px 8px 60px 8px;
  }
  .share-main-body {
    padding: 24px 16px;
  }
  .article-title {
    font-size: 22px;
  }
  .share-header {
    padding: 0 12px;
  }
}
</style>