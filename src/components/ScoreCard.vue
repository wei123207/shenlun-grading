<template>
  <div class="score-card">
    <div class="score-circle" :style="circleStyle">
      <div class="score-inner">
        <span class="score-number">{{ score }}</span>
        <span class="score-total">/ {{ fullScore }}</span>
      </div>
    </div>
    <div class="score-info">
      <h3>AI评分结果</h3>
      <p class="score-level">{{ scoreLevel }}</p>
      <p class="score-desc">{{ scoreDesc }}</p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  score: {
    type: Number,
    required: true
  },
  fullScore: {
    type: Number,
    required: true
  }
})

const percentage = computed(() => {
  return Math.round((props.score / props.fullScore) * 100)
})

const circleStyle = computed(() => {
  const color = percentage.value >= 80 ? '#67c23a' : percentage.value >= 60 ? '#e6a23c' : '#f56c6c'
  return {
    background: `conic-gradient(${color} ${percentage.value * 3.6}deg, #ebeef5 0deg)`
  }
})

const scoreLevel = computed(() => {
  if (percentage.value >= 90) return '优秀'
  if (percentage.value >= 80) return '良好'
  if (percentage.value >= 60) return '及格'
  return '待提高'
})

const scoreDesc = computed(() => {
  if (percentage.value >= 90) return '答案要点全面，逻辑清晰，表达准确'
  if (percentage.value >= 80) return '答案较为完整，部分要点可补充'
  if (percentage.value >= 60) return '答案有一定基础，要点不够全面'
  return '答案需要大幅改进，建议对照参考答案学习'
})
</script>

<style scoped>
.score-card {
  display: flex;
  align-items: center;
  padding: 20px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
  border-radius: 8px;
  margin-bottom: 20px;
}

.score-circle {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.score-inner {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
}

.score-number {
  font-size: 36px;
  font-weight: bold;
  color: #303133;
}

.score-total {
  font-size: 16px;
  color: #909399;
  margin-left: 2px;
}

.score-info {
  margin-left: 30px;
}

.score-info h3 {
  margin: 0 0 10px 0;
  color: #303133;
}

.score-level {
  font-size: 24px;
  font-weight: bold;
  color: #409eff;
  margin: 0 0 8px 0;
}

.score-desc {
  color: #606266;
  margin: 0;
  line-height: 1.6;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .score-card {
    flex-direction: column;
    text-align: center;
    padding: 16px;
  }

  .score-circle {
    width: 90px;
    height: 90px;
  }

  .score-inner {
    width: 76px;
    height: 76px;
  }

  .score-number {
    font-size: 28px;
  }

  .score-total {
    font-size: 13px;
  }

  .score-info {
    margin-left: 0;
    margin-top: 12px;
  }

  .score-level {
    font-size: 20px;
  }

  .score-desc {
    font-size: 13px;
  }
}
</style>
