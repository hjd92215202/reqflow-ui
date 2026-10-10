<template>
  <el-form label-position="top" :disabled="disabled">
    <el-form-item label="决策标题" required
      ><el-input v-model="draft.title" maxlength="255"
    /></el-form-item>
    <el-form-item label="背景 / 正在解决的问题" required
      ><el-input v-model="draft.context" type="textarea" :rows="3" maxlength="10000"
    /></el-form-item>
    <el-form-item label="状态"
      ><el-select v-model="draft.status" :disabled="replacing">
        <el-option label="拟议" value="PROPOSED" /><el-option
          label="已采纳"
          value="ACCEPTED"
        /><el-option label="已否决" value="REJECTED" /> </el-select
    ></el-form-item>
    <el-form-item label="候选方案（选填）">
      <div class="collection">
        <div v-for="(option, index) in draft.options" :key="index" class="option-card">
          <el-input
            v-model="option.name"
            maxlength="1000"
            :aria-label="`方案 ${index + 1} 名称`"
            placeholder="方案名称"
          />
          <el-input
            v-model="option.pros"
            type="textarea"
            :rows="2"
            maxlength="10000"
            :aria-label="`方案 ${index + 1} 优点`"
            placeholder="优点（选填）"
          />
          <el-input
            v-model="option.cons"
            type="textarea"
            :rows="2"
            maxlength="10000"
            :aria-label="`方案 ${index + 1} 缺点`"
            placeholder="缺点 / 代价（选填）"
          />
          <el-button link type="danger" @click="draft.options.splice(index, 1)"
            >移除方案 {{ index + 1 }}</el-button
          >
        </div>
        <el-button
          v-if="draft.options.length < 20"
          link
          type="primary"
          @click="draft.options.push({ name: '', pros: '', cons: '' })"
          >添加候选方案</el-button
        >
      </div>
    </el-form-item>
    <el-form-item label="最终选择" :required="draft.status === 'ACCEPTED'"
      ><el-input
        v-model="draft.chosenOption"
        type="textarea"
        :rows="3"
        maxlength="10000"
        placeholder="提案可以暂不确定最终选择"
    /></el-form-item>
    <el-form-item label="选择理由 / 主要取舍" :required="draft.status !== 'PROPOSED'"
      ><el-input v-model="draft.rationale" type="textarea" :rows="3" maxlength="10000"
    /></el-form-item>
    <el-form-item label="关键假设或风险（选填）"
      ><div class="collection">
        <div v-for="(_, index) in draft.assumptions" :key="index" class="assumption-row">
          <el-input
            v-model="draft.assumptions[index]"
            maxlength="1000"
            :aria-label="`假设或风险 ${index + 1}`"
          />
          <el-button link type="danger" @click="draft.assumptions.splice(index, 1)">移除</el-button>
        </div>
        <el-button v-if="draft.assumptions.length < 50" link @click="draft.assumptions.push('')"
          >添加假设或风险</el-button
        >
      </div></el-form-item
    >
    <el-form-item label="信心程度（选填）"
      ><el-select v-model="draft.confidence" clearable
        ><el-option label="低" value="LOW" /><el-option label="中" value="MEDIUM" /><el-option
          label="高"
          value="HIGH" /></el-select
    ></el-form-item>
    <el-form-item label="后续验证或复查日期（选填）"
      ><el-date-picker v-model="draft.reviewDate" type="date" value-format="YYYY-MM-DD"
    /></el-form-item>
    <el-collapse>
      <el-collapse-item title="AI 参与说明（选填）" name="ai">
        <el-form-item label="AI 参与环节"
          ><el-select v-model="assistance.phases" multiple
            ><el-option
              v-for="(label, key) in aiPhases"
              :key="key"
              :label="label"
              :value="key" /></el-select
        ></el-form-item>
        <el-form-item label="AI 贡献内容"
          ><el-input v-model="assistance.contribution" type="textarea" :rows="2" maxlength="10000"
        /></el-form-item>
        <el-form-item label="人工完成的关键判断"
          ><el-input v-model="assistance.humanJudgment" type="textarea" :rows="2" maxlength="10000"
        /></el-form-item>
        <el-form-item label="AI 建议的处理方式"
          ><el-select v-model="assistance.handling" clearable
            ><el-option
              v-for="(label, key) in aiHandling"
              :key="key"
              :label="label"
              :value="key" /></el-select
        ></el-form-item>
        <el-form-item label="如何验证 AI 相关输出"
          ><el-input
            v-model="assistance.verification"
            type="textarea"
            :rows="2"
            maxlength="10000"
            placeholder="记录验证方式；说明本身不代表验证已通过"
        /></el-form-item>
      </el-collapse-item>
    </el-collapse>
  </el-form>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { aiPhases, aiHandling, type DecisionContent } from '../../types/decision'
defineProps<{ disabled: boolean; replacing: boolean }>()
const draft = defineModel<DecisionContent>('draft', { required: true })
// Parent owns this independent editor draft; form changes are saved explicitly.
const assistance = computed(() => draft.value.aiAssistance!)
</script>
<style scoped>
.collection {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.option-card {
  display: grid;
  gap: 8px;
  padding: 12px;
  background: #f8f9fb;
  border-radius: 6px;
}
.assumption-row {
  display: flex;
  gap: 8px;
}
</style>
