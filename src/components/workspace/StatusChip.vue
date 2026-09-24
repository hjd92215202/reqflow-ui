<template>
  <span :class="['chip', `chip-${tone}`]"><span class="dot"></span>{{ label }}</span>
</template>
<script setup>
import { computed } from 'vue'
const props = defineProps({
  status: { type: String, default: 'TODO' },
  priority: { type: Boolean, default: false }
})
const data = computed(() => {
  const map = {
    TODO: ['待处理', 'neutral'],
    IN_PROGRESS: ['进行中', 'brand'],
    TESTING: ['测试中', 'warning'],
    DONE: ['已完成', 'success'],
    SUSPENDED: ['已挂起', 'danger'],
    HIGH: ['P1', 'danger'],
    MEDIUM: ['P2', 'warning'],
    LOW: ['P3', 'neutral']
  }
  return map[props.status] || [props.status, 'neutral']
})
const label = computed(() => data.value[0])
const tone = computed(() => data.value[1])
</script>
<style scoped>
.chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 700;
  border-radius: 999px;
  white-space: nowrap;
}
.dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
}
.chip-neutral {
  color: #667085;
  background: #f1f3f5;
}
.chip-brand {
  color: #4f6bff;
  background: #eef1ff;
}
.chip-warning {
  color: #c97912;
  background: #fff5e8;
}
.chip-success {
  color: #159570;
  background: #e9f7f2;
}
.chip-danger {
  color: #d84a4a;
  background: #ffeded;
}
</style>
