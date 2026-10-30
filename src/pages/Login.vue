<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-header">
        <h1 class="login-title">申论AI智能评分</h1>
        <p class="login-subtitle">AI辅助批改申论作答，生成得分与优化建议</p>
      </div>

      <div class="role-switch">
        <div class="role-btn" :class="{ active: role === 'user' }" @click="switchRole('user')">
          <span class="role-icon">👤</span> 用户登录
        </div>
        <div class="role-btn" :class="{ active: role === 'admin' }" @click="switchRole('admin')">
          <span class="role-icon">🛡️</span> 管理员登录
        </div>
      </div>

      <el-tabs v-model="activeTab" stretch>
        <el-tab-pane label="登录" name="login">
          <el-form ref="loginFormRef" :model="loginForm" :rules="loginRules" label-width="0">
            <el-form-item prop="email">
              <el-input v-model="loginForm.email" :placeholder="role === 'admin' ? '管理员邮箱' : '请输入邮箱'" size="large" prefix-icon="Message" />
            </el-form-item>
            <el-form-item prop="password">
              <el-input v-model="loginForm.password" type="password" placeholder="请输入密码" size="large" prefix-icon="Lock" show-password @keyup.enter="handleLogin" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" size="large" :loading="loading" @click="handleLogin" class="submit-btn">
                {{ role === 'admin' ? '管理员登录' : '登录' }}
              </el-button>
            </el-form-item>
          </el-form>
          <div class="forgot-password" @click="openResetDialog" v-if="role === 'user'">忘记密码？</div>
        </el-tab-pane>

        <el-tab-pane label="注册" name="register" v-if="role === 'user'">
          <el-form ref="registerFormRef" :model="registerForm" :rules="registerRules" label-width="0">
            <el-form-item prop="nickname">
              <el-input v-model="registerForm.nickname" placeholder="请输入昵称" size="large" prefix-icon="User" />
            </el-form-item>
            <el-form-item prop="email">
              <el-input v-model="registerForm.email" placeholder="请输入邮箱" size="large" prefix-icon="Message" />
            </el-form-item>
            <el-form-item prop="password">
              <el-input v-model="registerForm.password" type="password" placeholder="请输入密码（至少6位）" size="large" prefix-icon="Lock" show-password />
            </el-form-item>
            <el-form-item prop="confirmPassword">
              <el-input v-model="registerForm.confirmPassword" type="password" placeholder="请确认密码" size="large" prefix-icon="Lock" show-password @keyup.enter="handleRegister" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" size="large" :loading="loading" @click="handleRegister" class="submit-btn">
                注册
              </el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>

      <div class="login-tips">
        <p v-if="role === 'user'">未注册用户可直接注册，注册即自动登录</p>
        <p v-else>管理员账号由系统预置，如需管理员权限请联系系统管理员</p>
      </div>
    </div>

    <footer class="login-footer">
      <p>本系统仅AI辅助练习，分数仅供参考，不作为官方考试依据</p>
    </footer>

    <!-- 找回密码弹窗 -->
    <el-dialog v-model="resetDialogVisible" title="找回密码" width="360px">
      <el-steps :active="resetStep" align-center class="reset-steps">
        <el-step title="验证邮箱" />
        <el-step title="设置新密码" />
        <el-step title="完成" />
      </el-steps>

      <el-form v-if="resetStep === 0" ref="resetEmailFormRef" :model="resetForm" :rules="resetEmailRules" label-width="0">
        <el-form-item prop="email">
          <el-input v-model="resetForm.email" placeholder="请输入注册邮箱" size="large" prefix-icon="Message" />
        </el-form-item>
        <el-button type="primary" size="large" class="submit-btn" :loading="resetLoading" @click="verifyEmail">下一步</el-button>
      </el-form>

      <el-form v-else-if="resetStep === 1" ref="resetPwdFormRef" :model="resetForm" :rules="resetPwdRules" label-width="0">
        <el-form-item prop="newPassword">
          <el-input v-model="resetForm.newPassword" type="password" placeholder="新密码（至少6位）" size="large" prefix-icon="Lock" show-password />
        </el-form-item>
        <el-form-item prop="confirmPassword">
          <el-input v-model="resetForm.confirmPassword" type="password" placeholder="确认新密码" size="large" prefix-icon="Lock" show-password @keyup.enter="handleResetPassword" />
        </el-form-item>
        <el-button type="primary" size="large" class="submit-btn" :loading="resetLoading" @click="handleResetPassword">确认重置</el-button>
      </el-form>

      <div v-else class="reset-success">
        <div class="success-icon">✅</div>
        <p>密码重置成功！请使用新密码登录</p>
        <el-button type="primary" @click="closeResetDialog">去登录</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import axios from 'axios'
import { useAuthStore } from '@/stores/auth'

const ADMIN_EMAILS = ['admin@shenlun.com']
const IS_DEV = import.meta.env.DEV
const ENV_ID = 'shenlun-d4gplnd59018378c0'
const API_BASE = `https://${ENV_ID}-1473604851.ap-shanghai.app.tcloudbase.com`
const AUTH_API = IS_DEV ? '/api/auth-api' : `${API_BASE}/api/auth-api`

const router = useRouter()
const authStore = useAuthStore()

const role = ref('user')
const activeTab = ref('login')
const loading = ref(false)
const loginFormRef = ref()
const registerFormRef = ref()

const resetDialogVisible = ref(false)
const resetStep = ref(0)
const resetLoading = ref(false)
const resetEmailFormRef = ref()
const resetPwdFormRef = ref()
const resetForm = reactive({ email: '', newPassword: '', confirmPassword: '' })

const resetEmailRules = {
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' }
  ]
}

const resetPwdRules = {
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码至少6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== resetForm.newPassword) callback(new Error('两次输入密码不一致'))
        else callback()
      },
      trigger: 'blur'
    }
  ]
}

const loginForm = reactive({
  email: '',
  password: ''
})

const registerForm = reactive({
  nickname: '',
  email: '',
  password: '',
  confirmPassword: ''
})

const loginRules = {
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少6位', trigger: 'blur' }
  ]
}

const registerRules = {
  nickname: [
    { required: true, message: '请输入昵称', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少6位', trigger: 'blur' }
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== registerForm.password) {
          callback(new Error('两次输入密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur'
    }
  ]
}

function switchRole(r) {
  role.value = r
  activeTab.value = 'login'
}

async function handleLogin() {
  await loginFormRef.value.validate(async (valid) => {
    if (!valid) return
    loading.value = true
    try {
      const user = await authStore.login(loginForm.email, loginForm.password)

      if (role.value === 'admin' && !ADMIN_EMAILS.includes(user.email)) {
        authStore.logout()
        ElMessage.error('该账号非管理员，请使用用户登录')
        return
      }

      ElMessage.success('登录成功')
      router.push('/')
    } catch (e) {
      let msg = e.response?.data?.error_description || e.response?.data?.msg || e.message || ''
      if (msg.includes('Invalid credentials') || msg.includes('invalid')) {
        msg = '邮箱或密码错误'
      } else if (msg.length > 100) {
        msg = '登录失败，请检查邮箱和密码'
      }
      ElMessage.error(msg)
    } finally {
      loading.value = false
    }
  })
}

async function handleRegister() {
  await registerFormRef.value.validate(async (valid) => {
    if (!valid) return
    loading.value = true
    try {
      await authStore.register(registerForm.email, registerForm.password, registerForm.nickname)
      ElMessage.success('注册成功，已自动登录')
      router.push('/')
    } catch (e) {
      let msg = e.response?.data?.error_description || e.response?.data?.msg || e.message || ''
      if (msg.includes('already') || msg.includes('registered') || msg.includes('exists')) {
        msg = '该邮箱已注册，请直接登录'
      } else if (msg.includes('rate') || msg.includes('limit')) {
        msg = '操作过于频繁，请稍后再试'
      } else if (msg.includes('weak') || msg.includes('password')) {
        msg = '密码强度不足，请使用更复杂的密码'
      } else if (msg.length > 100) {
        msg = '注册失败，请检查网络后重试'
      }
      ElMessage.error(msg)
    } finally {
      loading.value = false
    }
  })
}

function openResetDialog() {
  resetDialogVisible.value = true
  resetStep.value = 0
  resetForm.email = loginForm.email || ''
  resetForm.newPassword = ''
  resetForm.confirmPassword = ''
}

function closeResetDialog() {
  resetDialogVisible.value = false
  loginForm.email = resetForm.email
  loginForm.password = ''
  activeTab.value = 'login'
}

async function verifyEmail() {
  await resetEmailFormRef.value.validate(async (valid) => {
    if (!valid) return
    resetLoading.value = true
    try {
      const { data } = await axios.post(AUTH_API, {
        action: 'resetPassword',
        email: resetForm.email,
        newPassword: '__check_exists__'
      })
      if (data.error && data.error === '该邮箱未注册') {
        ElMessage.error('该邮箱未注册')
        return
      }
      resetStep.value = 1
      ElMessage.success('邮箱验证通过，请设置新密码')
    } catch (e) {
      ElMessage.error('验证失败，请检查网络')
    } finally {
      resetLoading.value = false
    }
  })
}

async function handleResetPassword() {
  await resetPwdFormRef.value.validate(async (valid) => {
    if (!valid) return
    resetLoading.value = true
    try {
      const { data } = await axios.post(AUTH_API, {
        action: 'resetPassword',
        email: resetForm.email,
        newPassword: resetForm.newPassword
      })
      if (data.error) {
        ElMessage.error(data.error)
        return
      }
      resetStep.value = 2
      ElMessage.success('密码重置成功')
    } catch (e) {
      ElMessage.error('重置失败，请检查网络')
    } finally {
      resetLoading.value = false
    }
  })
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e7eb 100%);
  padding: 20px;
}

.login-card {
  width: 100%;
  max-width: 420px;
  background: #fff;
  border-radius: 20px;
  padding: 40px 32px 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
}

.login-header {
  text-align: center;
  margin-bottom: 24px;
}

.login-title {
  font-size: 26px;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0;
  letter-spacing: 1px;
}

.login-subtitle {
  font-size: 13px;
  color: #909399;
  margin: 8px 0 0;
}

.role-switch {
  display: flex;
  gap: 0;
  margin-bottom: 24px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #e4e7ed;
}

.role-btn {
  flex: 1;
  text-align: center;
  padding: 12px 0;
  font-size: 14px;
  font-weight: 500;
  color: #606266;
  cursor: pointer;
  transition: all 0.25s;
  background: #f5f7fa;
  user-select: none;
}

.role-btn:hover {
  color: #409eff;
}

.role-btn.active {
  background: linear-gradient(135deg, #409eff, #66b1ff);
  color: #fff;
}

.role-icon {
  margin-right: 4px;
}

.submit-btn {
  width: 100%;
}

.login-tips {
  text-align: center;
  margin-top: 16px;
}

.login-tips p {
  font-size: 12px;
  color: #c0c4cc;
}

.login-footer {
  margin-top: 32px;
  text-align: center;
}

.login-footer p {
  font-size: 12px;
  color: #c0c4cc;
}

@media (max-width: 768px) {
  .login-card {
    padding: 28px 20px 20px;
  }

  .login-title {
    font-size: 22px;
  }

  .role-btn {
    font-size: 13px;
    padding: 10px 0;
  }
}

.forgot-password {
  text-align: right;
  font-size: 13px;
  color: #409eff;
  cursor: pointer;
  margin-top: -8px;
  user-select: none;
}

.forgot-password:hover {
  text-decoration: underline;
}

.reset-steps {
  margin-bottom: 24px;
}

.reset-success {
  text-align: center;
  padding: 20px 0;
}

.success-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.reset-success p {
  font-size: 14px;
  color: #606266;
  margin-bottom: 16px;
}
</style>
