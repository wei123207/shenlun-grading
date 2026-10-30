import { createRouter, createWebHistory } from 'vue-router'
import { isLoggedIn } from '@/api/auth'

const ADMIN_EMAILS = ['admin@shenlun.com']

function isAdmin() {
  try {
    const raw = localStorage.getItem('sl_user')
    if (!raw) return false
    const user = JSON.parse(raw)
    return ADMIN_EMAILS.includes(user.email)
  } catch (e) {
    return false
  }
}

const SelectQuestion = () => import('@/pages/SelectQuestion.vue')
const Answer = () => import('@/pages/Answer.vue')
const Result = () => import('@/pages/Result.vue')
const Login = () => import('@/pages/Login.vue')
const Records = () => import('@/pages/Records.vue')
const Profile = () => import('@/pages/Profile.vue')
const WrongBook = () => import('@/pages/WrongBook.vue')
const Favorites = () => import('@/pages/Favorites.vue')
const Notifications = () => import('@/pages/Notifications.vue')
const Admin = () => import('@/pages/Admin.vue')
const Membership = () => import('@/pages/Membership.vue')
const Recommend = () => import('@/pages/Recommend.vue')
const Community = () => import('@/pages/Community.vue')

const routes = [
  {
    path: '/',
    name: 'SelectQuestion',
    component: SelectQuestion,
    meta: { showNav: true }
  },
  {
    path: '/answer',
    name: 'Answer',
    component: Answer,
    meta: { showNav: false, requiresAuth: true }
  },
  {
    path: '/result',
    name: 'Result',
    component: Result,
    meta: { showNav: false, requiresAuth: true }
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
    meta: { showNav: false }
  },
  {
    path: '/records',
    name: 'Records',
    component: Records,
    meta: { showNav: true, requiresAuth: true }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: Profile,
    meta: { showNav: true, requiresAuth: true }
  },
  {
    path: '/wrong-book',
    name: 'WrongBook',
    component: WrongBook,
    meta: { showNav: true, requiresAuth: true }
  },
  {
    path: '/favorites',
    name: 'Favorites',
    component: Favorites,
    meta: { showNav: true, requiresAuth: true }
  },
  {
    path: '/notifications',
    name: 'Notifications',
    component: Notifications,
    meta: { showNav: true, requiresAuth: true }
  },
  {
    path: '/admin',
    name: 'Admin',
    component: Admin,
    meta: { showNav: true, requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/membership',
    name: 'Membership',
    component: Membership,
    meta: { showNav: true, requiresAuth: true }
  },
  {
    path: '/recommend',
    name: 'Recommend',
    component: Recommend,
    meta: { showNav: true, requiresAuth: true }
  },
  {
    path: '/community',
    name: 'Community',
    component: Community,
    meta: { showNav: true, requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  }
})

router.beforeEach((to, from, next) => {
  if (to.meta.requiresAuth && !isLoggedIn()) {
    next({ name: 'Login' })
  } else if (to.meta.requiresAdmin && !isAdmin()) {
    next({ name: 'SelectQuestion' })
  } else if (to.name === 'Login' && isLoggedIn()) {
    next({ name: 'SelectQuestion' })
  } else {
    next()
  }
})

export default router
