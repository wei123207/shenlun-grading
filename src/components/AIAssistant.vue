<template>
  <div class="ai-assistant-wrap">
    <!-- 悬浮入口 -->
    <div
      ref="floatBtnRef"
      class="ai-float-btn"
      :class="{ 'has-dot': hasNewKnowledge }"
      @click="openPanel"
      @mousedown="startDrag"
    >
      <span class="float-icon">🤖</span>
      <span class="float-tooltip">AI助手</span>
    </div>

    <!-- 遮罩 -->
    <div v-if="visible" class="ai-mask" @click="closePanel"></div>

    <!-- 对话面板 -->
    <div class="ai-panel" :class="{ 'ai-panel-open': visible }">
      <!-- 顶部 -->
      <div class="ai-panel-header">
        <div class="ai-title">
          <span class="ai-title-icon">🤖</span>
          <span>申论AI助手</span>
        </div>
        <div class="ai-header-actions">
          <el-button text size="small" @click="clearChat" title="清空对话">
            <el-icon><delete /></el-icon>
          </el-button>
          <el-button text size="small" @click="closePanel" title="关闭">
            <el-icon><close /></el-icon>
          </el-button>
        </div>
      </div>

      <!-- 今日知识点卡片 -->
      <div v-if="todayKnowledge" class="daily-knowledge">
        <div class="dk-header">
          <span class="dk-tag">📌 今日积累</span>
          <span class="dk-category">{{ todayKnowledge.category }}</span>
        </div>
        <div class="dk-title">{{ todayKnowledge.title }}</div>
        <div class="dk-content">{{ todayKnowledge.content }}</div>
        <div v-if="todayKnowledge.example" class="dk-example">
          <span class="dk-example-label">示例：</span>
          {{ todayKnowledge.example }}
        </div>
      </div>

      <!-- 消息列表 -->
      <div ref="msgListRef" class="ai-message-list">
        <div v-for="(msg, idx) in messages" :key="idx" class="msg-item" :class="msg.role">
          <div v-if="msg.role === 'assistant'" class="msg-avatar">🤖</div>
          <div class="msg-bubble">
            <div v-if="msg.loading" class="typing">
              <span></span><span></span><span></span>
            </div>
            <template v-else>
              <div class="msg-content" v-html="formatMessage(msg.content)"></div>
              <div v-if="msg.relatedQuestions && msg.relatedQuestions.length > 0" class="related-questions">
                <div class="rq-label">相关问题：</div>
                <div class="rq-list">
                  <span
                    v-for="(q, i) in msg.relatedQuestions"
                    :key="i"
                    class="rq-tag"
                    @click="sendQuickQuestion(q)"
                  >{{ q }}</span>
                </div>
              </div>
            </template>
          </div>
          <div v-if="msg.role === 'user'" class="msg-avatar user-avatar">
            {{ userInitial }}
          </div>
        </div>
      </div>

      <!-- 快捷问题 -->
      <div class="quick-questions">
        <span
          v-for="q in visibleQuickQuestions"
          :key="q"
          class="quick-tag"
          @click="sendQuickQuestion(q)"
        >{{ q }}</span>
        <span v-if="!showMoreQuick" class="quick-tag more" @click="showMoreQuick = true">更多</span>
      </div>

      <!-- 输入区 -->
      <div class="ai-input-area">
        <el-input
          v-model="inputText"
          type="textarea"
          :rows="2"
          placeholder="输入你的申论问题，按Enter发送..."
          @keydown.enter.exact="handleSend"
          :disabled="loading"
        />
        <el-button
          type="primary"
          :loading="loading"
          @click="handleSend"
          class="send-btn"
        >发送</el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, Close } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { chatWithAssistant, getDailyKnowledge } from '@/api/ai'
import { getChatHistory, saveChatMessage, clearChatHistory } from '@/api/assistant'

const authStore = useAuthStore()
const visible = ref(false)
const loading = ref(false)
const inputText = ref('')
const messages = ref([])
const msgListRef = ref(null)
const showMoreQuick = ref(false)
const todayKnowledge = ref(null)
const hasNewKnowledge = ref(false)

const floatBtnRef = ref(null)
let dragState = { dragging: false, startX: 0, startY: 0, btnX: 0, btnY: 0 }

const quickQuestions = [
  '归纳概括题答题格式',
  '对策题高分要点',
  '议论文标准结构',
  '发言稿格式规范',
  '应用文写作注意事项',
  '综合分析题怎么答',
  '倡议书格式',
  '大作文分论点怎么找'
]

const visibleQuickQuestions = computed(() => {
  return showMoreQuick.value ? quickQuestions : quickQuestions.slice(0, 5)
})

const userInitial = computed(() => {
  if (!authStore.user) return 'U'
  const name = authStore.user.nickname || authStore.user.email || 'U'
  return name.charAt(0).toUpperCase()
})

function openPanel() {
  if (dragState.dragging) return
  visible.value = true
  hasNewKnowledge.value = false
  loadHistory()
  nextTick(scrollToBottom)
}

function closePanel() {
  visible.value = false
}

function formatMessage(text) {
  return text
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^\d+\.\s/gm, (m) => `<br>${m}`)
}

function extractRelatedQuestions(text) {
  const match = text.match(/相关问题[：:][\s\S]*$/)
  if (!match) return []
  const qs = match[0].replace(/相关问题[：:]/, '').trim()
  return qs.split(/[、,，\n]/).map(s => s.replace(/^\d+\.\s*/, '').trim()).filter(s => s && s.length > 3).slice(0, 3)
}

async function handleSend() {
  const text = inputText.value.trim()
  if (!text || loading.value) return
  await sendMessage(text)
}

async function sendQuickQuestion(q) {
  if (loading.value) return
  await sendMessage(q)
}

async function sendMessage(text) {
  if (!authStore.isLoggedIn) {
    ElMessage.warning('请先登录再使用AI助手')
    return
  }

  loading.value = true
  inputText.value = ''

  // 用户消息
  const userMsg = { role: 'user', content: text }
  messages.value.push(userMsg)
  saveChatMessage(authStore.user.id, 'user', text)

  // AI加载中
  const loadingMsg = { role: 'assistant', content: '', loading: true }
  messages.value.push(loadingMsg)
  await nextTick()
  scrollToBottom()

  try {
    const history = messages.value
      .filter(m => !m.loading)
      .slice(-12)
      .map(m => ({ role: m.role, content: m.content }))

    const reply = await chatWithAssistant(text, history)
    const related = extractRelatedQuestions(reply)

    // 移除loading消息，替换为真实回复
    messages.value = messages.value.filter(m => !m.loading)
    messages.value.push({
      role: 'assistant',
      content: reply,
      relatedQuestions: related
    })
    saveChatMessage(authStore.user.id, 'assistant', reply)
  } catch (e) {
    messages.value = messages.value.filter(m => !m.loading)
    messages.value.push({
      role: 'assistant',
      content: '抱歉，回答失败了，请稍后再试。'
    })
    ElMessage.error('AI回答失败：' + e.message)
  } finally {
    loading.value = false
    await nextTick()
    scrollToBottom()
  }
}

function scrollToBottom() {
  if (msgListRef.value) {
    msgListRef.value.scrollTop = msgListRef.value.scrollHeight
  }
}

function loadHistory() {
  if (!authStore.isLoggedIn) return
  const history = getChatHistory(authStore.user.id)
  if (history.length > 0) {
    messages.value = history.map(m => ({ role: m.role, content: m.content }))
  } else {
    messages.value = [{
      role: 'assistant',
      content: '你好！我是申论AI助手，有什么申论问题可以问我~'
    }]
  }
}

async function clearChat() {
  try {
    await ElMessageBox.confirm('确定清空对话记录吗？', '确认', { type: 'warning' })
    messages.value = [{
      role: 'assistant',
      content: '你好！我是申论AI助手，有什么申论问题可以问我~'
    }]
    if (authStore.isLoggedIn) {
      clearChatHistory(authStore.user.id)
    }
    ElMessage.success('已清空')
  } catch (e) {}
}

async function loadDailyKnowledge() {
  try {
    const data = await getDailyKnowledge()
    if (data) {
      todayKnowledge.value = data
      // 检查是否是今日新的
      const today = new Date().toDateString()
      const lastSeen = localStorage.getItem('sl_knowledge_seen')
      if (lastSeen !== today) {
        hasNewKnowledge.value = true
      }
    }
  } catch (e) {}
}

// 拖拽功能
function startDrag(e) {
  const btn = floatBtnRef.value
  if (!btn) return
  const rect = btn.getBoundingClientRect()
  dragState = {
    dragging: false,
    startX: e.clientX,
    startY: e.clientY,
    btnX: rect.left,
    btnY: rect.top,
    moved: false
  }

  function onMove(ev) {
    const dx = ev.clientX - dragState.startX
    const dy = ev.clientY - dragState.startY
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      dragState.dragging = true
      dragState.moved = true
    }
    if (dragState.dragging) {
      const maxX = window.innerWidth - rect.width
      const maxY = window.innerHeight - rect.height
      let newX = dragState.btnX + dx
      let newY = dragState.btnY + dy
      newX = Math.max(0, Math.min(maxX, newX))
      newY = Math.max(0, Math.min(maxY, newY))
      btn.style.left = newX + 'px'
      btn.style.top = newY + 'px'
      btn.style.right = 'auto'
      btn.style.bottom = 'auto'
    }
  }

  function onUp() {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
    if (dragState.dragging) {
      // 吸附到最近边缘
      const rect2 = btn.getBoundingClientRect()
      const centerX = rect2.left + rect2.width / 2
      const screenCenter = window.innerWidth / 2
      if (centerX < screenCenter) {
        btn.style.left = '16px'
        btn.style.right = 'auto'
      } else {
        btn.style.right = '16px'
        btn.style.left = 'auto'
      }
    }
  }

  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

watch(() => authStore.isLoggedIn, (val) => {
  if (val) {
    loadHistory()
    loadDailyKnowledge()
  }
})

defineExpose({ openPanel })

onMounted(() => {
  if (authStore.isLoggedIn) {
    loadDailyKnowledge()
  }
})

onUnmounted(() => {
  // 记录今日知识点已查看
  if (todayKnowledge.value) {
    localStorage.setItem('sl_knowledge_seen', new Date().toDateString())
  }
})
</script>

<style scoped>
.ai-assistant-wrap {
  position: fixed;
  z-index: 2000;
  pointer-events: none;
}

.ai-float-btn {
  position: fixed;
  right: 20px;
  bottom: 80px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, #409eff, #36cfc9);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(64, 158, 255, 0.4);
  pointer-events: auto;
  transition: transform 0.2s, box-shadow 0.2s;
  user-select: none;
  z-index: 2001;
}

.ai-float-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 20px rgba(64, 158, 255, 0.5);
}

.ai-float-btn:hover .float-tooltip {
  opacity: 1;
  transform: translateX(-8px);
}

.float-icon {
  font-size: 28px;
}

.float-tooltip {
  position: absolute;
  right: 100%;
  top: 50%;
  transform: translateY(-50%) translateX(0);
  background: rgba(0, 0, 0, 0.75);
  color: #fff;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  white-space: nowrap;
  opacity: 0;
  transition: all 0.2s;
  margin-right: 8px;
  pointer-events: none;
}

.ai-float-btn.has-dot::after {
  content: '';
  position: absolute;
  top: 6px;
  right: 6px;
  width: 10px;
  height: 10px;
  background: #f56c6c;
  border-radius: 50%;
  border: 2px solid #fff;
}

.ai-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  pointer-events: auto;
  z-index: 2998;
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.ai-panel {
  position: fixed;
  top: 0;
  right: -400px;
  width: 380px;
  height: 100vh;
  height: 100dvh;
  background: #fff;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  pointer-events: auto;
  z-index: 3000;
  transition: right 0.3s ease;
}

.ai-panel-open {
  right: 0;
}

.ai-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.ai-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.ai-title-icon {
  font-size: 20px;
}

.ai-header-actions {
  display: flex;
  gap: 4px;
}

.daily-knowledge {
  background: linear-gradient(135deg, #fff9e6, #fff3d4);
  margin: 12px;
  padding: 12px 14px;
  border-radius: 10px;
  flex-shrink: 0;
}

.dk-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.dk-tag {
  font-size: 12px;
  font-weight: 600;
  color: #e6a23c;
}

.dk-category {
  font-size: 11px;
  color: #909399;
  background: #fff;
  padding: 1px 8px;
  border-radius: 10px;
}

.dk-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 6px;
}

.dk-content {
  font-size: 12px;
  color: #606266;
  line-height: 1.6;
}

.dk-example {
  margin-top: 6px;
  font-size: 12px;
  color: #909399;
  line-height: 1.5;
  background: rgba(255, 255, 255, 0.6);
  padding: 6px 8px;
  border-radius: 6px;
}

.dk-example-label {
  color: #e6a23c;
  font-weight: 600;
}

.ai-message-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.msg-item {
  display: flex;
  gap: 8px;
  align-items: flex-start;
}

.msg-item.user {
  flex-direction: row-reverse;
}

.msg-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #409eff, #36cfc9);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}

.user-avatar {
  background: linear-gradient(135deg, #67c23a, #85ce61);
  font-size: 13px;
  font-weight: 600;
}

.msg-bubble {
  max-width: 75%;
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 14px;
  line-height: 1.6;
  word-break: break-word;
}

.msg-item.assistant .msg-bubble {
  background: #f5f7fa;
  color: #303133;
  border-top-left-radius: 4px;
}

.msg-item.user .msg-bubble {
  background: #409eff;
  color: #fff;
  border-top-right-radius: 4px;
}

.msg-content {
  white-space: pre-wrap;
}

.msg-content :deep(strong) {
  font-weight: 700;
}

.typing {
  display: flex;
  gap: 4px;
  padding: 4px 0;
}

.typing span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #c0c4cc;
  animation: typingBounce 1.4s infinite ease-in-out both;
}

.typing span:nth-child(1) { animation-delay: -0.32s; }
.typing span:nth-child(2) { animation-delay: -0.16s; }

@keyframes typingBounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}

.related-questions {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid #ebeef5;
}

.rq-label {
  font-size: 11px;
  color: #909399;
  margin-bottom: 4px;
}

.rq-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.rq-tag {
  font-size: 11px;
  color: #409eff;
  background: #ecf5ff;
  padding: 2px 8px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.rq-tag:hover {
  background: #409eff;
  color: #fff;
}

.quick-questions {
  padding: 8px 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  border-top: 1px solid #f0f0f0;
  flex-shrink: 0;
}

.quick-tag {
  font-size: 12px;
  color: #606266;
  background: #f5f7fa;
  padding: 4px 10px;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.quick-tag:hover {
  background: #ecf5ff;
  color: #409eff;
}

.quick-tag.more {
  color: #909399;
  font-weight: 500;
}

.ai-input-area {
  padding: 10px 12px 12px;
  border-top: 1px solid #f0f0f0;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.send-btn {
  align-self: flex-end;
}

@media (max-width: 768px) {
  .ai-float-btn {
    width: 48px;
    height: 48px;
    right: 12px;
    bottom: 70px;
  }

  .float-icon {
    font-size: 22px;
  }

  .float-tooltip {
    display: none;
  }

  .ai-panel {
    width: 100%;
    right: -100%;
    z-index: 3001;
  }

  .ai-panel-open {
    right: 0;
  }

  .ai-mask {
    z-index: 3000;
  }
}
</style>
