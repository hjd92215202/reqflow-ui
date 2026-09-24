<!-- src/features/wiki/components/WikiBacklinksCard.vue -->
<template>
  <div v-if="currentRequirement" class="backlinks-container">
    <div class="backlinks-header" @click="isCollapsed = !isCollapsed">
      <div class="header-left">
        <span class="backlinks-icon">🔗</span>
        <span class="backlinks-title">反向链接与工程上下文 (Backlinks)</span>
        <el-tag size="small" :type="getStatusTag(currentRequirement.status)" class="req-status-tag">
          {{ formatStatus(currentRequirement.status) }}
        </el-tag>
      </div>
      <div class="header-right">
        <el-button link size="small" class="matrix-jump-btn" @click.stop="goToMatrix">
          直达协同矩阵 ➔
        </el-button>
        <span :class="['toggle-arrow', { collapsed: isCollapsed }]">▼</span>
      </div>
    </div>

    <el-collapse-transition>
      <div v-show="!isCollapsed" class="backlinks-body">
        <!-- 1. 需求上下文属性摘要 -->
        <div class="req-meta-row">
          <span class="meta-label">📌 绑定需求:</span>
          <span class="meta-val highlight-title">{{ currentRequirement.title }}</span>
          <span class="meta-divider">|</span>
          <span class="meta-label">📅 排期起止:</span>
          <span class="meta-val">
            {{ currentRequirement.startDate || '未定' }} 至
            {{ currentRequirement.endDate || '未定' }}
          </span>
          <span class="meta-divider">|</span>
          <span class="meta-label">⚡ 优先级:</span>
          <el-tag
            size="small"
            :type="currentRequirement.priority === 'HIGH' ? 'danger' : 'warning'"
          >
            {{ currentRequirement.priority }}
          </el-tag>
        </div>

        <!-- 2. 同需求下的其他关联沉淀 (反向兄弟文档网) -->
        <div class="sibling-docs-row">
          <span class="meta-label">📄 本需求关联的其他沉淀 ({{ siblingDocs.length }} 篇):</span>
          <div v-if="siblingDocs.length > 0" class="docs-chip-list">
            <div
              v-for="doc in siblingDocs"
              :key="doc.id"
              class="doc-chip-item"
              title="点击快速切换至此文档"
              @click="emit('switch-doc', doc)"
            >
              <span class="chip-icon">📝</span>
              <span class="chip-title">{{ doc.title || '未命名文档' }}</span>
              <span v-if="doc.tags" class="chip-tag">{{ doc.tags }}</span>
            </div>
          </div>
          <span v-else class="empty-sibling-hint">本需求暂无其他关联文档</span>
        </div>
      </div>
    </el-collapse-transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import type { WikiDocument, Requirement, RequirementStatus } from '@/types'

const props = defineProps<{
  currentDoc: WikiDocument | null
  requirements: Requirement[]
  allDocs: WikiDocument[]
}>()

const emit = defineEmits<{
  (e: 'switch-doc', doc: WikiDocument): void
}>()

const router = useRouter()
const isCollapsed = ref(false)

// 查找当前文档所属的主需求
const currentRequirement = computed(() => {
  if (!props.currentDoc?.requirementId) return null
  return props.requirements.find(r => r.id === props.currentDoc!.requirementId) || null
})

// 查找同需求下的其他关联兄弟文档（排除当前这篇）
const siblingDocs = computed(() => {
  if (!props.currentDoc?.requirementId) return []
  return props.allDocs.filter(
    d => d.requirementId === props.currentDoc!.requirementId && d.id !== props.currentDoc!.id
  )
})

const goToMatrix = () => {
  if (currentRequirement.value) {
    router.push({
      path: '/matrix',
      query: { reqId: currentRequirement.value.id }
    })
  }
}

const getStatusTag = (
  s: RequirementStatus
): 'success' | 'warning' | 'primary' | 'danger' | 'info' => {
  switch (s) {
    case 'TODO':
      return 'info'
    case 'IN_PROGRESS':
      return 'warning'
    case 'TESTING':
      return 'primary'
    case 'DONE':
      return 'success'
    case 'SUSPENDED':
      return 'danger'
    default:
      return 'info'
  }
}

const formatStatus = (s: RequirementStatus): string => {
  const map: Record<RequirementStatus, string> = {
    TODO: '待处理',
    IN_PROGRESS: '进行中',
    TESTING: '测试中',
    DONE: '已完成',
    SUSPENDED: '已挂起'
  }
  return map[s] || s
}
</script>

<style scoped>
.backlinks-container {
  margin-top: 14px;
  background-color: #fbfbfa;
  border: 1px solid rgba(55, 53, 47, 0.09);
  border-radius: 6px;
  overflow: hidden;
  flex-shrink: 0;
}

.backlinks-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 14px;
  cursor: pointer;
  background-color: #f7f7f5;
  user-select: none;
  border-bottom: 1px solid rgba(55, 53, 47, 0.06);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.backlinks-icon {
  font-size: 13px;
}

.backlinks-title {
  font-size: 12px;
  font-weight: 600;
  color: #37352f;
}

.req-status-tag {
  font-size: 10px !important;
  height: 18px !important;
  line-height: 18px !important;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.matrix-jump-btn {
  font-size: 11px;
  color: #2383e2;
  padding: 0;
}

.toggle-arrow {
  font-size: 10px;
  color: #8c8c8c;
  transition: transform 0.2s ease;
}

.toggle-arrow.collapsed {
  transform: rotate(-90deg);
}

.backlinks-body {
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 12px;
}

.req-meta-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  color: #5f5e5b;
}

.meta-label {
  color: #8c8c8c;
  font-weight: 500;
}

.meta-val {
  color: #37352f;
}

.highlight-title {
  font-weight: 600;
}

.meta-divider {
  color: rgba(55, 53, 47, 0.15);
  margin: 0 4px;
}

.sibling-docs-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 2px;
}

.docs-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.doc-chip-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  background-color: #ffffff;
  border: 1px solid rgba(55, 53, 47, 0.1);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s ease-in-out;
}

.doc-chip-item:hover {
  border-color: #2383e2;
  background-color: #f0f7ff;
  transform: translateY(-1px);
}

.chip-icon {
  font-size: 11px;
}

.chip-title {
  font-size: 11.5px;
  color: #37352f;
  font-weight: 500;
}

.chip-tag {
  font-size: 10px;
  color: #8c8c8c;
  background-color: rgba(55, 53, 47, 0.05);
  padding: 0 4px;
  border-radius: 2px;
}

.empty-sibling-hint {
  color: #a8abb2;
  font-style: italic;
}
</style>
