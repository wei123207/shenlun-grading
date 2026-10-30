<template>
  <div class="page-wrapper">
    <div class="page-header">
      <h1 class="page-title">错题本</h1>
      <p class="page-subtitle">得分率低于60%的题目自动收录，重点攻克薄弱环节</p>
    </div>

    <div v-if="loading" class="loading-box">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span>加载中...</span>
    </div>

    <template v-else>
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-num">{{ wrongList.length }}</div>
          <div class="stat-label">错题总数</div>
        </div>
        <div class="stat-card" v-for="(count, type) in wrongStats.byType" :key="type">
          <div class="stat-num">{{ count }}</div>
          <div class="stat-label">{{ type }}</div>
        </div>
      </div>

      <div v-if="wrongList.length === 0" class="empty-box">
        <div class="empty-icon">🎉</div>
        <p>暂无错题，继续练习吧！</p>
      </div>

      <div v-else class="wrong-list">
        <div v-for="item in wrongList" :key="item.id" class="wrong-card">
          <div class="wrong-left">
            <div class="wrong-score" :class="scoreClass(item)">
              {{ item.full_score > 0 ? Math.round(item.score / item.full_score * 100) : 0 }}%
            </div>
          </div>
          <div class="wrong-body" @click="redo(item)">
            <div class="wrong-meta">
              <el-tag size="small" type="info">{{ item.question_type || '未知' }}</el-tag>
              <span class="wrong-province">{{ item.province }} · {{ item.year }}</span>
              <span class="wrong-date">{{ formatDate(item.created_at) }}</span>
            </div>
            <div class="wrong-score-text">{{ item.score || 0 }} / {{ item.full_score || 0 }}分</div>
          </div>
          <div class="wrong-actions">
            <el-button size="small" type="primary" @click="redo(item)">重做</el-button>
            <el-button size="small" @click="removeWrong(item.id)">移除</el-button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useQuestionStore } from '@/stores/question'
import { getWrongQuestions, getWrongStats, removeWrong as removeWrongApi } from '@/api/wrongbook'
import { getQuestionById } from '@/api/supabase'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()
const authStore = useAuthStore()
const questionStore = useQuestionStore()

const loading = ref(true)
const wrongList = ref([])
const wrongStats = ref({ total: 0, byType: {} })

onMounted(async () => {
  await loadData()
})

async function loadData() {
  loading.value = true
  try {
    const userId = authStore.user?.id || authStore.user?.email
    wrongList.value = await getWrongQuestions(userId)
    wrongStats.value = await getWrongStats(userId)
  } catch (e) {
    ElMessage.error('加载错题本失败')
  } finally {
    loading.value = false
  }
}

function scoreClass(item) {
  const rate = item.full_score > 0 ? item.score / item.full_score : 0
  if (rate < 0.3) return 'score-bad'
  if (rate < 0.5) return 'score-low'
  return 'score-mid'
}

async function redo(item) {
  try {
    ElMessage.info('正在加载题目...')
    const fullQuestion = await getQuestionById(item.question_id)
    if (fullQuestion) {
      questionStore.setQuestion(fullQuestion)
    } else {
      questionStore.setQuestion({
        id: item.question_id,
        province: item.province,
        year: item.year,
        question_number: item.question_number,
        question_type: item.question_type,
        question_content: '',
        reference_answer: '',
        full_score: item.full_score
      })
    }
    questionStore.setFromRecord(false)
    router.push('/answer')
  } catch (e) {
    ElMessage.error('加载题目失败：' + e.message)
  }
}

async function removeWrong(id) {
  try {
    await ElMessageBox.confirm('确定要从错题本中移除这道题吗？', '提示', { type: 'warning' })
    await removeWrongApi(id)
    await loadData()
    ElMessage.success('已移除')
  } catch (e) {
    // 取消
  }
}

function formatDate(d) {
  if (!d) return ''
  return d.split('T')[0]
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

.stats-row {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.stat-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px 24px;
  text-align: center;
  flex: 1;
  min-width: 100px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}

.stat-num {
  font-size: 24px;
  font-weight: 700;
  color: #f56c6c;
}

.stat-label {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
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

.wrong-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.wrong-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  transition: box-shadow 0.2s;
}

.wrong-card:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.wrong-left {
  flex-shrink: 0;
}

.wrong-score {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
}

.score-bad {
  background: #fef0f0;
  color: #f56c6c;
}

.score-low {
  background: #fdf6ec;
  color: #e6a23c;
}

.score-mid {
  background: #f0f9eb;
  color: #67c23a;
}

.wrong-body {
  flex: 1;
  cursor: pointer;
}

.wrong-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.wrong-province {
  font-size: 13px;
  color: #606266;
}

.wrong-date {
  font-size: 12px;
  color: #c0c4cc;
}

.wrong-score-text {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin-top: 6px;
}

.wrong-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .page-wrapper { padding: 12px; }
  .page-title { font-size: 20px; }
  .stat-card { padding: 12px 16px; min-width: 80px; }
  .stat-num { font-size: 20px; }
  .wrong-card { padding: 12px; gap: 10px; }
  .wrong-score { width: 44px; height: 44px; font-size: 12px; }
  .wrong-actions { flex-direction: row; }
}
</style>
