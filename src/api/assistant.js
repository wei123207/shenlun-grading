function getKey(userId) {
  return `sl_chat_history_${userId}`
}

export function getChatHistory(userId) {
  const raw = localStorage.getItem(getKey(userId))
  if (!raw) return []
  try {
    const list = JSON.parse(raw)
    return Array.isArray(list) ? list : []
  } catch (e) {
    return []
  }
}

export function saveChatMessage(userId, role, content) {
  const list = getChatHistory(userId)
  list.push({ role, content, time: Date.now() })
  // 最多保留50条
  if (list.length > 50) {
    list.splice(0, list.length - 50)
  }
  localStorage.setItem(getKey(userId), JSON.stringify(list))
}

export function clearChatHistory(userId) {
  localStorage.removeItem(getKey(userId))
}
