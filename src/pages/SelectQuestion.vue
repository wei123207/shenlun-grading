<template>
  <div class="page-wrapper">
    <header class="page-header">
      <h1 class="page-title">申论AI智能评分</h1>
      <p class="page-subtitle">AI辅助批改申论作答，生成得分与优化建议</p>
    </header>

    <section class="filter-section">
      <div class="filter-row">
        <div class="filter-item">
          <label class="filter-label">省份</label>
          <el-select v-model="filterForm.province" placeholder="请选择考试省份" @change="onProvinceChange" style="width: 100%">
            <el-option v-for="p in provinces" :key="p" :label="p" :value="p" />
          </el-select>
        </div>
        <div class="filter-item">
          <label class="filter-label">年份</label>
          <el-select v-model="filterForm.year" placeholder="请选择考试年份" @change="onYearChange" :disabled="!filterForm.province" style="width: 100%">
            <el-option v-for="y in years" :key="y" :label="y + '年'" :value="y" />
          </el-select>
        </div>
        <div class="filter-item">
          <label class="filter-label">试卷类型</label>
          <el-select v-model="filterForm.paperType" placeholder="请选择试卷类型" :disabled="!filterForm.year" style="width: 100%">
            <el-option v-for="t in paperTypes" :key="t" :label="t" :value="t" />
          </el-select>
        </div>
        <div class="filter-item filter-btn-wrap">
          <el-button type="primary" size="large" :disabled="!canLoad" :loading="loading" @click="loadQuestions" class="load-btn">
            加载真题
          </el-button>
        </div>
      </div>
    </section>

    <section v-if="questions.length > 0" class="question-list-section">
      <div class="list-header">
        <h3 class="section-title">题目列表（共{{ filteredQuestions.length }}题）</h3>
        <div class="list-filters">
          <el-select v-model="filterForm.questionType" placeholder="题型筛选" clearable size="small" style="width: 120px">
            <el-option v-for="t in questionTypes" :key="t" :label="t" :value="t" />
          </el-select>
          <el-input v-model="filterForm.keyword" placeholder="搜索关键词" clearable size="small" prefix-icon="Search" style="width: 200px" />
        </div>
      </div>
      <div class="question-list">
        <div v-for="q in filteredQuestions" :key="q.id" class="question-item" @click="handleSelectQuestion(q)">//每行点击
          <div class="q-item-left">
            <span class="q-number">第{{ q.question_number }}题</span>
            <el-tag size="small" type="info">{{ q.question_type }}</el-tag>
            <span class="q-score">{{ q.full_score }}分</span>
          </div>
          <div class="q-title">{{ q.question_title }}</div>
          <el-icon class="q-star" @click.stop="toggleFav(q)">//收藏
            <component :is="favIds.has(q.id) ? 'StarFilled' : 'Star'" />
          </el-icon>
          <el-icon class="q-arrow"><arrow-right /></el-icon>
        </div>
      </div>
    </section>

    <section v-else-if="hasLoaded && questions.length === 0" class="empty-section">
      <el-empty description="该筛选条件下暂无题目" />
    </section>

    <section v-else class="empty-section">
      <el-empty description="请先选择省份、年份、试卷类型，加载申论题目" />
    </section>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowRight, Search, Star, StarFilled } from '@element-plus/icons-vue'
import { getProvinces, getYearsByProvince, getPaperTypes, getQuestionsByProvinceAndYear } from '@/api/supabase'
import { useQuestionStore } from '@/stores/question'
import { useAuthStore } from '@/stores/auth'
import { addFavorite, getFavorites, removeFavorite, isFavorited } from '@/api/favorites'

const router = useRouter()
const questionStore = useQuestionStore()
const authStore = useAuthStore()
const favIds = ref(new Set())

const provinces = ref([])
const years = ref([])
const paperTypes = ref([])
const questions = ref([])
const loading = ref(false)
const hasLoaded = ref(false)

const filterForm = reactive({
  province: '',
  year: null,
  paperType: '',
  questionType: '',
  keyword: ''
})

const questionTypes = computed(() => {
  const types = [...new Set(questions.value.map(q => q.question_type).filter(Boolean))]
  return types.sort()
})

const filteredQuestions = computed(() => {
  let list = questions.value
  if (filterForm.questionType) {
    list = list.filter(q => q.question_type === filterForm.questionType)
  }
  if (filterForm.keyword) {
    const kw = filterForm.keyword.toLowerCase()
    list = list.filter(q =>
      (q.question_title || '').toLowerCase().includes(kw) ||
      (q.question_content || '').toLowerCase().includes(kw)
    )
  }
  return list
})

const canLoad = computed(() => filterForm.province && filterForm.year && filterForm.paperType)

onMounted(async () => {//挂载触发获取数据源
  try {
    provinces.value = await getProvinces()
  } catch (e) {
    ElMessage.error('加载省份失败：' + e.message)
  }
})

async function onProvinceChange() {
  filterForm.year = null
  filterForm.paperType = ''
  paperTypes.value = []
  questions.value = []
  hasLoaded.value = false
  if (!filterForm.province) return
  try {
    years.value = await getYearsByProvince(filterForm.province)
  } catch (e) {
    ElMessage.error('加载年份失败：' + e.message)
  }
}

async function onYearChange() {
  filterForm.paperType = ''
  questions.value = []
  hasLoaded.value = false
  if (!filterForm.province || !filterForm.year) return
  try {
    paperTypes.value = await getPaperTypes(filterForm.province, filterForm.year)
  } catch (e) {
    ElMessage.error('加载试卷类型失败：' + e.message)
  }
}

async function loadQuestions() {
  if (!canLoad.value) {
    ElMessage.warning('请完整选择省份、年份、试卷类型')
    return
  }
  loading.value = true
  try {
    questions.value = await getQuestionsByProvinceAndYear(filterForm.province, filterForm.year, filterForm.paperType)
    hasLoaded.value = true
    if (questions.value.length === 0) {
      ElMessage.info('该筛选条件下暂无题目')
    }
    await loadFavStatus()
  } catch (e) {
    ElMessage.error('加载题目失败：' + e.message)
  } finally {
    loading.value = false
  }
}

async function loadFavStatus() {
  if (!authStore.isLoggedIn) return
  const userId = authStore.user?.id || authStore.user?.email
  const favs = await getFavorites(userId)
  favIds.value = new Set(favs.map(f => f.question_id))
}

async function toggleFav(q) {
  if (!authStore.isLoggedIn) {
    ElMessage.warning('请先登录后再收藏')
    return
  }
  const userId = authStore.user?.id || authStore.user?.email
  if (favIds.value.has(q.id)) {
    const favs = await getFavorites(userId)
    const fav = favs.find(f => f.question_id === q.id)
    if (fav) await removeFavorite(fav.id)
    favIds.value.delete(q.id)
    favIds.value = new Set(favIds.value)
    ElMessage.success('已取消收藏')
  } else {
    await addFavorite(userId, {
      question_id: q.id,
      province: q.province,
      year: q.year,
      question_number: q.question_number,
      question_type: q.question_type,
      question_content: q.question_title || q.question_content,
      full_score: q.full_score
    })
    favIds.value.add(q.id)
    favIds.value = new Set(favIds.value)
    ElMessage.success('已收藏')
  }
}

function handleSelectQuestion(row) {
  questionStore.setQuestion(row)
  router.push('/answer')
}
</script>

<style scoped>
.page-wrapper {
  max-width: 1000px;
  margin: 0 auto;
  padding: 24px 20px 40px;
}

.page-header {
  text-align: center;
  margin-bottom: 32px;
}

.page-title {
  font-size: 28px;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0;
  letter-spacing: 2px;
}

.page-subtitle {
  font-size: 14px;
  color: #909399;
  margin: 8px 0 0;
}

.filter-section {
  background: #fff;
  border-radius: 16px;
  padding: 28px 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  margin-bottom: 24px;
}

.filter-row {
  display: flex;
  gap: 16px;
  align-items: flex-end;
  flex-wrap: wrap;
}

.filter-item {
  flex: 1;
  min-width: 180px;
}

.filter-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #606266;
  margin-bottom: 8px;
}

.filter-btn-wrap {
  flex: 0 0 auto;
  min-width: 120px;
}

.load-btn {
  width: 100%;
}

.question-list-section {
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}

.list-filters {
  display: flex;
  gap: 8px;
  align-items: center;
}

.question-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.question-item {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  background: #f9fafb;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.question-item:hover {
  background: #eef4ff;
  border-color: #409eff;
}

.q-item-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  margin-right: 16px;
}

.q-number {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  white-space: nowrap;
}

.q-score {
  font-size: 13px;
  color: #e6a23c;
  font-weight: 600;
}

.q-title {
  flex: 1;
  font-size: 14px;
  color: #606266;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.q-arrow {
  color: #c0c4cc;
  font-size: 16px;
  margin-left: 12px;
  flex-shrink: 0;
}

.q-star {
  color: #c0c4cc;
  font-size: 18px;
  cursor: pointer;
  transition: color 0.2s;
  margin-left: 8px;
}

.q-star:hover {
  color: #e6a23c;
}

.empty-section {
  background: #fff;
  border-radius: 16px;
  padding: 48px 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  display: flex;
  justify-content: center;
}

.page-footer {
  text-align: center;
  margin-top: 40px;
  padding-bottom: 8px;
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

  .filter-row {
    flex-direction: column;
    gap: 12px;
  }

  .filter-item {
    min-width: 100%;
  }

  .filter-btn-wrap {
    min-width: 100%;
  }

  .list-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .list-filters {
    width: 100%;
    flex-direction: column;
  }

  .list-filters .el-select,
  .list-filters .el-input {
    width: 100% !important;
  }

  .question-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .q-item-left {
    margin-right: 0;
  }

  .q-title {
    white-space: normal;
  }

  .q-arrow {
    display: none;
  }
}
</style>
