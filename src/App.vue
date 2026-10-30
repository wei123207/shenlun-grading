<template>
  <div id="app" :class="{ 'is-mobile': isMobile, 'has-bottom-nav': showNav && isMobile }">
    <!-- 桌面端顶部导航 -->
    <nav v-if="showNav && !isMobile" class="nav-bar">
      <div class="nav-container">
        <div class="nav-brand" @click="goHome">
          <span class="nav-logo">申论AI评分</span>
        </div>
        <div class="nav-links">
          <router-link to="/" class="nav-link" :class="{ active: currentRoute === 'SelectQuestion' }">
            首页
          </router-link>
          <router-link to="/recommend" class="nav-link" :class="{ active: currentRoute === 'Recommend' }" v-if="authStore.isLoggedIn">
            推荐
          </router-link>
          <router-link to="/community" class="nav-link" :class="{ active: currentRoute === 'Community' }" v-if="authStore.isLoggedIn">
            社区
          </router-link>
          <template v-if="authStore.isLoggedIn">//登录显现
            <div class="nav-dropdown">
              <span class="nav-link" :class="{ active: ['Records','WrongBook','Favorites'].includes(currentRoute) }">
                我的练习 ▾
              </span>
              <div class="dropdown-menu">
                <router-link to="/records" class="dropdown-item">批改记录</router-link>
                <router-link to="/wrong-book" class="dropdown-item">错题本</router-link>
                <router-link to="/favorites" class="dropdown-item">我的收藏</router-link>
              </div>
            </div>
            <router-link to="/notifications" class="nav-link" :class="{ active: currentRoute === 'Notifications' }">
              消息
              <span v-if="unreadCount > 0" class="nav-badge">{{ unreadCount }}</span>
            </router-link>
            <router-link to="/membership" class="nav-link" :class="{ active: currentRoute === 'Membership' }">
              <span v-if="isVip" class="vip-badge">VIP</span>
              会员
            </router-link>
            <router-link to="/profile" class="nav-link" :class="{ active: currentRoute === 'Profile' }">
              个人中心
            </router-link>
            <router-link v-if="authStore.isAdmin" to="/admin" class="nav-link" :class="{ active: currentRoute === 'Admin' }">
              后台
            </router-link>
            <span class="nav-user">{{ authStore.user?.nickname }}</span>
          </template>
          <router-link v-else to="/login" class="nav-link nav-login-btn">//L-19 v-else
            登录/注册
          </router-link>
        </div>
      </div>
    </nav>

    <!-- 移动端顶部标题栏 -->
    <header v-if="showNav && isMobile" class="mobile-header">
      <span class="mobile-header-title">{{ pageTitle }}</span>
      <router-link v-if="authStore.isAdmin && currentRoute !== 'Admin'" to="/admin" class="mobile-admin-btn">管理</router-link>
    </header>

    <router-view />

    <footer v-if="showNav && !isMobile" class="site-footer">
      <p>本系统仅AI辅助练习，分数仅供参考，不作为官方考试依据</p>
    </footer>

    <!-- 移动端底部Tab导航 -->
    <nav v-if="showNav && isMobile" class="mobile-tab-bar">
      <router-link to="/" class="tab-item" :class="{ active: currentRoute === 'SelectQuestion' }">
        <span class="tab-icon">🏠</span>
        <span class="tab-label">首页</span>
      </router-link>
      <router-link v-if="authStore.isLoggedIn" to="/records" class="tab-item" :class="{ active: ['Records','WrongBook','Favorites'].includes(currentRoute) }">
        <span class="tab-icon">📝</span>
        <span class="tab-label">练习</span>
      </router-link>
      <div class="tab-item tab-ai" @click="openAIAssistant">
        <span class="tab-icon tab-ai-icon">🤖</span>
        <span class="tab-label">AI</span>
      </div>
      <router-link v-if="authStore.isLoggedIn" to="/community" class="tab-item" :class="{ active: currentRoute === 'Community' }">
        <span class="tab-icon">💬</span>
        <span class="tab-label">社区</span>
      </router-link>
      <router-link v-if="authStore.isLoggedIn" to="/profile" class="tab-item" :class="{ active: ['Profile','Notifications','Membership'].includes(currentRoute) }">
        <span class="tab-icon">👤</span>
        <span v-if="unreadCount > 0" class="tab-badge">{{ unreadCount }}</span>
        <span class="tab-label">我的</span>
      </router-link>
      <router-link v-if="!authStore.isLoggedIn" to="/login" class="tab-item" :class="{ active: currentRoute === 'Login' }">
        <span class="tab-icon">🔑</span>
        <span class="tab-label">登录</span>
      </router-link>
    </nav>

    <AIAssistant ref="aiAssistantRef" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getUnreadCount, initSystemNotifications } from '@/api/notifications'
import { getMembershipStatus } from '@/api/membership'
import AIAssistant from '@/components/AIAssistant.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const unreadCount = ref(0)
const isVip = ref(false)
const isMobile = ref(false)
const aiAssistantRef = ref(null)

const showNav = computed(() => route.meta.showNav !== false)
const currentRoute = computed(() => route.name)

const pageTitle = computed(() => {
  const titles = {
    SelectQuestion: '申论AI评分',
    Recommend: '智能推荐',
    Community: '社区',
    Records: '批改记录',
    WrongBook: '错题本',
    Favorites: '我的收藏',
    Notifications: '消息通知',
    Membership: '会员中心',
    Profile: '个人中心',
    Admin: '后台管理',
    Login: '登录'
  }
  return titles[currentRoute.value] || '申论AI评分'
})

function checkMobile() {
  isMobile.value = window.innerWidth <= 768
}

async function refreshUnread() {
  if (authStore.isLoggedIn) {
    const userId = authStore.user?.id || authStore.user?.email
    initSystemNotifications(userId)
    unreadCount.value = await getUnreadCount(userId)
    const m = getMembershipStatus()
    isVip.value = m.level === 'vip'
  } else {
    isVip.value = false
  }
}

function openAIAssistant() {
  if (aiAssistantRef.value) {
    aiAssistantRef.value.openPanel()
  }
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
  refreshUnread()
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

watch(() => route.name, () => {
  refreshUnread()
})

function goHome() {
  router.push('/')
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background-color: #f5f6f8;
  color: #303133;
}

#app {
  min-height: 100vh;
}

/* ====== 桌面端导航栏 ====== */
.nav-bar {
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 0 20px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.nav-brand { cursor: pointer; }

.nav-logo {
  font-size: 18px;
  font-weight: 700;
  color: #1a1a2e;
  letter-spacing: 1px;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 4px;
}

.nav-link {
  font-size: 14px;
  color: #606266;
  text-decoration: none;
  padding: 8px 16px;
  border-radius: 8px;
  transition: all 0.2s;
}

.nav-link:hover { background: #f0f2f5; color: #303133; }
.nav-link.active { color: #409eff; background: #ecf5ff; }
.nav-login-btn { background: #409eff; color: #fff !important; }
.nav-login-btn:hover { background: #66b1ff; }

.nav-user {
  font-size: 13px;
  color: #909399;
  padding: 4px 12px;
  background: #f0f2f5;
  border-radius: 12px;
}

.nav-dropdown { position: relative; }
.nav-dropdown:hover .dropdown-menu { display: block; }

.dropdown-menu {
  display: none;
  position: absolute;
  top: 100%;
  left: 0;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  overflow: hidden;
  min-width: 120px;
  z-index: 200;
}

.dropdown-item {
  display: block;
  padding: 10px 16px;
  font-size: 13px;
  color: #606266;
  text-decoration: none;
  transition: background 0.2s;
}

.dropdown-item:hover { background: #f0f2f5; color: #409eff; }

.nav-badge {
  display: inline-block;
  background: #f56c6c;
  color: #fff !important;
  font-size: 10px;
  border-radius: 10px;
  padding: 1px 6px;
  margin-left: 4px;
  min-width: 16px;
  text-align: center;
}

.vip-badge {
  display: inline-block;
  background: linear-gradient(135deg, #e6a23c, #f56c6c);
  color: #fff !important;
  font-size: 9px;
  font-weight: 700;
  border-radius: 3px;
  padding: 1px 4px;
  margin-right: 2px;
}

.site-footer {
  text-align: center;
  padding: 24px 20px;
  margin-top: 20px;
}

.site-footer p {
  font-size: 12px;
  color: #c0c4cc;
}

/* ====== 移动端顶部标题栏 ====== */
.mobile-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: #fff;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  border-bottom: 1px solid #f0f0f0;
}

.mobile-header-title {
  font-size: 17px;
  font-weight: 600;
  color: #1a1a2e;
}

.mobile-admin-btn {
  position: absolute;
  right: 16px;
  font-size: 13px;
  color: #409eff;
  text-decoration: none;
}

/* ====== 移动端底部Tab栏 ====== */
.mobile-tab-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60px;
  background: #fff;
  display: flex;
  align-items: stretch;
  box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.08);
  z-index: 999;
  padding-bottom: env(safe-area-inset-bottom);
}

.tab-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  color: #909399;
  position: relative;
  transition: color 0.2s;
  gap: 2px;
}

.tab-item.active {
  color: #409eff;
}

.tab-icon {
  font-size: 22px;
  line-height: 1;
}

.tab-label {
  font-size: 10px;
  line-height: 1;
}

.tab-ai {
  cursor: pointer;
}

.tab-ai-icon {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: linear-gradient(135deg, #409eff, #36cfc9);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  margin-top: -20px;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.4);
}

.tab-badge {
  position: absolute;
  top: 6px;
  right: 50%;
  margin-right: -20px;
  background: #f56c6c;
  color: #fff;
  font-size: 9px;
  border-radius: 10px;
  padding: 1px 5px;
  min-width: 14px;
  text-align: center;
}

/* 移动端底部留空，避免被Tab栏遮挡 */
#app.has-bottom-nav {
  padding-bottom: 70px;
}

/* ====== 移动端全局响应式 ====== */
@media (max-width: 768px) {
  .el-form--inline .el-form-item {
    display: flex;
    margin-right: 0;
    margin-bottom: 12px;
    width: 100%;
  }

  .el-form--inline .el-form-item .el-select {
    width: 100% !important;
  }

  .el-card {
    --el-card-padding: 12px;
  }

  .el-card__body {
    padding: 12px !important;
  }

  .el-textarea__inner {
    font-size: 15px !important;
    line-height: 1.6 !important;
  }

  .el-message {
    min-width: 90% !important;
  }

  .el-tabs__item {
    font-size: 14px;
    padding: 0 12px !important;
  }

  .page-wrapper {
    padding: 12px !important;
  }

  .page-header {
    margin-bottom: 12px !important;
  }

  .page-title {
    font-size: 20px !important;
  }

  .page-subtitle {
    font-size: 13px !important;
  }

  .el-table {
    font-size: 13px !important;
  }

  .el-button {
    font-size: 14px !important;
  }

  .el-dialog {
    width: 92% !important;
    margin: 0 auto !important;
  }

  .el-pagination {
    justify-content: center;
  }

  .ai-panel {
    width: 100% !important;
  }
}
</style>
