<!-- src/views/WikiShareView.vue -->
<template>
  <div class="share-page-container">
    <!-- 顶部极简只读状态栏 -->
    <header class="share-header">
      <div class="share-brand">
        <img src="@/assets/logo.png" class="brand-logo" alt="ReqFlow Logo" />
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

          <!-- 使用统一 Markdown 渲染组件 -->
          <MarkdownPreview :source="doc.content || ''" :editable-task="false" />
        </template>

        <el-empty v-else-if="!loading" description="该分享文档不存在或已被删除" :image-size="120" />
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { getSharedWikiDetailApi } from '@/api/wiki'
import { ElMessage } from 'element-plus'
import MarkdownPreview from '@/components/markdown/MarkdownPreview.vue'

const route = useRoute()
const loading = ref(false)
const doc = ref(null)

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
  width: 20px;
  height: 20px;
  object-fit: contain;
  border-radius: 4px;
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

.share-scroll-wrapper {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 32px 16px 80px 16px;
  box-sizing: border-box;
  -webkit-overflow-scrolling: touch;
}

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