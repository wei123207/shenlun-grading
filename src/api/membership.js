const FREE_DAILY_LIMIT = 3

function getDateKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getCurrentUserKey() {
  const raw = localStorage.getItem('sl_current_user')
  if (raw) {
    try {
      const user = JSON.parse(raw)
      return user.id || user.email || 'guest'
    } catch (e) {}
  }
  return 'guest'
}

function getLocalUsage() {
  const userKey = getCurrentUserKey()
  const raw = localStorage.getItem(`sl_grading_usage_${userKey}`)
  const data = raw ? JSON.parse(raw) : {}
  const today = getDateKey()
  if (data.date !== today) {
    return { date: today, count: 0 }
  }
  return data
}

function saveLocalUsage(data) {
  const userKey = getCurrentUserKey()
  localStorage.setItem(`sl_grading_usage_${userKey}`, JSON.stringify(data))
}

function getLocalMembership() {
  const userKey = getCurrentUserKey()
  const raw = localStorage.getItem(`sl_membership_${userKey}`)
  return raw ? JSON.parse(raw) : { level: 'free', expireAt: null }
}

function saveLocalMembership(data) {
  const userKey = getCurrentUserKey()
  localStorage.setItem(`sl_membership_${userKey}`, JSON.stringify(data))
}

export function setCurrentUser(user) {
  if (user) {
    localStorage.setItem('sl_current_user', JSON.stringify({
      id: user.id,
      email: user.email
    }))
  } else {
    localStorage.removeItem('sl_current_user')
  }
}

export function getMembershipStatus() {
  const m = getLocalMembership()
  if (m.level === 'vip' && m.expireAt) {
    if (new Date(m.expireAt) < new Date()) {
      saveLocalMembership({ level: 'free', expireAt: null })
      return { level: 'free', expireAt: null }
    }
  }
  return m
}

export function getRemainingGrades() {
  const m = getMembershipStatus()
  if (m.level === 'vip') return { unlimited: true, remaining: -1, used: 0, limit: 0 }
  const usage = getLocalUsage()
  const remaining = Math.max(0, FREE_DAILY_LIMIT - usage.count)
  return { unlimited: false, remaining, used: usage.count, limit: FREE_DAILY_LIMIT }
}

export function incrementGradingUsage() {
  const m = getMembershipStatus()
  if (m.level === 'vip') return
  const usage = getLocalUsage()
  usage.count++
  saveLocalUsage(usage)
}

export function purchaseMembership(plan) {
  const plans = {
    monthly: { days: 30, price: 29, name: '月度会员' },
    quarterly: { days: 90, price: 79, name: '季度会员' },
    yearly: { days: 365, price: 199, name: '年度会员' },
    lifetime: { days: 36500, price: 499, name: '终身会员' }
  }
  const planInfo = plans[plan]
  if (!planInfo) throw new Error('未知套餐')

  const expire = new Date()
  expire.setDate(expire.getDate() + planInfo.days)
  saveLocalMembership({ level: 'vip', expireAt: expire.toISOString(), plan: planInfo.name })

  const userKey = getCurrentUserKey()
  const orders = JSON.parse(localStorage.getItem(`sl_orders_${userKey}`) || '[]')
  orders.unshift({
    id: 'order_' + Date.now(),
    plan: planInfo.name,
    amount: planInfo.price,
    pay_status: 'paid',
    pay_time: new Date().toISOString(),
    created_at: new Date().toISOString()
  })
  localStorage.setItem(`sl_orders_${userKey}`, JSON.stringify(orders.slice(0, 50)))

  return { level: 'vip', expireAt: expire.toISOString(), plan: planInfo.name }
}

export function getOrders() {
  const userKey = getCurrentUserKey()
  return JSON.parse(localStorage.getItem(`sl_orders_${userKey}`) || '[]')
}
