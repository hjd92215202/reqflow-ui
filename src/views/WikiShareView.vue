<!-- src/views/WikiShareView.vue -->
<template>
  <div v-loading="loading" class="share-page">
    <header class="share-header">
      <div class="share-brand">
        <img src="@/assets/logo.png" alt="ReqFlow" />
        <span>ReqFlow Wiki Share</span>
      </div>
      <el-tag size="small" type="info">只读模式</el-tag>
    </header>

    <main class="share-content">
      <article v-if="doc" class="doc-card">
        <h1 class="doc-title">{{ doc.title }}</h1>
        <div class="doc-meta">
          <span>标签: {{ doc.tags || '未分类' }}</span>
          <span>更新时间: {{ formatDate(doc.updatedAt) }}</span>
        </div>
        <div class="doc-render-body">
          <MarkdownPreview :source="doc.content" :editable-task="false" />
        </div>
      </article>

      <el-empty v-else-if="!loading" description="该分享链接已失效或文档已被删除" />
    </main>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { getSharedWikiDetailApi } from '@/api/wiki'
import MarkdownPreview from '@/components/markdown/MarkdownPreview.vue'

const route = useRoute()
const loading = ref(false)
const doc = ref(null)

const load = async () => {
  const token = route.params.token
  if (!token) return
  loading.value = true
  try {
    doc.value = await getSharedWikiDetailApi(token)
  } catch {
    doc.value = null
  } finally {
    loading.value = false
  }
}

const formatDate = s => (s ? String(s).replace('T', ' ').slice(0, 16) : '')

onMounted(load)
</script>

<style scoped>
.share-page {
  min-height: 100vh;
  background: var(--rf-canvas);
  display: flex;
  flex-direction: column;
}

.share-header {
  height: 48px;
  background: #fff;
  border-bottom: 1px solid var(--rf-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
}

.share-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: 13px;
}

.share-brand img {
  width: 20px;
  height: 20px;
}

.share-content {
  flex: 1;
  max-width: 900px;
  margin: 32px auto;
  width: 100%;
  padding: 0 20px;
}

.doc-card {
  background: #fff;
  border: 1px solid var(--rf-border);
  border-radius: 12px;
  padding: 36px 44px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
}

.doc-title {
  margin: 0 0 12px;
  font-size: 28px;
  font-weight: 800;
}

.doc-meta {
  display: flex;
  gap: 16px;
  color: var(--rf-text-3);
  font-size: 12px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--rf-border);
  margin-bottom: 24px;
}

.doc-render-body {
  line-height: 1.75;
}
</style>
