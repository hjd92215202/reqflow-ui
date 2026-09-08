// src/composables/useMarkdown.js
import { Marked } from 'marked'
import DOMPurify from 'dompurify'
import GithubSlugger from 'github-slugger'
import hljs from 'highlight.js/lib/core'

// 注册子集核心语言以控制体积
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import json from 'highlight.js/lib/languages/json'
import java from 'highlight.js/lib/languages/java'
import python from 'highlight.js/lib/languages/python'
import go from 'highlight.js/lib/languages/go'
import rust from 'highlight.js/lib/languages/rust'
import sql from 'highlight.js/lib/languages/sql'
import bash from 'highlight.js/lib/languages/bash'
import yaml from 'highlight.js/lib/languages/yaml'
import xml from 'highlight.js/lib/languages/xml'
import css from 'highlight.js/lib/languages/css'
import cpp from 'highlight.js/lib/languages/cpp'
import ini from 'highlight.js/lib/languages/ini'

hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('js', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('ts', typescript)
hljs.registerLanguage('json', json)
hljs.registerLanguage('java', java)
hljs.registerLanguage('python', python)
hljs.registerLanguage('py', python)
hljs.registerLanguage('go', go)
hljs.registerLanguage('rust', rust)
hljs.registerLanguage('rs', rust)
hljs.registerLanguage('sql', sql)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('sh', bash)
hljs.registerLanguage('yaml', yaml)
hljs.registerLanguage('yml', yaml)
hljs.registerLanguage('xml', xml)
hljs.registerLanguage('html', xml)
hljs.registerLanguage('css', css)
hljs.registerLanguage('cpp', cpp)
hljs.registerLanguage('properties', ini)
hljs.registerLanguage('ini', ini)

/**
 * 将 Markdown 源码渲染为标准化、安全的高亮 HTML
 * @param {string} rawMarkdown
 * @param {object} options { editableTask: boolean }
 * @returns {string} Safe HTML
 */
export function renderMarkdownToHtml(rawMarkdown, options = {}) {
  if (!rawMarkdown || !rawMarkdown.trim()) {
    return '<div class="empty-preview-hint">✍️ 输入 Markdown 内容，实时渲染将在此呈现...</div>'
  }

  const slugger = new GithubSlugger()
  let checkboxCounter = 0

  const markedInstance = new Marked({
    gfm: true,
    breaks: true
  })

  // 自定义 Renderer
  const renderer = {
    heading({ tokens, depth }) {
      const text = this.parser.parseInline(tokens)
      // 提取纯文本生成 GitHub 规范 Slug
      const rawHeadingText = tokens.map(t => t.raw || t.text || '').join('')
      const id = slugger.slug(rawHeadingText)
      return `<h${depth} id="${id}">${text}</h${depth}>\n`
    },
    code({ text, lang }) {
      const language = (lang || '').trim().toLowerCase()
      let highlighted = ''
      const validLang = language && hljs.getLanguage(language) ? language : 'plaintext'

      if (validLang !== 'plaintext') {
        try {
          highlighted = hljs.highlight(text, { language: validLang, ignoreIllegals: true }).value
        } catch {
          highlighted = DOMPurify.sanitize(text)
        }
      } else {
        highlighted = DOMPurify.sanitize(text)
      }

      const langLabel = language || 'text'
      return `
        <div class="code-block-wrap">
          <div class="code-block-header">
            <span class="code-lang-tag">${langLabel}</span>
            <button class="code-copy-btn" type="button" data-code="${encodeURIComponent(text)}">📋 复制</button>
          </div>
          <pre><code class="hljs language-${validLang}">${highlighted}</code></pre>
        </div>
      `
    },
    table(header, body) {
      return `<div class="table-wrap"><table>${header}${body}</table></div>`
    },
    checkbox({ checked }) {
      const idx = checkboxCounter++
      const checkedAttr = checked ? 'checked' : ''
      const disabledAttr = options.editableTask ? '' : 'disabled'
      return `<input type="checkbox" class="task-list-item-checkbox" data-task-index="${idx}" ${checkedAttr} ${disabledAttr} /> `
    }
  }

  markedInstance.use({ renderer })
  const parsedHtml = markedInstance.parse(rawMarkdown)

  // DOMPurify 安全净化
  return DOMPurify.sanitize(parsedHtml, {
    ADD_TAGS: ['input'],
    ADD_ATTR: ['target', 'rel', 'align', 'checked', 'disabled', 'data-task-index', 'data-code', 'type'],
    FORBID_TAGS: ['style', 'script', 'iframe', 'form'],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
  })
}

/**
 * 提取目录结构 Toc
 */
export function extractToc(rawMarkdown) {
  if (!rawMarkdown) return []
  const slugger = new GithubSlugger()
  const headings = []
  const lines = rawMarkdown.split('\n')

  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.*)$/)
    if (match) {
      const level = match[1].length
      const text = match[2].trim().replace(/[*_~`]/g, '')
      const id = slugger.slug(text)
      headings.push({ level, text, id })
    }
  }
  return headings
}