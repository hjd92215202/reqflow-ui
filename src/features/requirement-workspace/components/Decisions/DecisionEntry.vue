<template>
  <el-button v-if="available" link type="primary" @click="open(context)">决策记录</el-button>
</template>
<script setup lang="ts">
import type { DecisionContext } from '../../types/decision'
import { useDecisionActions } from '../../composables/useDecisionActions'
withDefaults(defineProps<{ context?: DecisionContext }>(), { context: () => ({}) })
const { available, open } = useDecisionActions()
</script>
