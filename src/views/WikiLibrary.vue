<template>
  <div class="wiki">
    <aside class="wiki-side">
      <div class="wiki-head">
        <div>
          <div class="eyebrow">KNOWLEDGE</div>
          <h1>知识库</h1>
        </div>
        <el-button type="primary" size="small" @click="createDoc">新建</el-button>
      </div>
      <el-input v-model="search" placeholder="搜索标题 / 标签" clearable class="search"
        ><template #prefix>⌕</template></el-input
      >
      <div class="filters">
        <button :class="{ active: reqFilter === null }" @click="reqFilter = null">
          全部文档 <span>{{ docs.length }}</span></button
        ><button
          v-for="r in requirements"
          :key="r.id"
          :class="{ active: reqFilter === r.id }"
          @click="reqFilter = r.id"
        >
          {{ r.title }} <span>{{ count(r.id) }}</span>
        </button>
      </div>
      <div class="doc-list">
        <button
          v-for="d in filtered"
          :key="d.id"
          :class="['doc-row', { active: current?.id === d.id }]"
          @click="select(d)"
        >
          <span class="doc-type">DOC</span>
          <div>
            <strong>{{ d.title || '未命名文档' }}</strong
            ><span>{{ d.tags || '未分类' }} · {{ format(d.updatedAt) }}</span>
          </div></button
        ><el-empty v-if="!filtered.length" description="暂无文档" />
      </div>
    </aside>
    <main class="editor">
      <div v-if="current" class="editor-top">
        <div>
          <span class="context">{{ current.requirementTitle || '全局知识' }}</span>
          <h2>{{ current.title }}</h2>
          <p>{{ current.creatorNickname || '系统' }} · {{ format(current.updatedAt) }}</p>
        </div>
        <div class="actions">
          <div class="view-tabs">
            <button :class="{ active: mode === 'edit' }" @click="mode = 'edit'">编辑</button
            ><button :class="{ active: mode === 'split' }" @click="mode = 'split'">分屏</button
            ><button :class="{ active: mode === 'preview' }" @click="mode = 'preview'">阅读</button>
          </div>
          <el-button @click="share">分享</el-button
          ><el-button type="primary" :loading="saving" @click="save">保存</el-button>
        </div>
      </div>
      <div v-if="current" class="properties">
        <el-input v-model="current.title" class="title-edit" placeholder="文档标题" /><el-select
          v-model="current.requirementId"
          clearable
          placeholder="关联需求"
          ><el-option
            v-for="r in requirements"
            :key="r.id"
            :label="r.title"
            :value="r.id" /></el-select
        ><el-input v-model="current.tags" placeholder="标签：架构方案,踩坑记录" />
      </div>
      <div v-if="current" class="doc-body" :class="`mode-${mode}`">
        <div v-show="mode !== 'preview'" class="editor-pane">
          <MarkdownEditor ref="editorRef" v-model="current.content" />
        </div>
        <div v-if="mode === 'split'" class="split"></div>
        <div v-show="mode !== 'edit'" class="preview-pane">
          <MarkdownPreview
            :source="current.content"
            :editable-task="true"
            @task-toggle="toggleTask"
          />
        </div>
      </div>
      <div v-else class="empty-doc">
        <el-empty description="从左侧选择一篇知识文档，或创建第一篇" />
      </div>
    </main>
  </div>
  <el-dialog v-model="shareVisible" title="分享文档" width="470px"
    ><p class="share-tip">生成只读链接，对方无需登录即可查看。</p>
    <el-input v-model="shareUrl" readonly /><template #footer
      ><el-button @click="shareVisible = false">关闭</el-button
      ><el-button type="primary" @click="copy">复制链接</el-button></template
    ></el-dialog
  >
</template>
<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { getWikiListApi, createWikiApi, updateWikiApi, getDocShareTokenApi } from '@/api/wiki'
import { getRequirementsListApi } from '@/api/requirement'
import { useUserStore } from '@/store/user'
import MarkdownEditor from '@/components/markdown/MarkdownEditor.vue'
import MarkdownPreview from '@/components/markdown/MarkdownPreview.vue'
const route = useRoute(),
  userStore = useUserStore(),
  docs = ref([]),
  requirements = ref([]),
  current = ref(null),
  search = ref(''),
  reqFilter = ref(route.query.reqId ? Number(route.query.reqId) : null),
  mode = ref('split'),
  saving = ref(false),
  shareVisible = ref(false),
  shareUrl = ref(''),
  editorRef = ref(null)
const filtered = computed(() =>
  docs.value.filter(
    d =>
      (reqFilter.value === null || d.requirementId === reqFilter.value) &&
      (!search.value.trim() ||
        `${d.title || ''} ${d.tags || ''}`.toLowerCase().includes(search.value.toLowerCase()))
  )
)
const count = id => docs.value.filter(d => d.requirementId === id).length
const format = s => (s ? String(s).split('T')[0] : '')
const select = d => (current.value = { ...d })
const createDoc = async () => {
  try {
    const d = await createWikiApi({
      title: '新知识文档',
      content: '# 新知识文档\n\n记录可复用的实践、架构和复盘。',
      requirementId: reqFilter.value,
      tags: '实践'
    })
    await load()
    current.value = { ...d }
  } catch {}
}
const save = async () => {
  if (!current.value) return
  saving.value = true
  try {
    await updateWikiApi(current.value.id, current.value)
    await load()
    ElMessage.success('已保存')
  } catch {
  } finally {
    saving.value = false
  }
}
const share = async () => {
  if (!current.value) return
  try {
    const r = await getDocShareTokenApi(current.value.id)
    const token = r.shareToken || r
    shareUrl.value = `${userStore.serverUrl.replace(/\/$/, '')}/share/wiki/${token}`
    shareVisible.value = true
  } catch {}
}
const copy = () =>
  navigator.clipboard.writeText(shareUrl.value).then(() => {
    ElMessage.success('链接已复制')
    shareVisible.value = false
  })
const toggleTask = ({ index, checked }) => {
  const lines = current.value.content.split('\n')
  let i = 0
  for (let n = 0; n < lines.length; n++) {
    if (/^\s*-\s*\[[ xX]\]\s+/.test(lines[n])) {
      if (i === index) {
        lines[n] = checked
          ? lines[n].replace(/^([^-]*-\s*\[)[ xX](\])/, '$1x$2')
          : lines[n].replace(/^([^-]*-\s*\[)[ xX](\])/, '$1 $2')
        break
      }
      i++
    }
  }
  current.value.content = lines.join('\n')
}
const load = async () => {
  try {
    const rr = await getRequirementsListApi({ page: 0, size: 200 })
    requirements.value = rr?.content || rr || []
    docs.value = (await getWikiListApi()) || []
    if (reqFilter.value === null && route.query.reqId) reqFilter.value = Number(route.query.reqId)
    if (!current.value && filtered.value.length) current.value = { ...filtered.value[0] }
  } catch {}
}
onMounted(load)
</script>
<style scoped>
.wiki {
  height: 100%;
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  overflow: hidden;
}
.wiki-side {
  background: #fff;
  border-right: 1px solid var(--rf-border);
  display: flex;
  flex-direction: column;
  padding: 18px 12px;
  min-width: 0;
}
.wiki-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 0 6px 14px;
}
.eyebrow {
  font-size: 9px;
  letter-spacing: 1px;
  font-weight: 800;
  color: var(--rf-text-3);
  margin-bottom: 5px;
}
.wiki-head h1 {
  margin: 0;
  font-size: 20px;
}
.search {
  margin: 0 4px 12px;
  width: auto;
}
.filters {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 180px;
  overflow: auto;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--rf-border);
}
.filters button {
  display: flex;
  justify-content: space-between;
  border: 0;
  background: transparent;
  padding: 7px 8px;
  border-radius: 6px;
  color: var(--rf-text-2);
  font-size: 11px;
  text-align: left;
  cursor: pointer;
}
.filters button:hover {
  background: var(--rf-subtle);
}
.filters button.active {
  background: var(--rf-brand-soft);
  color: var(--rf-brand);
}
.filters span {
  color: var(--rf-text-3);
}
.doc-list {
  overflow: auto;
  padding-top: 8px;
}
.doc-row {
  display: flex;
  gap: 9px;
  width: 100%;
  border: 0;
  background: transparent;
  text-align: left;
  padding: 9px 7px;
  border-radius: 7px;
  color: var(--rf-text-2);
  cursor: pointer;
}
.doc-row:hover {
  background: #f7f8fa;
}
.doc-row.active {
  background: #eef1ff;
}
.doc-type {
  font: 800 8px ui-monospace;
  color: var(--rf-brand);
  padding-top: 3px;
}
.doc-row strong,
.doc-row span {
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.doc-row strong {
  font-size: 11px;
  color: var(--rf-text);
}
.doc-row div span {
  font-size: 9px;
  color: var(--rf-text-3);
  margin-top: 3px;
}
.editor {
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}
.editor-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 20px 26px 13px;
  border-bottom: 1px solid var(--rf-border);
  background: #fff;
}
.context {
  font-size: 9px;
  color: var(--rf-brand);
  font-weight: 800;
}
.editor-top h2 {
  font-size: 20px;
  margin: 4px 0;
}
.editor-top p {
  margin: 0;
  font-size: 10px;
  color: var(--rf-text-3);
}
.actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.view-tabs {
  display: flex;
  border: 1px solid var(--rf-border);
  border-radius: 7px;
  padding: 2px;
  background: #fafbfc;
}
.view-tabs button {
  border: 0;
  background: transparent;
  padding: 6px 9px;
  font-size: 10px;
  font-weight: 700;
  color: var(--rf-text-2);
  border-radius: 5px;
  cursor: pointer;
}
.view-tabs button.active {
  background: #fff;
  color: var(--rf-text);
  box-shadow: 0 1px 3px rgba(20, 28, 40, 0.05);
}
.properties {
  display: grid;
  grid-template-columns: 1fr 210px 240px;
  gap: 8px;
  padding: 10px 26px;
  border-bottom: 1px solid var(--rf-border);
  background: #fff;
}
.title-edit :deep(.el-input__inner) {
  font-size: 14px;
  font-weight: 700;
}
.doc-body {
  flex: 1;
  min-height: 0;
  display: flex;
  background: #fff;
}
.editor-pane,
.preview-pane {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}
.split {
  width: 1px;
  background: var(--rf-border);
}
.preview-pane {
  overflow: auto;
  padding: 22px 28px;
}
.empty-doc {
  display: grid;
  place-items: center;
  flex: 1;
}
.share-tip {
  font-size: 12px;
  color: var(--rf-text-2);
}
@media (max-width: 900px) {
  .wiki {
    grid-template-columns: 250px 1fr;
  }
  .properties {
    grid-template-columns: 1fr;
  }
  .actions .el-button {
    display: none;
  }
}
@media (max-width: 680px) {
  .wiki {
    grid-template-columns: 1fr;
  }
  .wiki-side {
    display: none;
  }
}
</style>
