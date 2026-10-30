<template>
  <div class="page-wrapper">
    <header class="page-header">
      <h1 class="page-title">我的批改记录</h1>
      <p class="page-subtitle">查看历史批改结果，对比进步轨迹</p>
    </header>

    <div v-if="loading" class="loading-section">
      <el-skeleton :rows="5" animated />
    </div>

    <div v-else-if="records.length > 0" class="records-section">
      <div class="records-list">
        <div v-for="r in records" :key="r.id" class="record-card" @click="viewDetail(r)">
          <div class="record-left">
            <div class="record-score-ring" :style="{ background: getScoreColor(r.score, r.full_score) }">
              <span class="record-score-num">{{ r.score }}</span>
              <span class="record-score-full">/{{ r.full_score }}</span>
            </div>
          </div>
          <div class="record-info">
            <div class="record-info-top">
              <el-tag size="small" type="info">{{ r.question_type || '未知题型' }}</el-tag>
              <span class="record-province">{{ r.province }} {{ r.year }}年 第{{ r.question_number }}题</span>
            </div>
            <div class="record-answer-preview">{{ getAnswerPreview(r.student_answer) }}</div>
            <div class="record-time">{{ formatTime(r.created_at) }}</div>
          </div>
          <el-icon class="record-arrow"><arrow-right /></el-icon>
        </div>
      </div>

      <div v-if="records.length === 0" class="empty-state">
        <el-empty description="暂无批改记录，开始练习吧" />
      </div>
    </div>

    <section v-else class="empty-section">
      <el-empty description="暂无批改记录，去练习吧">
        <el-button type="primary" @click="goHome">开始练习</el-button>
      </el-empty>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowRight } from '@element-plus/icons-vue'
import { getMyRecordsByUser } from '@/api/records'
import { useAuthStore } from '@/stores/auth'
import { useQuestionStore } from '@/stores/question'

const router = useRouter()
const authStore = useAuthStore()
const questionStore = useQuestionStore()

const records = ref([])
const loading = ref(true)

onMounted(async () => {
  if (!authStore.isLoggedIn) {
    ElMessage.warning('请先登录')
    router.push('/login')
    return
  }
  try {
    records.value = await getMyRecordsByUser(authStore.user.id)
  } catch (e) {
    ElMessage.error('加载记录失败：' + e.message)
  } finally {
    loading.value = false
  }
})

function getScoreColor(score, full) {
  const rate = full > 0 ? score / full : 0
  if (rate >= 0.8) return 'conic-gradient(#67c23a 0deg, #67c23a ' + rate * 360 + 'deg, #e4e7ed ' + rate * 360 + 'deg)'
  if (rate >= 0.6) return 'conic-gradient(#e6a23c 0deg, #e6a23c ' + rate * 360 + 'deg, #e4e7ed ' + rate * 360 + 'deg)'
  return 'conic-gradient(#f56c6c 0deg, #f56c6c ' + rate * 360 + 'deg, #e4e7ed ' + rate * 360 + 'deg)'
}

function getAnswerPreview(answer) {
  if (!answer) return '暂无答案内容'
  return answer.length > 80 ? answer.substring(0, 80) + '...' : answer
}

function formatTime(t) {
  if (!t) return ''
  const d = new Date(t)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function viewDetail(r) {
  const mockQuestion = {
    id: r.question_id,
    province: r.province,
    year: r.year,
    question_number: r.question_number,
    question_type: r.question_type,
    question_content: '',
    reference_answer: '',
    full_score: r.full_score
  }
  questionStore.setQuestion(mockQuestion)
  questionStore.setStudentAnswer(r.student_answer)
  questionStore.setGradingResult({
    score: r.score,
    fullScore: r.full_score,
    advantages: r.advantages || '',
    disadvantages: r.disadvantages || '',
    suggestions: r.suggestions || '',
    rawText: r.raw_text || r.grading_result || ''
  })
  questionStore.setFromRecord(true)
  router.push('/result')
}

function goHome() {
  router.push('/')
}
</script>

<style scoped>
.page-wrapper {
  max-width: 900px;
  margin: 0 auto;
  padding: 24px 20px 40px;
}

.page-header {
  text-align: center;
  margin-bottom: 28px;
}

.page-title {
  font-size: 26px;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0;
}

.page-subtitle {
  font-size: 13px;
  color: #909399;
  margin: 6px 0 0;
}

.records-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.record-card {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 12px;
  padding: 16px 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  cursor: pointer;
  transition: all 0.2s;
}

.record-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

.record-left {
  flex-shrink: 0;
  margin-right: 16px;
}

.record-score-ring {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.record-score-num {
  font-size: 18px;
  font-weight: 700;
  color: #303133;
}

.record-score-full {
  font-size: 10px;
  color: #909399;
}

.record-info {
  flex: 1;
  min-width: 0;
}

.record-info-top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.record-province {
  font-size: 13px;
  color: #606266;
}

.record-answer-preview {
  font-size: 13px;
  color: #909399;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 4px;
}

.record-time {
  font-size: 12px;
  color: #c0c4cc;
}

.record-arrow {
  color: #c0c4cc;
  font-size: 16px;
  margin-left: 12px;
  flex-shrink: 0;
}

.empty-section {
  background: #fff;
  border-radius: 16px;
  padding: 48px 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  text-align: center;
}

.page-footer {
  text-align: center;
  margin-top: 40px;
}

.page-footer p {
  font-size: 12px;
  color: #c0c4cc;
}

@media (max-width: 768px) {
  .page-wrapper {
    padding: 16px 12px 32px;
  }

  .page-title {
    font-size: 22px;
  }

  .record-card {
    padding: 12px;
  }

  .record-score-ring {
    width: 44px;
    height: 44px;
  }

  .record-score-num {
    font-size: 14px;
  }
}
</style>
