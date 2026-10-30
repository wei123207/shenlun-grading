<template>
  <div class="page-wrapper">
    <header class="page-header">
      <h1 class="page-title">个人中心</h1>
    </header>

    <div class="profile-card">
      <div class="avatar-section">
        <div class="avatar">{{ userInitial }}</div>
        <div class="user-info">
          <h2 class="user-nickname">{{ authStore.user?.nickname || '用户' }}</h2>
          <p class="user-email">{{ authStore.user?.email }}</p>
        </div>
        <el-button text type="primary" @click="pwdDialogVisible = true">修改密码</el-button>
        <el-button text type="danger" @click="handleLogout">退出登录</el-button>
      </div>
    </div>

    <div class="quick-nav">
      <div class="nav-item" @click="router.push('/wrong-book')">
        <div class="nav-icon nav-icon-red">📕</div>
        <span>错题本</span>
        <span class="nav-badge" v-if="wrongCount > 0">{{ wrongCount }}</span>
      </div>
      <div class="nav-item" @click="router.push('/favorites')">
        <div class="nav-icon nav-icon-yellow">⭐</div>
        <span>我的收藏</span>
      </div>
      <div class="nav-item" @click="router.push('/notifications')">
        <div class="nav-icon nav-icon-blue">🔔</div>
        <span>消息通知</span>
        <span class="nav-badge" v-if="unreadCount > 0">{{ unreadCount }}</span>
      </div>
      <div class="nav-item" @click="router.push('/records')">
        <div class="nav-icon nav-icon-green">📝</div>
        <span>批改记录</span>
      </div>
      <div class="nav-item" @click="router.push('/membership')">
        <div class="nav-icon nav-icon-orange">⭐</div>
        <span>会员中心</span>
      </div>
    </div>

    <div class="stats-section">
      <h3 class="section-title">学习数据</h3>
      <div v-if="statsLoading" class="stats-loading">
        <el-skeleton :rows="3" animated />
      </div>
      <template v-else>
        <div class="stats-cards">
          <div class="stat-card">
            <div class="stat-num">{{ stats.total || 0 }}</div>
            <div class="stat-label">累计批改</div>
          </div>
          <div class="stat-card">
            <div class="stat-num">{{ stats.avgScore || 0 }}</div>
            <div class="stat-label">平均得分率</div>
          </div>
          <div class="stat-card">
            <div class="stat-num">{{ stats.practiceDays || 0 }}</div>
            <div class="stat-label">练习天数</div>
          </div>
        </div>

        <div v-if="stats.recentScores && stats.recentScores.length > 0" class="chart-section">
          <h4 class="subsection-title">近期得分趋势</h4>
          <div ref="trendChartRef" class="echart-box"></div>
        </div>

        <div v-if="stats.typeStats && stats.typeStats.length > 0" class="chart-section">
          <h4 class="subsection-title">各题型表现</h4>
          <div ref="radarChartRef" class="echart-box"></div>
        </div>

        <div v-if="stats.total === 0" class="no-data">
          <el-empty description="暂无学习数据，开始练习吧">
            <el-button type="primary" @click="goHome">开始练习</el-button>
          </el-empty>
        </div>
      </template>
    </div>

    <!-- 优先反馈通道 -->
    <div class="feedback-section">
      <h3 class="section-title">反馈通道</h3>
      <el-input v-model="feedbackText" type="textarea" :rows="3" placeholder="提交问题反馈或功能建议" />
      <div class="feedback-action">
        <el-button type="primary" size="small" @click="submitFeedback" :loading="feedbackLoading">提交反馈</el-button>
      </div>
    </div>

    <!-- VIP: 智能学习计划 -->
    <div class="study-plan-section">
      <h3 class="section-title">
        智能学习计划
        <el-tag v-if="isVip" type="warning" size="small" effect="plain">VIP</el-tag>
      </h3>
      <div v-if="planLoading" class="plan-loading">
        <el-skeleton :rows="5" animated />
      </div>
      <div v-else-if="planText" class="plan-content">{{ planText }}</div>
      <template v-else>
        <el-button v-if="isVip" type="primary" plain @click="generatePlan" :loading="planLoading">生成本周学习计划</el-button>
        <div v-else class="plan-vip-hint">
          <span>升级VIP解锁个性化学习计划功能</span>
          <el-button type="warning" size="small" @click="router.push('/membership')">开通VIP</el-button>
        </div>
      </template>
    </div>

    <!-- 修改密码弹窗 -->
    <el-dialog v-model="pwdDialogVisible" title="修改密码" width="360px">
      <el-form ref="pwdFormRef" :model="pwdForm" :rules="pwdRules" label-width="0">
        <el-form-item prop="newPassword">
          <el-input v-model="pwdForm.newPassword" type="password" placeholder="新密码（至少6位）" size="large" prefix-icon="Lock" show-password />
        </el-form-item>
        <el-form-item prop="confirmPassword">
          <el-input v-model="pwdForm.confirmPassword" type="password" placeholder="确认新密码" size="large" prefix-icon="Lock" show-password @keyup.enter="handleChangePassword" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="pwdDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="pwdLoading" @click="handleChangePassword">确认修改</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick, onUnmounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import axios from 'axios'
import * as echarts from 'echarts'
import { useAuthStore } from '@/stores/auth'
import { getRecordStats } from '@/api/records'
import { getWrongStats } from '@/api/wrongbook'
import { getUnreadCount, initSystemNotifications, submitFeedback as apiSubmitFeedback } from '@/api/notifications'
import { getMembershipStatus } from '@/api/membership'
import { generateStudyPlan } from '@/api/ai'

const IS_DEV = import.meta.env.DEV
const ENV_ID = 'shenlun-d4gplnd59018378c0'
const API_BASE = `https://${ENV_ID}-1473604851.ap-shanghai.app.tcloudbase.com`
const AUTH_API = IS_DEV ? '/api/auth-api' : `${API_BASE}/api/auth-api`

const router = useRouter()
const authStore = useAuthStore()

const stats = ref({})
const statsLoading = ref(true)
const wrongCount = ref(0)
const unreadCount = ref(0)

const pwdDialogVisible = ref(false)
const pwdLoading = ref(false)
const pwdFormRef = ref()
const pwdForm = reactive({ newPassword: '', confirmPassword: '' })

const membership = ref(getMembershipStatus())
const isVip = computed(() => membership.value.level === 'vip')
const planText = ref('')
const planLoading = ref(false)
const feedbackText = ref('')
const feedbackLoading = ref(false)

async function submitFeedback() {
  const text = feedbackText.value.trim()
  if (!text) {
    ElMessage.warning('请输入反馈内容')
    return
  }
  feedbackLoading.value = true
  try {
    const userId = authStore.user.id || authStore.user.email
    await apiSubmitFeedback(userId, text, isVip.value)
    feedbackText.value = ''
    ElMessage.success('反馈已提交' + (isVip.value ? '（VIP优先处理）' : ''))
  } catch (e) {
    ElMessage.error('提交失败')
  } finally {
    feedbackLoading.value = false
  }
}

async function generatePlan() {
  if (!isVip.value) {
    ElMessage.warning('请先开通VIP')
    return
  }
  planLoading.value = true
  try {
    const s = stats.value || {}
    const planStats = {
      totalQuestions: s.total || 0,
      avgScoreRate: s.avgScore || 0,
      topProvinces: s.topProvinces || [],
      weakTypes: s.weakTypes || [],
      recentScores: s.recentScores || [],
      weakestType: s.weakestType || ''
    }
    const text = await generateStudyPlan(planStats)
    planText.value = text
  } catch (e) {
    ElMessage.error('学习计划生成失败：' + e.message)
  } finally {
    planLoading.value = false
  }
}
const pwdRules = {
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码至少6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== pwdForm.newPassword) callback(new Error('两次输入密码不一致'))
        else callback()
      },
      trigger: 'blur'
    }
  ]
}

async function handleChangePassword() {
  await pwdFormRef.value.validate(async (valid) => {
    if (!valid) return
    pwdLoading.value = true
    try {
      const token = localStorage.getItem('sl_access_token')
      const { data } = await axios.post(AUTH_API, {
        action: 'changePassword',
        token,
        newPassword: pwdForm.newPassword
      })
      if (data.error) {
        ElMessage.error(data.error)
      } else {
        ElMessage.success('密码修改成功，请重新登录')
        pwdDialogVisible.value = false
        authStore.logout()
        router.push('/login')
      }
    } catch (e) {
      ElMessage.error('修改密码失败')
    } finally {
      pwdLoading.value = false
    }
  })
}

const trendChartRef = ref(null)
const radarChartRef = ref(null)
let trendChart = null
let radarChart = null

const userInitial = computed(() => {
  const name = authStore.user?.nickname || authStore.user?.email || 'U'
  return name.charAt(0).toUpperCase()
})

onMounted(async () => {
  if (!authStore.isLoggedIn) {
    router.push('/login')
    return
  }
  const userId = authStore.user.id || authStore.user.email
  
  try {
    stats.value = await getRecordStats(userId)
  } catch (e) {
    ElMessage.error('加载统计数据失败')
  } finally {
    statsLoading.value = false
  }

  try {
    const ws = await getWrongStats(userId)
    wrongCount.value = ws.total
  } catch (e) {}

  try {
    initSystemNotifications(userId)
    unreadCount.value = await getUnreadCount(userId)
  } catch (e) {}

  await nextTick()
  renderCharts()
})

function renderCharts() {
  if (stats.value.recentScores && stats.value.recentScores.length > 0 && trendChartRef.value) {
    trendChart = echarts.init(trendChartRef.value)
    const dates = stats.value.recentScores.map(s => s.date ? s.date.slice(5) : '')
    const rates = stats.value.recentScores.map(s => s.rate)
    trendChart.setOption({
      tooltip: { trigger: 'axis' },
      grid: { left: 40, right: 20, top: 20, bottom: 30 },
      xAxis: { type: 'category', data: dates, axisLabel: { fontSize: 11 } },
      yAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%' } },
      series: [{
        type: 'bar',
        data: rates,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#409eff' },
            { offset: 1, color: '#67c23a' }
          ]),
          borderRadius: [4, 4, 0, 0]
        },
        barWidth: '50%'
      }]
    })
  }

  if (stats.value.typeStats && stats.value.typeStats.length > 0 && radarChartRef.value) {
    radarChart = echarts.init(radarChartRef.value)
    const types = stats.value.typeStats.map(t => t.type)
    const scores = stats.value.typeStats.map(t => t.avgScore)
    const counts = stats.value.typeStats.map(t => t.count)
    
    const maxScore = Math.max(...scores, 100)
    radarChart.setOption({
      tooltip: { trigger: 'item' },
      legend: { data: ['得分率', '练习次数'], bottom: 0 },
      radar: {
        indicator: types.map(t => ({ name: t, max: 100 })),
        radius: '60%',
        center: ['50%', '50%']
      },
      series: [{
        type: 'radar',
        data: [
          {
            value: scores,
            name: '得分率',
            itemStyle: { color: '#409eff' },
            areaStyle: { opacity: 0.2 }
          },
          {
            value: counts.map(c => Math.min(100, c * 20)),
            name: '练习次数',
            itemStyle: { color: '#67c23a' },
            areaStyle: { opacity: 0.1 }
          }
        ]
      }]
    })
  }
}

function handleResize() {
  trendChart?.resize()
  radarChart?.resize()
}

window.addEventListener('resize', handleResize)

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  trendChart?.dispose()
  radarChart?.dispose()
})

function handleLogout() {
  authStore.logout()
  ElMessage.success('已退出登录')
  router.push('/login')
}

function goHome() {
  router.push('/')
}
</script>

<style scoped>
.page-wrapper {
  max-width: 800px;
  margin: 0 auto;
  padding: 24px 20px 40px;
}

.page-header {
  text-align: center;
  margin-bottom: 24px;
}

.page-title {
  font-size: 26px;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0;
}

.profile-card {
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  margin-bottom: 16px;
}

.avatar-section {
  display: flex;
  align-items: center;
  gap: 16px;
}

.avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #409eff, #36cfc9);
  color: #fff;
  font-size: 24px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.user-info { flex: 1; }

.user-nickname {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.user-email {
  font-size: 13px;
  color: #909399;
  margin: 4px 0 0;
}

.quick-nav {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.nav-item {
  background: #fff;
  border-radius: 12px;
  padding: 16px 8px;
  text-align: center;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  position: relative;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}

.nav-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.nav-icon {
  font-size: 24px;
  margin-bottom: 6px;
}

.nav-icon-red { background: #fef0f0; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; margin: 0 auto 6px; }
.nav-icon-yellow { background: #fdf6ec; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; margin: 0 auto 6px; }
.nav-icon-blue { background: #ecf5ff; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; margin: 0 auto 6px; }
.nav-icon-green { background: #f0f9eb; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; margin: 0 auto 6px; }
.nav-icon-orange { background: #fef0f0; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; margin: 0 auto 6px; }

.nav-item span {
  font-size: 12px;
  color: #606266;
  display: block;
}

.nav-badge {
  position: absolute;
  top: 4px;
  right: 8px;
  background: #f56c6c;
  color: #fff !important;
  font-size: 10px !important;
  border-radius: 10px;
  padding: 1px 6px;
  min-width: 16px;
  text-align: center;
}

.stats-section {
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 20px;
}

.stats-cards {
  display: flex;
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  flex: 1;
  text-align: center;
  background: #f9fafb;
  border-radius: 12px;
  padding: 20px 12px;
}

.stat-num {
  font-size: 32px;
  font-weight: 700;
  color: #409eff;
}

.stat-label {
  font-size: 13px;
  color: #909399;
  margin-top: 4px;
}

.chart-section {
  margin-bottom: 24px;
}

.subsection-title {
  font-size: 14px;
  font-weight: 600;
  color: #606266;
  margin: 0 0 16px;
}

.echart-box {
  width: 100%;
  height: 240px;
}

.no-data {
  padding: 32px 0;
}

.feedback-section {
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  margin-bottom: 16px;
}

.feedback-action {
  margin-top: 8px;
  text-align: right;
}

.study-plan-section {
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  margin-bottom: 16px;
}

.study-plan-section .section-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.plan-content {
  font-size: 14px;
  color: #303133;
  line-height: 1.8;
  white-space: pre-wrap;
  background: #f9fafb;
  border-radius: 10px;
  padding: 16px;
}

.plan-vip-hint {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: #909399;
  font-size: 14px;
}

@media (max-width: 768px) {
  .page-wrapper { padding: 16px 12px 32px; }
  .page-title { font-size: 22px; }
  .quick-nav { grid-template-columns: repeat(2, 1fr); }
  .stats-cards { flex-direction: column; gap: 12px; }
  .stat-card { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; }
  .stat-num { font-size: 24px; }
  .avatar-section { flex-wrap: wrap; }
  .echart-box { height: 200px; }
}
</style>
