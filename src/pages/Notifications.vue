<template>
  <div class="page-wrapper">
    <div class="page-header">
      <h1 class="page-title">消息通知</h1>
      <div class="header-actions" v-if="notifList.length > 0">
        <el-button text size="small" @click="markAllRead">全部已读</el-button>
      </div>
    </div>

    <div v-if="loading" class="loading-box">
      <el-icon class="is-loading"><Loading /></el-icon>
      <span>加载中...</span>
    </div>

    <div v-else-if="notifList.length === 0" class="empty-box">
      <div class="empty-icon">📭</div>
      <p>暂无消息</p>
    </div>

    <div v-else class="notif-list">
      <div
        v-for="item in notifList"
        :key="item.id"
        class="notif-card"
        :class="{ unread: !item.is_read }"
        @click="readNotif(item)"
      >
        <div class="notif-icon">
          <span v-if="item.type === 'system'">📢</span>
          <span v-else-if="item.type === 'grading'">✅</span>
          <span v-else-if="item.type === 'study'">📚</span>
          <span v-else>🔔</span>
        </div>
        <div class="notif-body">
          <div class="notif-title">{{ item.title }}</div>
          <div class="notif-content" v-if="item.content">{{ item.content }}</div>
          <div class="notif-time">{{ formatTime(item.created_at) }}</div>
        </div>
        <div class="notif-dot" v-if="!item.is_read"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { getNotifications, markAsRead, markAllAsRead, initSystemNotifications } from '@/api/notifications'
import { ElMessage } from 'element-plus'

const authStore = useAuthStore()

const loading = ref(true)
const notifList = ref([])

onMounted(async () => {
  await loadData()
})

async function loadData() {
  loading.value = true
  try {
    const userId = authStore.user?.id || authStore.user?.email
    initSystemNotifications(userId)
    notifList.value = await getNotifications(userId)
  } catch (e) {
    ElMessage.error('加载消息失败')
  } finally {
    loading.value = false
  }
}

async function readNotif(item) {
  if (!item.is_read) {
    await markAsRead(item.id)
    item.is_read = true
  }
}

async function markAllRead() {
  const userId = authStore.user?.id || authStore.user?.email
  await markAllAsRead(userId)
  notifList.value.forEach(n => n.is_read = true)
  ElMessage.success('全部已标为已读')
}

function formatTime(t) {
  if (!t) return ''
  const date = new Date(t)
  const now = new Date()
  const diff = (now - date) / 1000
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
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-title {
  font-size: 24px;
  font-weight: 700;
  color: #1a1a2e;
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

.notif-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.notif-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  gap: 12px;
  align-items: flex-start;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  cursor: pointer;
  transition: background 0.2s;
  position: relative;
}

.notif-card:hover {
  background: #fafafa;
}

.notif-card.unread {
  background: #f0f7ff;
}

.notif-card.unread:hover {
  background: #e6f1ff;
}

.notif-icon {
  font-size: 20px;
  flex-shrink: 0;
  width: 32px;
  text-align: center;
}

.notif-body {
  flex: 1;
}

.notif-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.notif-content {
  font-size: 13px;
  color: #909399;
  margin-top: 4px;
  line-height: 1.5;
}

.notif-time {
  font-size: 12px;
  color: #c0c4cc;
  margin-top: 6px;
}

.notif-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #f56c6c;
  flex-shrink: 0;
  margin-top: 6px;
}

@media (max-width: 768px) {
  .page-wrapper { padding: 12px; }
  .page-title { font-size: 20px; }
  .notif-card { padding: 12px; }
}
</style>
