<template>
  <div class="wiki-workspace">
    <!-- 左侧文档与项目导航树 (占 280px) -->
    <div class="wiki-sidebar">
      <div class="sidebar-header">
        <span class="sidebar-title">📖 项目 Wiki 库</span>
        <el-button type="primary" size="small" @click="handleCreateNewDoc(null)">+ 新建文档</el-button>
      </div>

      <!-- 快捷搜索 -->
      <div class="search-box">
        <el-input v-model="searchKeyword" placeholder="搜索文档标题或标签..." size="small" clearable>
          <template #prefix>🔍</template>
        </el-input>
      </div>

      <!-- 需求空间与文档列表 -->
      <div class="doc-tree-list" v-loading="loading">
        <!-- 全部与通用经验目录 -->
        <div
          :class="['tree-node-item', { active: activeReqFilter === null && (!currentDoc || !currentDoc.id) }]"
          @click="selectFilter(null)"
        >
          <span class="node-icon">🌐</span>
          <span class="node-label">全部文档 ({{ allDocs.length }})</span>
        </div>

        <el-divider style="margin: 8px 0;" />

        <!-- 关联需求的分类空间树 -->
        <div class="tree-category-group">
          <div class="category-title">📌 需求项目经验库</div>
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

        <el-divider style="margin: 8px 0;" />

        <!-- 当前筛选目录下的文档列表 -->
        <div class="category-title">📄 文章列表</div>
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

        <el-empty v-if="filteredDocs.length === 0" description="暂无相关文档" :image-size="60" />
      </div>
    </div>

    <!-- 右侧文档编辑与阅读主视口 -->
    <div class="wiki-main-container" v-if="currentDoc">
      <!-- 1. 顶栏操作区 -->
      <div class="doc-top-bar">
        <div class="top-bar-left">
          <el-tag v-if="currentDoc.requirementTitle" type="primary" size="small">
            📌 关联需求：{{ currentDoc.requirementTitle }}
          </el-tag>
          <el-tag v-else type="info" size="small">🌐 全局实践文档</el-tag>
          <span class="author-info">👤 作者: {{ currentDoc.creatorNickname || '管理员' }}</span>
        </div>
        <div class="top-bar-actions">
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

        <!-- 3. 一键标准化模板快速套用棒 -->
        <div class="template-shortcut-bar">
          <span class="bar-label">⚡️ 快捷套用经验模板：</span>
          <el-button size="small" link type="primary" @click="applyTemplate('TECH')">🛠️ 技术架构方案</el-button>
          <el-button size="small" link type="warning" @click="applyTemplate('PIT')">⚠️ 踩坑与排坑记录</el-button>
          <el-button size="small" link type="success" @click="applyTemplate('REVIEW')">🎯 项目实施复盘</el-button>
          <el-button size="small" link type="info" @click="applyTemplate('CHANGE')">📝 需求变更说明</el-button>
        </div>
      </div>

      <!-- 4. 编辑器主体 -->
      <div class="doc-editor-body">
        <el-input
          v-model="currentDoc.content"
          type="textarea"
          :rows="18"
          placeholder="在此撰写经验复盘、技术细节、踩坑记录... (支持 Markdown 语法)"
          class="markdown-textarea"
        />
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

// 过滤计算属性（增加严格数据防御防崩）
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
      content: '## 1. 概述\n在此记录实施要点...\n',
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
* [x] 功能点 1 按时上线
* [ ] 功能点 2 延期说明

### 2. 经验与做得好的
本次实施中值得团队推广的最佳实践...

### 3. 待改进与改进措施
流程中的不足及下阶段改进动作...`,

    CHANGE: `## 📝 需求变更说明记录

### 1. 变更原因
说明业务方或技术侧发起的变更缘由...

### 2. 影响范围与排期调整
* 影响模块:
* 排期调整: 预计延期 X 天`
  }

  if (templates[type]) {
    currentDoc.value.content = (currentDoc.value.content || '') + '\n\n' + templates[type]
    ElMessage.success('已套用模板')
  }
}

// 防白屏核心高容错时间格式化函数
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
}

.wiki-sidebar {
  width: 280px;
  background-color: #ffffff;
  border-right: 1px solid rgba(55, 53, 47, 0.09);
  display: flex;
  flex-direction: column;
  padding: 16px;
  flex-shrink: 0;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
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

.category-title {
  font-size: 11px;
  font-weight: 700;
  color: #8c8c8c;
  margin: 6px 0;
}

.tree-node-item,
.doc-item-row {
  display: flex;
  align-items: center;
  padding: 8px 10px;
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
  padding: 24px 32px;
  overflow-y: auto;
}

.doc-top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(55, 53, 47, 0.08);
  padding-bottom: 12px;
  margin-bottom: 16px;
}

.top-bar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.author-info {
  font-size: 12px;
  color: #8c8c8c;
}

.doc-header-editor {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 16px;
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
  gap: 24px;
  background-color: #fcfcfb;
  padding: 10px 14px;
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

.template-shortcut-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.bar-label {
  color: #8c8c8c;
}

.doc-editor-body {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.markdown-textarea {
  flex: 1;
}

.markdown-textarea :deep(.el-textarea__inner) {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
  font-size: 14px !important;
  line-height: 1.7 !important;
  color: #37352f !important;
  border: 1px solid rgba(55, 53, 47, 0.1) !important;
  border-radius: 6px !important;
  padding: 16px !important;
}

.empty-main-state {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #ffffff;
}
</style>