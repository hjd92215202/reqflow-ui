<!-- src/components/markdown/MarkdownEditor.vue -->
<template>
  <div class="cm-editor-wrapper" ref="editorContainerRef"></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightActiveLine } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { markdown } from '@codemirror/lang-markdown'
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search'
import { defaultHighlightStyle, syntaxHighlighting, bracketMatching } from '@codemirror/language'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: '在此撰写 Markdown 文档...'
  }
})

const emit = defineEmits(['update:modelValue', 'scroll-change'])

const editorContainerRef = ref(null)
let view = null
let isDispatchingInternal = false

// Notion/VSCode 清爽浅色编辑主题
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

// 快捷键定义
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
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          isDispatchingInternal = true
          const docString = update.state.doc.toString()
          emit('update:modelValue', docString)
          isDispatchingInternal = false
        }
      }),
      EditorView.domEventHandlers({
        scroll: (event, editorView) => {
          const scroller = editorView.scrollDOM
          const scrollPercentage = scroller.scrollTop / (scroller.scrollHeight - scroller.clientHeight || 1)
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

// 供外部工具栏调用的安全原子插入函数
const wrapSelection = (prefix, suffix, defaultPlaceholder = '') => {
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

const insertBlock = (blockText) => {
  if (!view) return
  const { state } = view
  const { from, to } = state.selection.main
  view.dispatch({
    changes: { from, to, insert: blockText },
    selection: { anchor: from + blockText.length }
  })
  view.focus()
}

const scrollToRatio = (ratio) => {
  if (!view) return
  const scroller = view.scrollDOM
  scroller.scrollTop = ratio * (scroller.scrollHeight - scroller.clientHeight)
}

watch(
  () => props.modelValue,
  (newVal) => {
    if (isDispatchingInternal || !view) return
    const currentDoc = view.state.doc.toString()
    if (newVal !== currentDoc) {
      view.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: newVal || '' }
      })
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

defineExpose({
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