<!-- src/components/markdown/MarkdownEditor.vue -->
<template>
  <div ref="editorContainerRef" class="cm-editor-wrapper"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { EditorState } from '@codemirror/state'
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLineGutter,
  highlightActiveLine
} from '@codemirror/view'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { markdown } from '@codemirror/lang-markdown'
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search'
import { defaultHighlightStyle, syntaxHighlighting, bracketMatching } from '@codemirror/language'

export interface MarkdownEditorProps {
  modelValue?: string
  placeholder?: string
}

export interface MarkdownEditorExpose {
  wrapSelection: (prefix: string, suffix: string, defaultPlaceholder?: string) => void
  insertBlock: (blockText: string) => void
  scrollToRatio: (ratio: number) => void
}

const props = withDefaults(defineProps<MarkdownEditorProps>(), {
  modelValue: '',
  placeholder: '在此撰写 Markdown 文档...'
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'scroll-change', ratio: number): void
}>()

const editorContainerRef = ref<HTMLDivElement | null>(null)
let view: EditorView | null = null
let isDispatchingInternal = false

// 清爽浅色主题
const editorTheme = EditorView.theme({
  '&': {
    height: '100%',
    fontSize: '14px',
    backgroundColor: '#fafaf9'
  },
  '.cm-scroller': {
    fontFamily: 'Consolas, Menlo, Monaco, "Courier New", monospace',
    lineHeight: '1.7',
    padding: '8px 0'
  },
  '.cm-content': {
    padding: '0 16px',
    caretColor: '#2383e2'
  },
  '&.cm-focused .cm-cursor': {
    borderLeftColor: '#2383e2',
    borderLeftWidth: '2px'
  },
  '.cm-gutters': {
    backgroundColor: '#fafaf9',
    color: '#a8abb2',
    borderRight: '1px solid rgba(55, 53, 47, 0.08)',
    paddingRight: '6px'
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(55, 53, 47, 0.03)'
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'rgba(55, 53, 47, 0.06)',
    color: '#37352f'
  },
  '.cm-selectionBackground, ::selection': {
    backgroundColor: '#cce2ff !important'
  }
})

// 快捷键映射
const customKeymap = [
  {
    key: 'Mod-b',
    run: () => {
      wrapSelection('**', '**', '粗体文字')
      return true
    }
  },
  {
    key: 'Mod-i',
    run: () => {
      wrapSelection('*', '*', '斜体文字')
      return true
    }
  },
  {
    key: 'Mod-k',
    run: () => {
      wrapSelection('[', '](url)', '链接文本')
      return true
    }
  },
  {
    key: 'Mod-Shift-x',
    run: () => {
      wrapSelection('~~', '~~', '删除线文字')
      return true
    }
  }
]

const initEditor = () => {
  if (!editorContainerRef.value) return

  const state = EditorState.create({
    doc: props.modelValue || '',
    extensions: [
      lineNumbers(),
      highlightActiveLineGutter(),
      history(),
      bracketMatching(),
      highlightActiveLine(),
      highlightSelectionMatches(),
      syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
      markdown(),
      EditorView.lineWrapping,
      editorTheme,
      keymap.of([
        indentWithTab,
        ...customKeymap,
        ...defaultKeymap,
        ...historyKeymap,
        ...searchKeymap
      ]),
      EditorView.updateListener.of(update => {
        if (update.docChanged) {
          isDispatchingInternal = true
          const docString = update.state.doc.toString()
          emit('update:modelValue', docString)
          isDispatchingInternal = false
        }
      }),
      EditorView.domEventHandlers({
        scroll: (_event, editorView) => {
          const scroller = editorView.scrollDOM
          const scrollPercentage =
            scroller.scrollTop / (scroller.scrollHeight - scroller.clientHeight || 1)
          emit('scroll-change', scrollPercentage)
        }
      })
    ]
  })

  view = new EditorView({
    state,
    parent: editorContainerRef.value
  })
}

const wrapSelection = (prefix: string, suffix: string, defaultPlaceholder: string = '') => {
  if (!view) return
  const { state } = view
  const { from, to } = state.selection.main
  const selectedText = state.sliceDoc(from, to) || defaultPlaceholder
  const replacement = `${prefix}${selectedText}${suffix}`

  view.dispatch({
    changes: { from, to, insert: replacement },
    selection: {
      anchor: from + prefix.length,
      head: from + prefix.length + selectedText.length
    }
  })
  view.focus()
}

const insertBlock = (blockText: string) => {
  if (!view) return
  const { state } = view
  const { from, to } = state.selection.main
  view.dispatch({
    changes: { from, to, insert: blockText },
    selection: { anchor: from + blockText.length }
  })
  view.focus()
}

const scrollToRatio = (ratio: number) => {
  if (!view) return
  const scroller = view.scrollDOM
  scroller.scrollTop = ratio * (scroller.scrollHeight - scroller.clientHeight)
}

// 核心优化：避免在正在打字或中文输入法（IME）合成期间覆盖文档引发光标跳动
watch(
  () => props.modelValue,
  newVal => {
    if (isDispatchingInternal || !view) return
    const currentDoc = view.state.doc.toString()
    if (newVal !== currentDoc) {
      // 仅当外部真正发生异动（如切换文档、套用模板）且未聚焦时重置，保护输入时光标稳定
      if (!view.hasFocus) {
        view.dispatch({
          changes: { from: 0, to: currentDoc.length, insert: newVal || '' }
        })
      }
    }
  }
)

onMounted(() => {
  initEditor()
})

onBeforeUnmount(() => {
  if (view) {
    view.destroy()
  }
})

defineExpose<MarkdownEditorExpose>({
  wrapSelection,
  insertBlock,
  scrollToRatio
})
</script>

<style scoped>
.cm-editor-wrapper {
  width: 100%;
  height: 100%;
  overflow: hidden;
  position: relative;
}
:deep(.cm-editor) {
  height: 100%;
}
</style>
