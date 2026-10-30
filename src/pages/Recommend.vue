<template>
  <div class="page-wrapper">
    <div class="page-header">
      <h1 class="page-title">智能推荐</h1>
      <p class="page-subtitle">根据你的练习记录，推荐最适合的题目</p>
    </div>

    <div v-if="loading" class="loading-box">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span>正在分析你的练习数据...</span>
    </div>

    <div v-else-if="recList.length === 0" class="empty-box">
      <div class="empty-icon">📋</div>
      <p>暂无推荐题目</p>
      <p class="empty-tip">练习几道题后，系统将为你智能推荐</p>
      <el-button type="primary" @click="goHome" style="margin-top: 16px">去选题</el-button>
    </div>

    <div v-else class="rec-list">
      <div v-for="(q, idx) in recList" :key="q.id" class="rec-card" @click="practice(q)">
        <div class="rec-rank">{{ idx + 1 }}</div>
        <div class="rec-body">
          <div class="rec-top-row">
            <el-tag size="small" type="warning" effect="plain" round>{{ q.recommendReason }}</el-tag>
            <span class="rec-score" v-if="q.full_score">{{ q.full_score }}分</span>
          </div>
          <div class="rec-meta">
            <el-tag size="small" type="info" effect="plain">{{ q.question_type || '未知题型' }}</el-tag>
            <span class="rec-province">{{ q.province }} · {{ q.year }}年</span>
          </div>
          <div class="rec-title">{{ getDisplayTitle(q) }}</div>
        </div>
        <el-icon class="rec-arrow"><arrow-right /></el-icon>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowRight } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { useQuestionStore } from '@/stores/question'
import { getRecommendedQuestions } from '@/api/recommend'

const router = useRouter()
const authStore = useAuthStore()
const questionStore = useQuestionStore()

const loading = ref(true)
const recList = ref([])

onMounted(async () => {
  try {
    const userId = authStore.user?.id || authStore.user?.email
    recList.value = await getRecommendedQuestions(userId)
  } catch (e) {
    console.error('推荐加载失败:', e)
  } finally {
    loading.value = false
  }
})

function practice(q) {
  questionStore.setQuestion(q)
  questionStore.setFromRecord(false)
  router.push('/answer')
}

function goHome() {
  router.push('/')
}

function getDisplayTitle(q) {
  const text = q.question_title || q.question_content || ''
  if (!text) return '题目内容加载中...'
  const cleaned = text.replace(/\s+/g, ' ').trim()
  if (cleaned.length <= 80) return cleaned
  return cleaned.slice(0, 80) + '...'
}
</script>

<style scoped>
.page-wrapper {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.page-header {
  text-align: center;
  margin-bottom: 24px;
}

.page-title {
  font-size: 24px;
  font-weight: 700;
  color: #1a1a2e;
}

.page-subtitle {
  font-size: 13px;
  color: #909399;
  margin-top: 6px;
}

.loading-box {
  text-align: center;
  padding: 60px 20px;
  color: #909399;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.empty-box {
  text-align: center;
  padding: 60px 20px;
  color: #909399;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.empty-tip {
  font-size: 13px;
  margin-top: 4px;
  color: #c0c4cc;
}

.rec-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.rec-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  cursor: pointer;
  transition: box-shadow 0.2s, transform 0.2s;
}

.rec-card:hover {
  box-shadow: 0 4px 16px rgba(0,0,0,0.1);
  transform: translateY(-2px);
}

.rec-rank {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #f0f2f5;
  color: #909399;
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-top: 2px;
}

.rec-card:nth-child(1) .rec-rank {
  background: linear-gradient(135deg, #ff9a44, #fc6076);
  color: #fff;
}

.rec-card:nth-child(2) .rec-rank {
  background: linear-gradient(135deg, #409eff, #36cfc9);
  color: #fff;
}

.rec-card:nth-child(3) .rec-rank {
  background: linear-gradient(135deg, #67c23a, #95d475);
  color: #fff;
}

.rec-body {
  flex: 1;
  min-width: 0;
}

.rec-top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.rec-score {
  font-size: 13px;
  color: #e6a23c;
  font-weight: 600;
  flex-shrink: 0;
}

.rec-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.rec-province {
  font-size: 13px;
  color: #606266;
}

.rec-title {
  font-size: 14px;
  color: #303133;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rec-arrow {
  color: #c0c4cc;
  font-size: 18px;
  flex-shrink: 0;
  margin-top: 2px;
}

@media (max-width: 768px) {
  .page-wrapper { padding: 12px; }
  .page-title { font-size: 20px; }
  .rec-card { padding: 12px; }
  .rec-rank { width: 20px; height: 20px; font-size: 12px; }
  .rec-title { font-size: 13px; -webkit-line-clamp: 2; }
}
</style>
