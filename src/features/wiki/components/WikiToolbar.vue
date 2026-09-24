<!-- src/features/wiki/components/WikiToolbar.vue -->
<template>
  <div class="markdown-toolbar-bar">
    <div class="tool-group">
      <span class="tool-group-label">快捷语法:</span>
      <el-button-group size="small">
        <el-button title="粗体" @click="emit('wrap', '**', '**', '粗体文字')"><b>B</b></el-button>
        <el-button title="斜体" @click="emit('wrap', '*', '*', '斜体文字')"><i>I</i></el-button>
        <el-button title="删除线" @click="emit('wrap', '~~', '~~', '删除文本')"
          ><del>S</del></el-button
        >
        <el-button title="标题" @click="emit('wrap', '### ', '', '小标题')">H</el-button>
        <el-button title="行内代码" @click="emit('wrap', '`', '`', 'code')">&lt;/&gt;</el-button>
        <el-button title="代码块" @click="insertCodeBlock">代码块</el-button>
        <el-button title="引用" @click="emit('wrap', '> ', '', '引用说明...')">”</el-button>
        <el-button title="任务待办" @click="emit('wrap', '- [ ] ', '', '待办清单任务')"
          >☑️</el-button
        >
        <el-button title="列表" @click="emit('wrap', '- ', '', '无序列表项')">• 列表</el-button>
        <el-button title="表格" @click="insertTable">📊 表格</el-button>
      </el-button-group>
    </div>

    <div class="tool-group templates-group">
      <span class="tool-group-label">⚡️ 经验模板:</span>
      <el-button size="small" link type="primary" @click="emit('template', 'TECH')"
        >🛠️ 架构方案</el-button
      >
      <el-button size="small" link type="warning" @click="emit('template', 'PIT')"
        >⚠️ 排坑记录</el-button
      >
      <el-button size="small" link type="success" @click="emit('template', 'REVIEW')"
        >🎯 项目复盘</el-button
      >
      <el-button size="small" link type="info" @click="emit('template', 'CHANGE')"
        >📝 变更说明</el-button
      >
    </div>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  (e: 'wrap', prefix: string, suffix: string, placeholder?: string): void
  (e: 'insert-block', text: string): void
  (e: 'template', type: 'TECH' | 'PIT' | 'REVIEW' | 'CHANGE'): void
}>()

const insertCodeBlock = () => {
  emit('wrap', '```javascript\n', '\n```', '// 在此输入代码...')
}

const insertTable = () => {
  const tableTemplate =
    '\n| 模块 / 功能 | 说明 | 负责人 | 状态 |\n|---|---|---|---|\n| 接口联调 | 核心数据拉取 | 张三 | 进行中 |\n'
  emit('insert-block', tableTemplate)
}
</script>

<style scoped>
.markdown-toolbar-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #f9f9f8;
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid rgba(55, 53, 47, 0.06);
  flex-wrap: wrap;
  gap: 8px;
}

.tool-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.tool-group-label {
  font-size: 11px;
  font-weight: 600;
  color: #8c8c8c;
}
</style>
