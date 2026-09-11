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

<script setup>
import { computed, ref } from 'vue'
import { renderMarkdownToHtml } from '@/composables/useMarkdown'
import { ElMessage } from 'element-plus'

const props = defineProps({
  source: {
    type: String,
    default: ''
  },
  editableTask: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['task-toggle'])
const previewBodyRef = ref(null)

const renderedHtml = computed(() => {
  return renderMarkdownToHtml(props.source, {
    editableTask: props.editableTask
  })
})

// 处理代码块复制事件
const handleContainerClick = e => {
  const btn = e.target.closest('.code-copy-btn')
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
const handleCheckboxChange = e => {
  if (!props.editableTask) return
  const target = e.target
  if (target && target.classList.contains('task-list-item-checkbox')) {
    const index = parseInt(target.getAttribute('data-task-index'), 10)
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
