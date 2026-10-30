<template>
  <div class="page-wrapper">
    <div class="back-bar">
      <el-button text @click="goBack">
        <el-icon><arrow-left /></el-icon>
        返回选题
      </el-button>
    </div>

    <div v-if="question" class="answer-layout">
      <div class="left-panel">
        <div class="panel-card">
          <div class="panel-header">
            <span class="panel-icon">📄</span>
            <span class="panel-title">真题材料与作答要求</span>
            <el-button
              text
              size="small"
              class="fav-btn"
              @click="toggleFav"
            >
              <el-icon><component :is="isFav ? 'StarFilled' : 'Star'" /></el-icon>
              {{ isFav ? '已收藏' : '收藏' }}
            </el-button>
          </div>
          <div class="question-meta-bar">
            <el-tag size="small" type="primary">{{ question.question_type }}</el-tag>
            <el-tag size="small" type="warning">{{ question.full_score }}分</el-tag>
            <span class="meta-text">{{ question.province }} · {{ question.year }}年 · {{ question.paper_type }}</span>
          </div>
          <div class="question-content-area">
            <div class="q-title">{{ question.question_title }}</div>
            <div class="q-content">{{ question.question_content }}</div>
          </div>
        </div>
      </div>

      <div class="right-panel">
        <div class="panel-card">
          <div class="panel-header">
            <span class="panel-icon">✍️</span>
            <span class="panel-title">你的作答文本</span>
          </div>

          <el-tabs v-model="activeTab" class="answer-tabs">
            <el-tab-pane label="拍照上传" name="upload">
              <ImageUpload @ocr-result="handleOcrResult" />
            </el-tab-pane>
            <el-tab-pane label="文字输入" name="input">
              <el-input
                v-model="answerText"
                type="textarea"
                :rows="14"
                placeholder="在此粘贴输入你的申论答案"
                maxlength="3000"
                show-word-limit
              />
            </el-tab-pane>
          </el-tabs>

          <div v-if="activeTab === 'upload'" class="edit-tip">
            <el-alert title="文字识别可能有误，请仔细检查修改后再提交" type="info" :closable="false" show-icon />
          </div>

          <div class="submit-area">
            <el-button type="primary" size="large" :loading="submitting" @click="submitAnswer">
              AI智能评分
            </el-button>
            <el-button size="large" @click="clearAnswer">
              清空内容
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <el-empty v-else description="请先选择题目" />

    <footer class="page-footer">
      <p>本系统仅AI辅助练习，分数仅供参考，不作为官方考试依据</p>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Star, StarFilled } from '@element-plus/icons-vue'
import { useQuestionStore } from '@/stores/question'
import { useAuthStore } from '@/stores/auth'
import { gradeAnswer } from '@/api/ai'
import { addFavorite, getFavorites, removeFavorite } from '@/api/favorites'
import { getRemainingGrades, incrementGradingUsage, getMembershipStatus } from '@/api/membership'
import ImageUpload from '@/components/ImageUpload.vue'

const router = useRouter()
const questionStore = useQuestionStore()
const authStore = useAuthStore()

const question = computed(() => questionStore.currentQuestion)
const answerText = ref('')
const activeTab = ref('upload')
const submitting = ref(false)
const isFav = ref(false)

onMounted(async () => {
  if (!question.value) {
    ElMessage.warning('请先选择题目')
    router.push('/')
    return
  }
  if (questionStore.studentAnswer) {
    answerText.value = questionStore.studentAnswer
    activeTab.value = 'input'
  }
  await checkFavStatus()
})

async function checkFavStatus() {
  if (!authStore.isLoggedIn || !question.value) return
  const userId = authStore.user?.id || authStore.user?.email
  const favs = await getFavorites(userId)
  isFav.value = favs.some(f => f.question_id === question.value.id)
}

async function toggleFav() {
  if (!authStore.isLoggedIn) {
    ElMessage.warning('请先登录后再收藏')
    return
  }
  const userId = authStore.user?.id || authStore.user?.email
  if (isFav.value) {
    const favs = await getFavorites(userId)
    const fav = favs.find(f => f.question_id === question.value.id)
    if (fav) await removeFavorite(fav.id)
    isFav.value = false
    ElMessage.success('已取消收藏')
  } else {
    await addFavorite(userId, {
      question_id: question.value.id,
      province: question.value.province,
      year: question.value.year,
      question_number: question.value.question_number,
      question_type: question.value.question_type,
      question_content: question.value.question_title || question.value.question_content,
      full_score: question.value.full_score
    })
    isFav.value = true
    ElMessage.success('已收藏')
  }
}

function goBack() {
  router.push('/')
}

function handleOcrResult(text) {
  answerText.value = text
  activeTab.value = 'input'
  ElMessage.success('文字识别完成，请检查修改')
}

function clearAnswer() {
  answerText.value = ''
}

async function submitAnswer() {
  if (!answerText.value.trim()) {
    ElMessage.warning('请输入你的作答内容')
    return
  }
  if (answerText.value.trim().length < 10) {
    ElMessage.warning('答案太短，请输入完整答案')
    return
  }

  const gradeInfo = getRemainingGrades()
  if (!gradeInfo.unlimited && gradeInfo.remaining <= 0) {
    ElMessageBox.confirm(
      '今日免费批改次数已用完（每日3次），升级VIP会员可无限批改。',
      '批改次数不足',
      { confirmButtonText: '去开通VIP', cancelButtonText: '取消', type: 'warning' }
    ).then(() => {
      router.push('/membership')
    }).catch(() => {})
    return
  }

  submitting.value = true
  try {
    questionStore.setStudentAnswer(answerText.value)
    const membership = getMembershipStatus()
    const isVip = membership.level === 'vip'
    const result = await gradeAnswer(question.value, answerText.value, isVip)
    incrementGradingUsage()
    questionStore.setGradingResult(result)
    ElMessage.success('评分完成')
    router.push('/result')
  } catch (e) {
    ElMessage.error('评分失败：' + e.message)
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.page-wrapper {
  max-width: 1200px;
  margin: 0 auto;
  padding: 16px 20px 40px;
}

.back-bar {
  margin-bottom: 12px;
}

.answer-layout {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

.left-panel {
  flex: 1;
  min-width: 0;
}

.right-panel {
  flex: 1;
  min-width: 0;
}

.panel-card {
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.fav-btn {
  margin-left: auto !important;
  color: #c0c4cc;
}

.fav-btn:hover {
  color: #e6a23c;
}

.panel-icon {
  font-size: 18px;
}

.panel-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.question-meta-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.meta-text {
  font-size: 13px;
  color: #909399;
}

.question-content-area {
  max-height: 500px;
  overflow-y: auto;
  padding-right: 8px;
}

.q-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 12px;
  line-height: 1.6;
}

.q-content {
  font-size: 14px;
  color: #606266;
  line-height: 1.8;
  white-space: pre-wrap;
}

.answer-tabs {
  margin-bottom: 12px;
}

.edit-tip {
  margin: 12px 0;
}

.submit-area {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}

.submit-area .el-button {
  flex: 1;
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
    padding: 12px 12px 32px;
  }

  .answer-layout {
    flex-direction: column;
    gap: 16px;
  }

  .panel-card {
    padding: 16px;
    border-radius: 12px;
  }

  .question-content-area {
    max-height: 350px;
  }

  .q-content {
    font-size: 13px;
    line-height: 1.7;
  }

  .submit-area {
    flex-direction: column;
  }

  :deep(.el-textarea__inner) {
    min-height: 180px !important;
    font-size: 15px !important;
  }
}
</style>
