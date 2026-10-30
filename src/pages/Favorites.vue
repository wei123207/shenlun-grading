<template>
  <div class="page-wrapper">
    <div class="page-header">
      <h1 class="page-title">我的收藏</h1>
      <p class="page-subtitle">收藏的题目随时可以重新练习</p>
    </div>

    <div v-if="loading" class="loading-box">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span>加载中...</span>
    </div>

    <template v-else>
      <div v-if="favList.length === 0" class="empty-box">
        <div class="empty-icon">📭</div>
        <p>暂无收藏题目</p>
        <el-button type="primary" @click="goHome" style="margin-top: 16px">去选题</el-button>
      </div>

      <div v-else>
        <div class="filter-bar">
          <el-select v-model="activeCategory" placeholder="分类筛选" clearable size="small">
            <el-option v-for="c in categories" :key="c" :label="c" :value="c" />
          </el-select>
        </div>

        <div class="fav-list">
          <div v-for="item in filteredList" :key="item.id" class="fav-card">
            <div class="fav-body" @click="practice(item)">
              <div class="fav-meta">
                <el-tag size="small" type="warning">⭐ 收藏</el-tag>
                <el-tag size="small" type="info">{{ item.question_type || '未知' }}</el-tag>
                <span class="fav-province">{{ item.province }} · {{ item.year }}</span>
                <span class="fav-date">{{ formatDate(item.created_at) }}</span>
              </div>
              <div class="fav-content">{{ truncate(item.question_content, 80) }}</div>
            </div>
            <div class="fav-actions">
              <el-button size="small" type="primary" @click="practice(item)">练习</el-button>
              <el-button size="small" @click="removeFav(item.id)">取消收藏</el-button>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useQuestionStore } from '@/stores/question'
import { getFavorites, removeFavorite, getFavoriteCategories } from '@/api/favorites'
import { getQuestionById } from '@/api/supabase'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter()
const authStore = useAuthStore()
const questionStore = useQuestionStore()

const loading = ref(true)
const favList = ref([])
const categories = ref([])
const activeCategory = ref('')

const filteredList = computed(() => {
  if (!activeCategory.value) return favList.value
  return favList.value.filter(f => (f.category || '默认') === activeCategory.value)
})

onMounted(async () => {
  await loadData()
})

async function loadData() {
  loading.value = true
  try {
    const userId = authStore.user?.id || authStore.user?.email
    favList.value = await getFavorites(userId)
    categories.value = await getFavoriteCategories(userId)
  } catch (e) {
    ElMessage.error('加载收藏失败')
  } finally {
    loading.value = false
  }
}

async function practice(item) {
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
        question_content: item.question_content || '',
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

async function removeFav(id) {
  try {
    await ElMessageBox.confirm('确定取消收藏？', '提示', { type: 'warning' })
    await removeFavorite(id)
    await loadData()
    ElMessage.success('已取消收藏')
  } catch (e) {}
}

function goHome() {
  router.push('/')
}

function truncate(text, len) {
  if (!text) return '点击查看题目详情'
  return text.length > len ? text.slice(0, len) + '...' : text
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

.empty-box {
  text-align: center;
  padding: 60px 20px;
  color: #909399;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.filter-bar {
  margin-bottom: 16px;
  display: flex;
  justify-content: flex-end;
}

.fav-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.fav-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  transition: box-shadow 0.2s;
}

.fav-card:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.fav-body {
  flex: 1;
  cursor: pointer;
}

.fav-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.fav-province {
  font-size: 13px;
  color: #606266;
}

.fav-date {
  font-size: 12px;
  color: #c0c4cc;
}

.fav-content {
  font-size: 14px;
  color: #606266;
  margin-top: 8px;
  line-height: 1.5;
}

.fav-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .page-wrapper { padding: 12px; }
  .page-title { font-size: 20px; }
  .fav-card { padding: 12px; gap: 10px; }
  .fav-actions { flex-direction: row; }
}
</style>
