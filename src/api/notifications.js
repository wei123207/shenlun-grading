function getLocalNotifications() {
  const raw = localStorage.getItem('sl_notifications')
  return raw ? JSON.parse(raw) : []
}

function saveLocalNotifications(items) {
  localStorage.setItem('sl_notifications', JSON.stringify(items))
}

export async function getNotifications(userId) {
  return getLocalNotifications().filter(n => n.user_id === userId)
}

export async function getUnreadCount(userId) {
  const list = await getNotifications(userId)
  return list.filter(n => !n.is_read).length
}

export async function markAsRead(id) {
  const list = getLocalNotifications()
  const item = list.find(n => n.id === id)
  if (item) {
    item.is_read = true
    saveLocalNotifications(list)
  }
}

export async function markAllAsRead(userId) {
  const list = getLocalNotifications()
  list.forEach(n => {
    if (n.user_id === userId) n.is_read = true
  })
  saveLocalNotifications(list)
}

export async function addNotification(userId, notif) {
  const list = getLocalNotifications()
  list.unshift({
    id: 'notif_' + Date.now(),
    user_id: userId,
    title: notif.title || '通知',
    content: notif.content || '',
    type: notif.type || 'system',
    is_read: false,
    priority: notif.priority || false,
    created_at: new Date().toISOString()
  })
  saveLocalNotifications(list.slice(0, 100))
}

export async function submitFeedback(userId, feedback, isVip) {
  const list = getLocalNotifications()
  list.unshift({
    id: 'feedback_' + Date.now(),
    user_id: userId,
    title: isVip ? '【VIP优先】用户反馈' : '用户反馈',
    content: feedback,
    type: 'feedback',
    is_read: false,
    priority: isVip || false,
    created_at: new Date().toISOString()
  })
  saveLocalNotifications(list.slice(0, 100))
}

export async function deleteNotification(id) {
  const list = getLocalNotifications()
  saveLocalNotifications(list.filter(n => n.id !== id))
}

export function initSystemNotifications(userId) {
  const existing = getLocalNotifications().filter(n => n.user_id === userId && n.type === 'system')
  if (existing.length === 0) {
    const defaultNotifs = [
      { title: '欢迎使用申论AI评分系统', content: '系统已上线，支持34个省份申论真题练习与AI智能评分。', type: 'system' },
      { title: '新功能：错题本已上线', content: '得分率低于60%的题目会自动加入错题本，方便重点复习。', type: 'system' },
      { title: '新功能：收藏功能已上线', content: '在选题页面可以收藏题目，方便后续练习。', type: 'system' }
    ]
    defaultNotifs.forEach(n => addNotification(userId, n))
  }
}
