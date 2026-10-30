import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login as apiLogin, register as apiRegister, logout as apiLogout, getCurrentUser } from '@/api/auth'
import { setCurrentUser } from '@/api/membership'

const ADMIN_EMAILS = ['admin@shenlun.com']

export const useAuthStore = defineStore('auth', () => {
  const user = ref(getCurrentUser())
  const isLoggedIn = computed(() => !!user.value)
  const isAdmin = computed(() => {
    if (!user.value) return false
    return ADMIN_EMAILS.includes(user.value.email)
  })

  async function login(email, password) {
    const u = await apiLogin(email, password)
    setCurrentUser(u)
    user.value = u
    return u
  }

  async function register(email, password, nickname) {
    const u = await apiRegister(email, password, nickname)
    setCurrentUser(u)
    user.value = u
    return u
  }

  function logout() {
    setCurrentUser(null)
    apiLogout()
    user.value = null
  }

  return { user, isLoggedIn, isAdmin, login, register, logout }
})
