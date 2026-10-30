<template>
  <div class="page-wrapper">
    <div class="page-header">
      <h1 class="page-title">社区分享</h1>
      <p class="page-subtitle">查看其他考生的优秀作答与批改结果</p>
    </div>

    <div v-if="loading" class="loading-box">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span>加载中...</span>
    </div>

    <div v-else-if="posts.length === 0" class="empty-box">
      <div class="empty-icon">💬</div>
      <p>暂无分享内容</p>
      <p class="empty-tip">在AI评分结果页面可以分享你的作答记录</p>
    </div>

    <div v-else class="post-list">
      <div v-for="post in posts" :key="post.id" class="post-card">
        <div class="post-header">
          <div class="post-avatar">{{ post.user_nickname?.charAt(0) || 'U' }}</div>
          <div class="post-user-info">
            <div class="post-user">{{ post.user_nickname }}</div>
            <div class="post-time">{{ formatTime(post.created_at) }}</div>
          </div>
          <div class="post-score-badge" :class="scoreClass(post)">
            {{ post.full_score > 0 ? Math.round(post.score / post.full_score * 100) : 0 }}%
          </div>
        </div>

        <div class="post-meta">
          <el-tag size="small" type="info">{{ post.question_type }}</el-tag>
          <span class="post-province">{{ post.province }} · {{ post.year }}年 · 第{{ post.question_number }}题</span>
          <span class="post-score-text">{{ post.score }}/{{ post.full_score }}分</span>
        </div>

        <div class="post-answer" v-if="post.student_answer">
          <div class="post-label">作答摘要</div>
          <div class="post-content-text">{{ post.student_answer }}</div>
        </div>

        <div class="post-feedback" v-if="post.advantages">
          <div class="post-label post-label-green">答题亮点</div>
          <div class="post-feedback-text">{{ post.advantages }}</div>
        </div>

        <div class="post-feedback" v-if="post.suggestions">
          <div class="post-label post-label-orange">改进建议</div>
          <div class="post-feedback-text">{{ post.suggestions }}</div>
        </div>

        <div class="post-actions">
          <div class="action-btn" :class="{ liked: post.likedBy?.includes(currentUserId) }" @click="toggleLike(post)">
            <span class="action-icon">{{ post.likedBy?.includes(currentUserId) ? '❤️' : '🤍' }}</span>
            <span>{{ post.likes || 0 }}</span>
          </div>
          <div class="action-btn" @click="toggleComment(post)">
            <span class="action-icon">💬</span>
            <span>{{ post.comments?.length || 0 }}</span>
          </div>
        </div>

        <div v-if="commentOpenId === post.id" class="comment-section">
          <div v-for="cmt in post.comments" :key="cmt.id" class="comment-item">
            <span class="comment-user">{{ cmt.user_nickname }}：</span>
            <span class="comment-text">{{ cmt.content }}</span>
          </div>
          <div class="comment-input-row">
            <el-input v-model="commentText" placeholder="写下你的评论..." size="small" />
            <el-button type="primary" size="small" @click="submitComment(post)">发送</el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { getSharedPosts, likePost, addComment } from '@/api/community'
import { ElMessage } from 'element-plus'

const authStore = useAuthStore()
const loading = ref(true)
const posts = ref([])
const commentOpenId = ref(null)
const commentText = ref('')

const currentUserId = computed(() => authStore.user?.id || authStore.user?.email || '')

onMounted(async () => {
  await loadPosts()
})

async function loadPosts() {
  loading.value = true
  try {
    posts.value = await getSharedPosts()
  } catch (e) {
    ElMessage.error('加载失败')
  } finally {
    loading.value = false
  }
}

async function toggleLike(post) {
  if (!authStore.isLoggedIn) {
    ElMessage.warning('请先登录')
    return
  }
  await likePost(post.id, currentUserId.value)
  await loadPosts()
}

function toggleComment(post) {
  if (commentOpenId.value === post.id) {
    commentOpenId.value = null
  } else {
    commentOpenId.value = post.id
  }
}

async function submitComment(post) {
  if (!commentText.value.trim()) return
  await addComment(post.id, currentUserId.value, authStore.user?.nickname || '匿名', commentText.value)
  commentText.value = ''
  commentOpenId.value = null
  await loadPosts()
  ElMessage.success('评论成功')
}

function scoreClass(post) {
  const rate = post.full_score > 0 ? post.score / post.full_score : 0
  if (rate >= 0.8) return 'score-excellent'
  if (rate >= 0.6) return 'score-good'
  if (rate >= 0.4) return 'score-pass'
  return 'score-fail'
}

function formatTime(t) {
  if (!t) return ''
  const d = new Date(t)
  const now = new Date()
  const diff = (now - d) / 1000
  if (diff < 60) return '刚刚'
  if (diff < 3600) return Math.floor(diff / 60) + '分钟前'
  if (diff < 86400) return Math.floor(diff / 3600) + '小时前'
  return t.split('T')[0]
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
  margin-top: 8px;
  color: #c0c4cc;
}

.post-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.post-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}

.post-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.post-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #409eff, #36cfc9);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
}

.post-user-info { flex: 1; }

.post-user {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.post-time {
  font-size: 12px;
  color: #c0c4cc;
}

.post-score-badge {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
}

.score-excellent { background: #f0f9eb; color: #67c23a; }
.score-good { background: #ecf5ff; color: #409eff; }
.score-pass { background: #fdf6ec; color: #e6a23c; }
.score-fail { background: #fef0f0; color: #f56c6c; }

.post-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.post-province {
  font-size: 13px;
  color: #606266;
}

.post-score-text {
  font-size: 13px;
  color: #f56c6c;
  font-weight: 600;
}

.post-answer, .post-feedback {
  margin-bottom: 12px;
}

.post-label {
  font-size: 12px;
  font-weight: 600;
  color: #909399;
  margin-bottom: 4px;
}

.post-label-green { color: #67c23a; }
.post-label-orange { color: #e6a23c; }

.post-content-text, .post-feedback-text {
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
  background: #f9fafb;
  border-radius: 8px;
  padding: 10px 12px;
}

.post-feedback .post-feedback-text {
  background: #fff9f0;
}

.post-actions {
  display: flex;
  gap: 24px;
  padding-top: 8px;
  border-top: 1px solid #f0f0f0;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  font-size: 13px;
  color: #909399;
}

.action-btn:hover {
  color: #409eff;
}

.action-btn.liked {
  color: #f56c6c;
}

.action-icon {
  font-size: 16px;
}

.comment-section {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}

.comment-item {
  margin-bottom: 8px;
  font-size: 13px;
}

.comment-user {
  font-weight: 600;
  color: #303133;
}

.comment-text {
  color: #606266;
}

.comment-input-row {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

@media (max-width: 768px) {
  .page-wrapper { padding: 12px; }
  .page-title { font-size: 20px; }
  .post-card { padding: 14px; }
  .post-avatar { width: 32px; height: 32px; font-size: 14px; }
  .post-score-badge { width: 36px; height: 36px; font-size: 12px; }
}
</style>
