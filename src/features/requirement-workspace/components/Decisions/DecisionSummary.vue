<template>
  <article class="decision-summary">
    <h3>{{ record.content.title }}</h3>
    <p>
      <el-tag>{{ decisionStatuses[record.content.status] }}</el-tag> · 版本 {{ record.version }} ·
      {{ record.updatedAt.replace('T', ' ').slice(0, 16) }}
    </p>
    <p v-if="record.stageTitle">
      {{ record.stageId ? '阶段' : '原阶段（已删除）' }}：{{ record.stageTitle }}
    </p>
    <p v-if="record.subTaskTitle">
      {{ record.subTaskId ? '任务' : '原任务（已删除）' }}：{{ record.subTaskTitle }}
    </p>
    <dl>
      <dt>问题背景</dt>
      <dd>{{ record.content.context }}</dd>
      <dt>候选方案</dt>
      <dd v-if="!record.content.options.length">尚未记录</dd>
      <dd v-for="(option, index) in record.content.options" :key="index">
        <strong>{{ option.name }}</strong>
        <p v-if="option.pros">优点：{{ option.pros }}</p>
        <p v-if="option.cons">代价：{{ option.cons }}</p>
      </dd>
      <dt>最终选择</dt>
      <dd>{{ record.content.chosenOption || '尚未确定' }}</dd>
      <dt>选择理由 / 主要取舍</dt>
      <dd>{{ record.content.rationale || '尚未记录' }}</dd>
      <dt v-if="record.content.assumptions.length">关键假设或风险</dt>
      <dd v-for="(line, index) in record.content.assumptions" :key="index">{{ line }}</dd>
      <dt>信心程度 / 复查日期</dt>
      <dd>
        {{
          record.content.confidence
            ? { LOW: '低', MEDIUM: '中', HIGH: '高' }[record.content.confidence]
            : '未填写'
        }}
        / {{ record.content.reviewDate || '未填写' }}
      </dd>
      <template v-if="record.content.aiAssistance">
        <dt>AI 参与说明（用户记录）</dt>
        <dd>
          <p>
            {{
              record.content.aiAssistance.phases.map(phase => aiPhases[phase]).join('、') ||
              '未填写参与环节'
            }}
          </p>
          <p v-if="record.content.aiAssistance.contribution">
            AI 贡献：{{ record.content.aiAssistance.contribution }}
          </p>
          <p v-if="record.content.aiAssistance.humanJudgment">
            人工判断：{{ record.content.aiAssistance.humanJudgment }}
          </p>
          <p v-if="record.content.aiAssistance.handling">
            建议处理：{{ aiHandling[record.content.aiAssistance.handling] }}
          </p>
          <p v-if="record.content.aiAssistance.verification">
            验证方式说明：{{ record.content.aiAssistance.verification }}
          </p>
        </dd>
      </template>
    </dl>
    <el-button
      v-if="record.supersedesDecisionId"
      link
      type="primary"
      @click="emit('open-record', record.supersedesDecisionId)"
      >被替代决策 #{{ record.supersedesDecisionId }}</el-button
    >
    <el-button
      v-if="record.supersededByDecisionId"
      link
      type="primary"
      @click="emit('open-record', record.supersededByDecisionId)"
      >替代决策 #{{ record.supersededByDecisionId }}</el-button
    >
    <p class="metadata">创建人 #{{ record.createdBy }} · 最近修改人 #{{ record.updatedBy }}</p>
  </article>
</template>
<script setup lang="ts">
import { decisionStatuses, aiPhases, aiHandling, type DecisionRecord } from '../../types/decision'
defineProps<{ record: DecisionRecord }>()
const emit = defineEmits<{ (event: 'open-record', id: number): void }>()
</script>
<style scoped>
.decision-summary {
  font-size: 13px;
  line-height: 1.6;
  overflow-wrap: anywhere;
}
.decision-summary h3 {
  font-size: 17px;
}
dt {
  font-weight: 600;
  margin-top: 18px;
}
dd {
  margin: 6px 0 0;
  white-space: pre-wrap;
}
.metadata {
  color: #909399;
  font-size: 12px;
}
</style>
