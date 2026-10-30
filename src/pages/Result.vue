<template>
  <div class="page-wrapper">
    <div class="back-bar">
      <el-button text @click="goBack">
        <el-icon><arrow-left /></el-icon>
        {{ questionStore.fromRecord ? '返回答题记录' : '返回作答' }}
      </el-button>
    </div>

    <div v-if="result && question" class="result-section">
      <div class="result-card">
        <div class="result-header">
          <span class="result-icon">✅</span>
          <span class="result-title">AI评分结果</span>
        </div>

        <div class="score-main">
          <div class="score-circle" :style="circleStyle">
            <div class="score-inner">
              <span class="score-number">{{ result.score }}</span>
              <span class="score-total">/ {{ result.fullScore || question.full_score }}</span>
            </div>
          </div>
          <div class="score-summary">
            <div class="score-level" :style="{ color: levelColor }">{{ scoreLevel }}</div>
            <div class="score-desc">{{ scoreDesc }}</div>
          </div>
        </div>

        <div class="dimensions-section">
          <div class="dim-item" v-for="dim in dimensions" :key="dim.name">
            <div class="dim-header">
              <span class="dim-name">{{ dim.name }}</span>
              <span class="dim-score">{{ dim.score }}分</span>
            </div>
            <div class="dim-bar-wrap">
              <div class="dim-bar" :style="{ width: dim.percent + '%', background: dim.color }"></div>
            </div>
            <div class="dim-comment">{{ dim.comment || '暂无评语' }}</div>
          </div>
        </div>

        <div class="comment-block">
          <div class="comment-item highlight">
            <div class="comment-label">
              <span class="comment-tag tag-highlight">答题亮点</span>
            </div>
            <div class="comment-text">{{ result.advantages?.trim() || '暂无' }}</div>
          </div>
          <div class="comment-item shortcoming">
            <div class="comment-label">
              <span class="comment-tag tag-shortcoming">存在不足</span>
            </div>
            <div class="comment-text">{{ result.disadvantages?.trim() || '暂无' }}</div>
          </div>
          <div class="comment-item suggest">
            <div class="comment-label">
              <span class="comment-tag tag-suggest">修改优化建议</span>
            </div>
            <div class="comment-text">{{ result.suggestions?.trim() || '暂无' }}</div>
          </div>
        </div>

        <el-divider content-position="left">答案对比</el-divider>

        <el-row :gutter="20">
          <el-col :xs="24" :sm="12">
            <div class="answer-block">
              <h4>我的答案</h4>
              <div class="answer-text">{{ questionStore.studentAnswer }}</div>
            </div>
          </el-col>
          <el-col :xs="24" :sm="12">
            <div class="answer-block">
              <h4>参考答案</h4>
              <div class="answer-text reference">{{ question.reference_answer }}</div>
            </div>
          </el-col>
        </el-row>

        <div class="action-area">
          <template v-if="questionStore.fromRecord">
            <el-button type="primary" size="large" @click="goRecords">返回答题记录</el-button>
          </template>
          <template v-else>
            <el-button type="primary" size="large" @click="reAnswer">重新作答</el-button>
            <el-button size="large" @click="goHome">返回重新选题</el-button>
            <el-button size="large" @click="shareToCommunity">分享到社区</el-button>
          </template>
        </div>

        <!-- VIP: 采分点分析 -->
        <template v-if="isVip && scoreAnalysis">
          <el-divider content-position="left">采分点分析（VIP）</el-divider>
          <div class="vip-section analysis-section" v-html="scoreAnalysis"></div>
        </template>

        <!-- VIP: AI同题范文 -->
        <template v-if="isVip">
          <el-divider content-position="left">AI高分范文（VIP）</el-divider>
          <div class="vip-section">
            <div v-if="essayLoading" class="loading-text">正在生成高分范文...</div>
            <div v-else-if="essayText" class="essay-text">{{ essayText }}</div>
            <el-button v-else type="primary" plain size="small" @click="loadEssay" :loading="essayLoading">生成同题高分范文</el-button>
          </div>
        </template>

        <!-- VIP: AI深度追问 -->
        <template v-if="isVip">
          <el-divider content-position="left">AI深度追问（VIP）</el-divider>
          <div class="vip-section ask-section">
            <div class="chat-list" v-if="chatList.length > 0">
              <div v-for="(msg, i) in chatList" :key="i" class="chat-msg" :class="msg.role === 'user' ? 'user' : 'ai'">
                <div class="chat-bubble">{{ msg.content }}</div>
              </div>
            </div>
            <div class="ask-input">
              <el-input v-model="askInput" placeholder="就本次批改结果提问，如：为什么逻辑条理只得了12分？" @keyup.enter="sendAsk" />
              <el-button type="primary" @click="sendAsk" :loading="askLoading">提问</el-button>
            </div>
          </div>
        </template>

        <!-- 非VIP: 升级提示 -->
        <template v-if="!isVip">
          <el-divider content-position="left">VIP专属功能</el-divider>
          <div class="vip-upgrade-hint">
            <div class="hint-item">📝 多维度拆解评分 — 已解锁</div>
            <div class="hint-item locked">📄 AI同题范文生成 — 升级VIP解锁</div>
            <div class="hint-item locked">💬 AI深度追问对话 — 升级VIP解锁</div>
            <div class="hint-item locked">🎯 采分点命中分析 — 升级终身会员解锁</div>
            <el-button type="warning" size="small" @click="$router.push('/membership')">开通VIP</el-button>
          </div>
        </template>
      </div>
    </div>

    <el-empty v-else description="暂无评分结果" />

    <footer class="page-footer">
      <p>本系统仅AI辅助练习，分数仅供参考，不作为官方考试依据</p>
    </footer>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import { useQuestionStore } from '@/stores/question'
import { useAuthStore } from '@/stores/auth'
import { saveGradingRecord } from '@/api/records'
import { addNotification } from '@/api/notifications'
import { shareResult } from '@/api/community'
import { ElMessageBox } from 'element-plus'
import { getMembershipStatus } from '@/api/membership'
import { generateEssay, askFollowUp } from '@/api/ai'

const router = useRouter()
const questionStore = useQuestionStore()
const authStore = useAuthStore()
const recordSaved = ref(false)

const membership = ref(getMembershipStatus())
const isVip = computed(() => membership.value.level === 'vip')

const essayText = ref('')
const essayLoading = ref(false)
const askInput = ref('')
const askLoading = ref(false)
const chatList = ref([])

const scoreAnalysis = computed(() => {
  if (!isVip.value || !result.value?.rawText) return ''
  const raw = result.value.rawText
  const idx = raw.indexOf('采分点分析')
  if (idx === -1) return ''
  let end = raw.indexOf('逐段点评', idx)
  if (end === -1) end = raw.indexOf('高分范文', idx)
  if (end === -1) end = raw.length
  const section = raw.substring(idx, end).trim()
  return section.replace(/\n/g, '<br>')
})

async function loadEssay() {
  if (!question.value) return
  essayLoading.value = true
  try {
    const text = await generateEssay(question.value)
    essayText.value = text
  } catch (e) {
    ElMessage.error('范文生成失败：' + e.message)
  } finally {
    essayLoading.value = false
  }
}

async function sendAsk() {
  const q = askInput.value.trim()
  if (!q || !question.value) return
  askLoading.value = true
  chatList.value.push({ role: 'user', content: q })
  askInput.value = ''
  try {
    const answer = await askFollowUp(
      question.value,
      questionStore.studentAnswer,
      result.value?.rawText || '',
      q,
      chatList.value.slice(0, -1)
    )
    chatList.value.push({ role: 'assistant', content: answer })
    await nextTick()
    const list = document.querySelector('.chat-list')
    if (list) list.scrollTop = list.scrollHeight
  } catch (e) {
    ElMessage.error('追问失败：' + e.message)
  } finally {
    askLoading.value = false
  }
}

const question = computed(() => questionStore.currentQuestion)
const result = computed(() => questionStore.gradingResult)

onMounted(async () => {
  if (questionStore.fromRecord) return
  if (result.value && question.value && authStore.isLoggedIn && !recordSaved.value) {
    try {
      await saveGradingRecord({
        userId: authStore.user.id,
        questionId: question.value.id,
        province: question.value.province,
        year: question.value.year,
        questionNumber: question.value.question_number,
        questionType: question.value.question_type,
        fullScore: result.value.fullScore || question.value.full_score,
        studentAnswer: questionStore.studentAnswer,
        score: result.value.score,
        gradingResult: JSON.stringify(result.value.dimensions || []),
        advantages: result.value.advantages || '',
        disadvantages: result.value.disadvantages || '',
        suggestions: result.value.suggestions || '',
        rawText: result.value.rawText || ''
      })
      recordSaved.value = true
      const rate = result.value.fullScore > 0 ? Math.round((result.value.score / result.value.fullScore) * 100) : 0
      const userId = authStore.user.id || authStore.user.email
      await addNotification(userId, {
        title: '批改完成',
        content: `${question.value.province || ''} ${question.value.year || ''} 第${question.value.question_number || ''}题，得分${result.value.score}/${result.value.fullScore}分（${rate}%）`,
        type: 'grading'
      })
    } catch (e) {
      console.error('保存记录失败:', e.message)
    }
  }
})

const fullScore = computed(() => result.value?.fullScore || question.value?.full_score || 100)
const percentage = computed(() => {
  const s = result.value?.score || 0
  return Math.round((s / fullScore.value) * 100)
})

const circleStyle = computed(() => {
  const color = percentage.value >= 80 ? '#67c23a' : percentage.value >= 60 ? '#e6a23c' : '#f56c6c'
  return { background: `conic-gradient(${color} ${percentage.value * 3.6}deg, #ebeef5 0deg)` }
})

const levelColor = computed(() => {
  if (percentage.value >= 80) return '#67c23a'
  if (percentage.value >= 60) return '#e6a23c'
  return '#f56c6c'
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

const dimensions = computed(() => {
  const r = result.value || {}
  const dims = r.dimensions
  const defaults = [
    { name: '要点完整度', maxScore: Math.round(fullScore.value * 0.4) },
    { name: '逻辑条理', maxScore: Math.round(fullScore.value * 0.2) },
    { name: '语言表达', maxScore: Math.round(fullScore.value * 0.2) },
    { name: '格式规范', maxScore: Math.round(fullScore.value * 0.2) }
  ]
  return defaults.map((d, i) => {
    const dim = dims?.[i]
    const score = dim?.score ?? 0
    const max = d.maxScore
    const pct = max > 0 ? Math.round((score / max) * 100) : 0
    return {
      name: d.name,
      score: score,
      maxScore: max,
      percent: pct,
      color: pct >= 80 ? '#67c23a' : pct >= 60 ? '#e6a23c' : '#f56c6c',
      comment: dim?.comment || '暂无评语'
    }
  })
})

function goBack() {
  if (questionStore.fromRecord) {
    questionStore.clear()
    router.push('/records')
  } else {
    router.push('/answer')
  }
}

function reAnswer() {
  router.push('/answer')
}

async function shareToCommunity() {
  try {
    await ElMessageBox.confirm('确定将本次作答结果分享到社区？其他用户可以查看你的作答和评分。', '分享确认', { type: 'info' })
    await shareResult(
      authStore.user?.id || authStore.user?.email,
      authStore.user?.nickname,
      {
        province: question.value?.province,
        year: question.value?.year,
        questionType: question.value?.question_type,
        questionNumber: question.value?.question_number,
        score: result.value?.score,
        fullScore: result.value?.fullScore,
        studentAnswer: questionStore.studentAnswer,
        advantages: result.value?.advantages,
        suggestions: result.value?.suggestions
      }
    )
    ElMessage.success('分享成功！可在社区查看')
  } catch (e) {
    // cancelled or error
  }
}

function goHome() {
  questionStore.clear()
  router.push('/')
}

function goRecords() {
  questionStore.clear()
  router.push('/records')
}
</script>

<style scoped>
.page-wrapper {
  max-width: 900px;
  margin: 0 auto;
  padding: 16px 20px 40px;
}

.back-bar {
  margin-bottom: 12px;
}

.result-card {
  background: #fff;
  border-radius: 16px;
  padding: 28px 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.result-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 24px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.result-icon {
  font-size: 18px;
}

.result-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.score-main {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-bottom: 28px;
  padding: 20px;
  background: linear-gradient(135deg, #f9fafb 0%, #f0f4ff 100%);
  border-radius: 12px;
}

.score-circle {
  width: 110px;
  height: 110px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.score-inner {
  width: 92px;
  height: 92px;
  border-radius: 50%;
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
}

.score-number {
  font-size: 32px;
  font-weight: bold;
  color: #303133;
}

.score-total {
  font-size: 14px;
  color: #909399;
  margin-left: 2px;
}

.score-summary {
  flex: 1;
}

.score-level {
  font-size: 22px;
  font-weight: 700;
  margin-bottom: 6px;
}

.score-desc {
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
}

.dimensions-section {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 28px;
}

.dim-item {
  background: #f9fafb;
  border-radius: 10px;
  padding: 16px;
}

.dim-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.dim-name {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.dim-score {
  font-size: 14px;
  font-weight: 700;
  color: #409eff;
}

.dim-bar-wrap {
  height: 6px;
  background: #e8eaed;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 10px;
}

.dim-bar {
  height: 100%;
  border-radius: 3px;
  transition: width 0.5s ease;
}

.dim-comment {
  font-size: 13px;
  color: #909399;
  line-height: 1.5;
}

.comment-block {
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 24px;
}

.comment-item {
  border-radius: 10px;
  padding: 16px;
}

.comment-item.highlight {
  background: #f0f9eb;
}

.comment-item.shortcoming {
  background: #fef0f0;
}

.comment-item.suggest {
  background: #fdf6ec;
}

.comment-tag {
  font-size: 13px;
  font-weight: 600;
  padding: 2px 10px;
  border-radius: 4px;
  display: inline-block;
}

.tag-highlight {
  background: #e1f3d8;
  color: #67c23a;
}

.tag-shortcoming {
  background: #fde2e2;
  color: #f56c6c;
}

.tag-suggest {
  background: #faecd8;
  color: #e6a23c;
}

.comment-text {
  margin-top: 10px;
  font-size: 14px;
  color: #606266;
  line-height: 1.8;
  white-space: pre-wrap;
}

.answer-block {
  background: #f9fafb;
  padding: 16px;
  border-radius: 10px;
}

.answer-block h4 {
  margin: 0 0 10px;
  font-size: 14px;
  color: #303133;
}

.answer-text {
  color: #606266;
  line-height: 1.8;
  white-space: pre-wrap;
  max-height: 400px;
  overflow-y: auto;
  font-size: 14px;
}

.answer-text.reference {
  color: #409eff;
}

.action-area {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 28px;
}

.page-footer {
  text-align: center;
  margin-top: 40px;
}

.page-footer p {
  font-size: 12px;
  color: #c0c4cc;
}

.vip-section {
  background: #f9fafb;
  border-radius: 10px;
  padding: 16px;
  margin-bottom: 20px;
}

.loading-text {
  color: #909399;
  font-size: 14px;
  text-align: center;
  padding: 20px 0;
}

.essay-text {
  font-size: 14px;
  color: #303133;
  line-height: 1.8;
  white-space: pre-wrap;
}

.analysis-section {
  font-size: 14px;
  color: #303133;
  line-height: 1.8;
}

.ask-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chat-list {
  max-height: 300px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.chat-msg {
  display: flex;
}

.chat-msg.user {
  justify-content: flex-end;
}

.chat-msg.user .chat-bubble {
  background: #409eff;
  color: #fff;
}

.chat-msg.ai .chat-bubble {
  background: #f0f0f0;
  color: #303133;
}

.chat-bubble {
  max-width: 80%;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
}

.ask-input {
  display: flex;
  gap: 8px;
}

.ask-input .el-input {
  flex: 1;
}

.vip-upgrade-hint {
  background: linear-gradient(135deg, #fff8e6, #fff3d4);
  border-radius: 10px;
  padding: 20px;
  text-align: center;
}

.hint-item {
  font-size: 14px;
  color: #303133;
  margin-bottom: 8px;
}

.hint-item.locked {
  color: #c0c4cc;
}

@media (max-width: 768px) {
  .page-wrapper {
    padding: 12px 12px 32px;
  }

  .result-card {
    padding: 20px 16px;
    border-radius: 12px;
  }

  .score-main {
    flex-direction: column;
    text-align: center;
    gap: 16px;
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
    font-size: 26px;
  }

  .score-level {
    font-size: 20px;
  }

  .dimensions-section {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .answer-block {
    margin-bottom: 12px;
  }

  .answer-text {
    max-height: 250px;
    font-size: 13px;
  }

  .action-area {
    flex-direction: column;
    gap: 10px;
  }

  .action-area .el-button {
    width: 100%;
  }
}
</style>
