<!-- src/components/markdown/MarkdownPreview.vue -->
<template>
  <div class="markdown-preview-container">
    <div
      ref="previewBodyRef"
      class="markdown-body"
      @click="handleContainerClick"
      @change="handleCheckboxChange"
      v-html="renderedHtml"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { renderMarkdownToHtml } from './useMarkdown'
import { ElMessage } from 'element-plus'

export interface MarkdownPreviewProps {
  source?: string
  editableTask?: boolean
}

export interface TaskTogglePayload {
  index: number
  checked: boolean
}

const props = withDefaults(defineProps<MarkdownPreviewProps>(), {
  source: '',
  editableTask: false
})

const emit = defineEmits<{
  (e: 'task-toggle', payload: TaskTogglePayload): void
}>()

const previewBodyRef = ref<HTMLDivElement | null>(null)

const renderedHtml = computed(() => {
  return renderMarkdownToHtml(props.source, {
    editableTask: props.editableTask
  })
})

// 处理代码块复制事件
const handleContainerClick = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  const btn = target.closest('.code-copy-btn') as HTMLElement | null
  if (btn) {
    const rawCode = decodeURIComponent(btn.getAttribute('data-code') || '')
    if (rawCode) {
      navigator.clipboard.writeText(rawCode).then(() => {
        const originalText = btn.innerText
        btn.innerText = '✓ 已复制'
        ElMessage.success('代码已复制到剪贴板')
        setTimeout(() => {
          btn.innerText = originalText
        }, 1500)
      })
    }
  }
}

// 处理编辑态复选框点击联动
const handleCheckboxChange = (e: Event) => {
  if (!props.editableTask) return
  const target = e.target as HTMLInputElement | null
  if (target && target.classList.contains('task-list-item-checkbox')) {
    const index = parseInt(target.getAttribute('data-task-index') || '0', 10)
    emit('task-toggle', {
      index,
      checked: target.checked
    })
  }
}
</script>

<style scoped>
.markdown-preview-container {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
}
</style>
