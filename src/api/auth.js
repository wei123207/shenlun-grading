import axios from 'axios'

const IS_DEV = import.meta.env.DEV
const ENV_ID = 'shenlun-d4gplnd59018378c0'
const API_BASE = `https://${ENV_ID}-1473604851.ap-shanghai.app.tcloudbase.com`

const AUTH_API = IS_DEV ? '/api/auth-api' : `${API_BASE}/api/auth-api`

function saveUser(user, token) {
  localStorage.setItem('sl_access_token', token)
  localStorage.setItem('sl_user', JSON.stringify(user))
}

export async function register(email, password, nickname) {
  const { data } = await axios.post(AUTH_API, {
    action: 'signup',
    email,
    password,
    nickname
  })

  if (data.error) throw new Error(data.error)
  if (!data.token) throw new Error('注册失败：未获取到登录凭证')

  saveUser(data.user, data.token)
  return data.user
}

export async function login(email, password) {
  const { data } = await axios.post(AUTH_API, {
    action: 'login',
    email,
    password
  })

  if (data.error) throw new Error(data.error)
  if (!data.token) throw new Error('登录失败：未获取到登录凭证')

  saveUser(data.user, data.token)
  return data.user
}

export function logout() {
  localStorage.removeItem('sl_access_token')
  localStorage.removeItem('sl_user')
}

export function getCurrentUser() {
  const token = localStorage.getItem('sl_access_token') || ''
  const raw = localStorage.getItem('sl_user')
  if (!token || !raw) return null
  try {
    return JSON.parse(raw)
  } catch (e) {
    return null
  }
}

export function isLoggedIn() {
  return !!localStorage.getItem('sl_access_token')
}

export function getAuthHeaders() {
  const token = localStorage.getItem('sl_access_token')
  if (!token) return null
  return {
    'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
}
