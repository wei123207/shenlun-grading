<template>
  <div class="page-wrapper">
    <div class="page-header">
      <h1 class="page-title">后台管理</h1>
      <p class="page-subtitle">题库管理 · 用户管理 · 数据统计</p>
    </div>

    <div class="admin-tabs">
      <div class="tab-item" :class="{active: tab==='stats'}" @click="tab='stats'">数据统计</div>
      <div class="tab-item" :class="{active: tab==='questions'}" @click="tab='questions'">题库管理</div>
      <div class="tab-item" :class="{active: tab==='users'}" @click="tab='users'">用户管理</div>
    </div>

    <!-- 数据统计 -->
    <div v-if="tab==='stats'" class="tab-content">
      <div class="stats-grid">
        <div class="admin-stat-card">
          <div class="stat-icon">📋</div>
          <div class="stat-info">
            <div class="stat-num">{{ stats.totalQuestions }}</div>
            <div class="stat-label">题目总数</div>
          </div>
        </div>
        <div class="admin-stat-card">
          <div class="stat-icon">🗺️</div>
          <div class="stat-info">
            <div class="stat-num">{{ stats.totalProvinces }}</div>
            <div class="stat-label">覆盖省份</div>
          </div>
        </div>
        <div class="admin-stat-card">
          <div class="stat-icon">📅</div>
          <div class="stat-info">
            <div class="stat-num">{{ stats.yearRange }}</div>
            <div class="stat-label">年份跨度</div>
          </div>
        </div>
        <div class="admin-stat-card">
          <div class="stat-icon">📝</div>
          <div class="stat-info">
            <div class="stat-num">{{ stats.totalRecords }}</div>
            <div class="stat-label">批改记录</div>
          </div>
        </div>
      </div>

      <div class="chart-section">
        <h3 class="section-title">各省份题目数量</h3>
        <div class="province-bars">
          <div v-for="p in stats.provinceCounts.slice(0, 10)" :key="p.province" class="bar-item">
            <span class="bar-label">{{ p.province }}</span>
            <div class="bar-track">
              <div class="bar-fill" :style="{width: barWidth(p.count) + '%'}"></div>
            </div>
            <span class="bar-num">{{ p.count }}</span>
          </div>
        </div>
      </div>

      <div class="chart-section">
        <h3 class="section-title">各题型分布</h3>
        <div class="type-bars">
          <div v-for="t in stats.typeCounts" :key="t.type" class="bar-item">
            <span class="bar-label">{{ t.type }}</span>
            <div class="bar-track">
              <div class="bar-fill bar-fill-blue" :style="{width: barWidth(t.count) + '%'}"></div>
            </div>
            <span class="bar-num">{{ t.count }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 题库管理 -->
    <div v-if="tab==='questions'" class="tab-content">
      <div class="filter-row">
        <el-input v-model="qSearch" placeholder="搜索省份/题型/关键词" size="small" clearable style="width: 240px" />
        <el-button type="primary" size="small" @click="searchQuestions">搜索</el-button>
      </div>

      <el-table :data="questionList" stripe size="small" style="margin-top: 12px">
        <el-table-column prop="province" label="省份" width="80" />
        <el-table-column prop="year" label="年份" width="70" />
        <el-table-column prop="question_number" label="题号" width="60" />
        <el-table-column prop="question_type" label="题型" width="100" />
        <el-table-column prop="full_score" label="分值" width="60" />
        <el-table-column label="题目摘要" show-overflow-tooltip>
          <template #default="{ row }">
            {{ truncate(row.question_content, 50) }}
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-row" v-if="totalQ > 0">
        <el-pagination
          v-model:current-page="qPage"
          :page-size="20"
          :total="totalQ"
          layout="prev, pager, next"
          small
          @current-change="loadQuestions"
        />
      </div>
    </div>

    <!-- 用户管理 -->
    <div v-if="tab==='users'" class="tab-content">
      <div class="user-toolbar">
        <el-input v-model="userSearch" placeholder="搜索邮箱或昵称" size="small" style="width: 240px" clearable />
        <el-button type="primary" size="small" @click="loadUsers">刷新</el-button>
      </div>
      <el-table :data="filteredUsers" stripe size="small" v-loading="userLoading">
        <el-table-column prop="email" label="邮箱" min-width="180" />
        <el-table-column prop="nickname" label="昵称" width="120" />
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.banned ? 'danger' : 'success'" size="small">
              {{ row.banned ? '已封禁' : '正常' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="注册时间" width="120">
          <template #default="{ row }">
            {{ row.created_at ? row.created_at.split('T')[0] : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="最近登录" width="120">
          <template #default="{ row }">
            {{ row.last_sign_in_at ? row.last_sign_in_at.split('T')[0] : '未登录' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button text size="small" type="primary" @click="toggleBan(row)">
              {{ row.banned ? '解封' : '封禁' }}
            </el-button>
            <el-button text size="small" type="danger" @click="removeUser(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div v-if="!userLoading && filteredUsers.length === 0" class="empty-inline">暂无用户数据</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import axios from 'axios'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const IS_DEV = import.meta.env.DEV
const ENV_ID = 'shenlun-d4gplnd59018378c0'
const API_BASE = `https://${ENV_ID}-1473604851.ap-shanghai.app.tcloudbase.com`

const router = useRouter()
const authStore = useAuthStore()

onMounted(() => {
  if (!authStore.isAdmin) {
    ElMessage.warning('无权访问后台管理')
    router.push('/')
  }
})

const tab = ref('stats')
const stats = ref({
  totalQuestions: 0,
  totalProvinces: 0,
  yearRange: '-',
  totalRecords: 0,
  provinceCounts: [],
  typeCounts: []
})

const questionList = ref([])
const qSearch = ref('')
const qPage = ref(1)
const totalQ = ref(0)

const userList = ref([])
const userSearch = ref('')
const userLoading = ref(false)

const AUTH_API = IS_DEV ? '/api/auth-api' : `${API_BASE}/api/auth-api`

onMounted(async () => {
  await loadStats()
  await loadQuestions()
})

watch(tab, async (newTab) => {
  if (newTab === 'users' && userList.value.length === 0) {
    await loadUsers()
  }
})

const filteredUsers = computed(() => {
  if (!userSearch.value) return userList.value
  const s = userSearch.value.toLowerCase()
  return userList.value.filter(u =>
    (u.email || '').toLowerCase().includes(s) ||
    (u.nickname || '').toLowerCase().includes(s)
  )
})

async function loadUsers() {
  const token = localStorage.getItem('sl_access_token')
  if (!token) {
    ElMessage.error('登录凭证已过期，请重新登录')
    router.push('/login')
    return
  }
  userLoading.value = true
  try {
    const { data } = await axios.post(AUTH_API, { action: 'listUsers', page: 1, perPage: 100, token })
    if (data.error) {
      ElMessage.error(data.error)
      if (data.error.includes('认证') || data.error.includes('权限')) {
        router.push('/login')
      }
    } else {
      userList.value = data.users || []
    }
  } catch (e) {
    ElMessage.error('加载用户列表失败')
  } finally {
    userLoading.value = false
  }
}

async function toggleBan(row) {
  if (row.id === authStore.user?.id) {
    ElMessage.warning('不能封禁自己')
    return
  }
  try {
    const action = row.banned ? '解封' : '封禁'
    await ElMessageBox.confirm(`确定${action}用户 ${row.email}？`, '确认', { type: 'warning' })
    const token = localStorage.getItem('sl_access_token')
    const { data } = await axios.post(AUTH_API, {
      action: 'updateUser',
      uid: row.id,
      data: { banned: !row.banned },
      token
    })
    if (data.error) {
      ElMessage.error(data.error)
    } else {
      ElMessage.success(`${action}成功`)
      await loadUsers()
    }
  } catch (e) {
    // cancelled
  }
}

async function removeUser(row) {
  try {
    await ElMessageBox.confirm(`确定删除用户 ${row.email}？此操作不可恢复！`, '危险操作', {
      type: 'error',
      confirmButtonText: '确认删除',
      cancelButtonText: '取消'
    })
    const token = localStorage.getItem('sl_access_token')
    const { data } = await axios.post(AUTH_API, {
      action: 'deleteUser',
      uid: row.id,
      token
    })
    if (data.error) {
      ElMessage.error(data.error)
    } else {
      ElMessage.success('用户已删除')
      await loadUsers()
    }
  } catch (e) {
    // cancelled
  }
}

const SUPABASE_REST = import.meta.env.VITE_SUPABASE_REST
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

const headers = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`
}

async function loadStats() {
  try {
    const { data } = await axios.get(`${SUPABASE_REST}/shenlun_questions`, {
      params: { select: 'province,year,question_type', limit: 10000 },
      headers
    })

    const provinces = [...new Set(data.map(d => d.province))].filter(Boolean)
    const years = data.map(d => d.year).filter(Boolean)
    const minYear = Math.min(...years)
    const maxYear = Math.max(...years)

    const provMap = {}
    data.forEach(d => {
      const p = d.province || '未知'
      if (!provMap[p]) provMap[p] = 0
      provMap[p]++//国考
    })
    const provinceCounts = Object.entries(provMap).map(([province, count]) => ({ province, count })).sort((a, b) => b.count - a.count)

    const typeMap = {}
    data.forEach(d => {
      const t = d.question_type || '未知'
      if (!typeMap[t]) typeMap[t] = 0
      typeMap[t]++
    })
    const typeCounts = Object.entries(typeMap).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count)

    stats.value = {
      totalQuestions: data.length,
      totalProvinces: provinces.length,
      yearRange: `${minYear}-${maxYear}`,
      totalRecords: 0,
      provinceCounts,
      typeCounts
    }
  } catch (e) {
    ElMessage.error('加载统计数据失败')
  }
}

async function loadQuestions() {
  try {
    const params = {
      select: 'id,province,year,question_number,question_type,full_score,question_content',
      order: 'province.asc,year.desc,question_number.asc',
      limit: 20,
      offset: (qPage.value - 1) * 20
    }

    const { data } = await axios.get(`${SUPABASE_REST}/shenlun_questions`, { params, headers })
    questionList.value = data || []

    const { data: countData } = await axios.get(`${SUPABASE_REST}/shenlun_questions`, {
      params: { select: 'id', limit: 10000 },
      headers
    })
    totalQ.value = countData ? countData.length : 0
  } catch (e) {
    ElMessage.error('加载题目失败')
  }
}

function searchQuestions() {
  qPage.value = 1
  loadQuestions()
}

function barWidth(count) {
  const max = Math.max(...stats.value.provinceCounts.map(p => p.count), 1)
  return Math.min(100, (count / max) * 100)
}

function truncate(text, len) {
  if (!text) return '-'
  return text.length > len ? text.slice(0, len) + '...' : text
}
</script>

<style scoped>
.page-wrapper {
  max-width: 1000px;
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

.admin-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 20px;
  background: #fff;
  border-radius: 10px;
  padding: 4px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 10px;
  font-size: 14px;
  color: #606266;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s;
}

.tab-item:hover {
  color: #409eff;
}

.tab-item.active {
  background: #409eff;
  color: #fff;
  font-weight: 600;
}

.tab-content {
  min-height: 400px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.admin-stat-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}

.stat-icon {
  font-size: 28px;
}

.stat-num {
  font-size: 24px;
  font-weight: 700;
  color: #303133;
}

.stat-label {
  font-size: 12px;
  color: #909399;
  margin-top: 2px;
}

.chart-section {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
  color: #303133;
}

.bar-item {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.bar-label {
  width: 70px;
  font-size: 13px;
  color: #606266;
  flex-shrink: 0;
}

.bar-track {
  flex: 1;
  height: 20px;
  background: #f0f2f5;
  border-radius: 10px;
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  background: #67c23a;
  border-radius: 10px;
  transition: width 0.5s;
}

.bar-fill-blue {
  background: #409eff;
}

.bar-num {
  width: 40px;
  font-size: 13px;
  color: #909399;
  text-align: right;
}

.filter-row {
  display: flex;
  gap: 8px;
}

.pagination-row {
  margin-top: 16px;
  display: flex;
  justify-content: center;
}

.empty-inline {
  text-align: center;
  padding: 40px;
  color: #c0c4cc;
}

@media (max-width: 768px) {
  .page-wrapper { padding: 12px; }
  .page-title { font-size: 20px; }
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
  .admin-stat-card { padding: 14px; gap: 10px; }
  .stat-num { font-size: 20px; }
  .bar-label { width: 60px; font-size: 12px; }
}

.user-toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}
</style>
