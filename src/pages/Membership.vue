<template>
  <div class="page-wrapper">
    <div class="page-header">
      <h1 class="page-title">会员中心</h1>
      <p class="page-subtitle">升级会员，解锁无限批改与深度分析</p>
    </div>

    <div class="status-card" v-if="membership.level === 'vip'">
      <div class="status-icon">👑</div>
      <div class="status-info">
        <div class="status-level">VIP会员 · {{ membership.plan }}</div>
        <div class="status-expire">到期时间：{{ formatDate(membership.expireAt) }}</div>
      </div>
    </div>
    <div class="status-card free" v-else>
      <div class="status-icon">👤</div>
      <div class="status-info">
        <div class="status-level">免费用户</div>
        <div class="status-expire">今日剩余批改次数：{{ remaining.remaining }}/{{ remaining.limit }}</div>
      </div>
    </div>

    <div class="plans-section">
      <h3 class="section-title">会员套餐</h3>
      <div class="plans-grid">
        <div
          v-for="plan in plans"
          :key="plan.key"
          class="plan-card"
          :class="{ featured: plan.featured }"
          @click="selectPlan(plan.key)"
        >
          <div v-if="plan.featured" class="plan-badge">推荐</div>
          <div class="plan-name">{{ plan.name }}</div>
          <div class="plan-price">
            <span class="price-symbol">￥</span>
            <span class="price-num">{{ plan.price }}</span>
          </div>
          <div class="plan-period">{{ plan.period }}</div>
          <div class="plan-features">
            <div v-for="f in plan.features" :key="f" class="feature-item">
              <span class="check">✓</span> {{ f }}
            </div>
          </div>
          <el-button
            :type="plan.featured ? 'primary' : 'default'"
            class="plan-btn"
            @click.stop="buy(plan.key)"
          >
            {{ membership.level === 'vip' ? '续费' : '立即开通' }}
          </el-button>
        </div>
      </div>
    </div>

    <div class="orders-section" v-if="orders.length > 0">
      <h3 class="section-title">购买记录</h3>
      <el-table :data="orders" stripe size="small">
        <el-table-column prop="plan" label="套餐" />
        <el-table-column prop="amount" label="金额" width="80">
          <template #default="{ row }">￥{{ row.amount }}</template>
        </el-table-column>
        <el-table-column prop="pay_status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.pay_status === 'paid' ? 'success' : 'warning'" size="small">
              {{ row.pay_status === 'paid' ? '已支付' : '待支付' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="购买时间">
          <template #default="{ row }">
            {{ row.created_at ? row.created_at.split('T')[0] : '-' }}
          </template>
        </el-table-column>
      </el-table>
    </div>

    <el-dialog v-model="payDialogVisible" title="确认订单" width="360px">
      <div class="pay-dialog-content" v-if="selectedPlanInfo">
        <div class="pay-plan-name">{{ selectedPlanInfo.name }}</div>
        <div class="pay-amount">
          <span class="pay-symbol">￥</span>
          <span class="pay-price">{{ selectedPlanInfo.price }}</span>
        </div>
        <div class="pay-methods">
          <div
            class="pay-method"
            :class="{ active: payMethod === 'wechat' }"
            @click="payMethod = 'wechat'"
          >
            <span class="pay-icon">💚</span> 微信支付
          </div>
          <div
            class="pay-method"
            :class="{ active: payMethod === 'alipay' }"
            @click="payMethod = 'alipay'"
          >
            <span class="pay-icon">💙</span> 支付宝
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="payDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmPay">确认支付（模拟）</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getMembershipStatus, getRemainingGrades, purchaseMembership, getOrders } from '@/api/membership'

const membership = ref({ level: 'free', expireAt: null })
const remaining = ref({ remaining: 3, limit: 3 })
const orders = ref([])
const payDialogVisible = ref(false)
const selectedPlanInfo = ref(null)
const payMethod = ref('wechat')

const plans = [
  {
    key: 'monthly',
    name: '月度会员',
    price: 29,
    period: '/月',
    features: ['无限次AI批改', '多维度拆解评分', '优先反馈通道'],
    featured: false
  },
  {
    key: 'quarterly',
    name: '季度会员',
    price: 79,
    period: '/季',
    features: ['无限次AI批改', '多维度拆解评分', '优先反馈通道', 'AI同题范文生成'],
    featured: true
  },
  {
    key: 'yearly',
    name: '年度会员',
    price: 199,
    period: '/年',
    features: ['无限次AI批改', '多维度拆解评分', '优先反馈通道', 'AI同题范文生成', '智能学习计划'],
    featured: false
  },
  {
    key: 'lifetime',
    name: '终身会员',
    price: 499,
    period: '一次性',
    features: ['全部年度权益', '终身免费更新', 'AI深度追问对话', '专属学习计划', '采分点命中分析'],
    featured: false
  }
]

onMounted(() => {
  membership.value = getMembershipStatus()
  remaining.value = getRemainingGrades()
  orders.value = getOrders()
})

function selectPlan(key) {
  selectedPlanInfo.value = plans.find(p => p.key === key)
}

function buy(key) {
  selectPlan(key)
  payDialogVisible.value = true
}

function confirmPay() {
  try {
    purchaseMembership(selectedPlanInfo.value.key)
    membership.value = getMembershipStatus()
    orders.value = getOrders()
    payDialogVisible.value = false
    ElMessage.success(`恭喜！${selectedPlanInfo.value.name}开通成功！`)
  } catch (e) {
    ElMessage.error('支付失败：' + e.message)
  }
}

function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('zh-CN')
}
</script>

<style scoped>
.page-wrapper {
  max-width: 900px;
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

.status-card {
  background: linear-gradient(135deg, #fff9e6, #fff3d4);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.status-card.free {
  background: linear-gradient(135deg, #f0f7ff, #e6f1ff);
}

.status-icon {
  font-size: 32px;
}

.status-level {
  font-size: 18px;
  font-weight: 700;
  color: #303133;
}

.status-expire {
  font-size: 13px;
  color: #909399;
  margin-top: 4px;
}

.plans-section {
  margin-bottom: 32px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 16px;
}

.plans-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.plan-card {
  background: #fff;
  border-radius: 12px;
  padding: 24px 16px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  position: relative;
  border: 2px solid transparent;
}

.plan-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
}

.plan-card.featured {
  border-color: #e6a23c;
}

.plan-badge {
  position: absolute;
  top: -10px;
  left: 50%;
  transform: translateX(-50%);
  background: #e6a23c;
  color: #fff;
  font-size: 11px;
  padding: 2px 12px;
  border-radius: 10px;
}

.plan-name {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.plan-price {
  margin: 12px 0 4px;
  color: #f56c6c;
}

.price-symbol {
  font-size: 14px;
}

.price-num {
  font-size: 32px;
  font-weight: 700;
}

.plan-period {
  font-size: 12px;
  color: #c0c4cc;
  margin-bottom: 16px;
}

.plan-features {
  text-align: left;
  margin-bottom: 16px;
}

.feature-item {
  font-size: 12px;
  color: #606266;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.check {
  color: #67c23a;
  font-weight: 700;
}

.plan-btn {
  width: 100%;
}

.orders-section {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}

.pay-dialog-content {
  text-align: center;
  padding: 12px 0;
}

.pay-plan-name {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.pay-amount {
  margin: 16px 0;
  color: #f56c6c;
}

.pay-symbol {
  font-size: 16px;
}

.pay-price {
  font-size: 36px;
  font-weight: 700;
}

.pay-methods {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-top: 16px;
}

.pay-method {
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  padding: 10px 20px;
  font-size: 14px;
  color: #606266;
  cursor: pointer;
  transition: all 0.2s;
}

.pay-method:hover {
  border-color: #409eff;
  color: #409eff;
}

.pay-method.active {
  border-color: #67c23a;
  background: #f0f9eb;
  color: #67c23a;
}

.pay-icon {
  margin-right: 4px;
}

@media (max-width: 768px) {
  .page-wrapper { padding: 12px; }
  .page-title { font-size: 20px; }
  .plans-grid { grid-template-columns: repeat(2, 1fr); }
  .plan-card { padding: 16px 12px; }
  .price-num { font-size: 26px; }
  .pay-methods { flex-direction: column; }
}
</style>
