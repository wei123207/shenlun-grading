// CloudBase 云函数: 用户认证
// 使用 Supabase Admin API (service_role) 直接创建用户，绕过邮件验证和频率限制
// 兼容 HTTP 触发器和 SDK callFunction

// 密钥通过云函数环境变量注入（CloudBase 控制台 → 函数配置 → 环境变量），切勿硬编码
const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
const ANON_KEY = process.env.SUPABASE_ANON_KEY

const ADMIN_EMAILS = ['admin@shenlun.com']

async function verifyAdmin(token) {
  if (!token) return { ok: false, error: '未提供认证凭证' }
  const resp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${token}`
    }
  })
  if (!resp.ok) return { ok: false, error: '认证失败' }
  const user = await resp.json()
  if (!user || !user.email) return { ok: false, error: '无法获取用户信息' }
  if (!ADMIN_EMAILS.includes(user.email)) return { ok: false, error: '无管理员权限' }
  return { ok: true, userId: user.id }
}

exports.main = async (event) => {
  let body
  if (typeof event.body === 'string') {
    try { body = JSON.parse(event.body) } catch (e) { body = {} }
  } else {
    body = event
  }

  const action = body.action || ''

  try {
    if (action === 'signup') {
      return await signup(body.email, body.password, body.nickname)
    } else if (action === 'login') {
      return await login(body.email, body.password)
    } else if (action === 'verify') {
      return await verify(body.token)
    } else if (action === 'listUsers') {
      const admin = await verifyAdmin(body.token)
      if (!admin.ok) return { error: admin.error }
      return await listUsers(body.page || 1, body.perPage || 50)
    } else if (action === 'deleteUser') {
      const admin = await verifyAdmin(body.token)
      if (!admin.ok) return { error: admin.error }
      if (admin.userId === body.uid) return { error: '不能删除自己' }
      return await deleteUser(body.uid)
    } else if (action === 'updateUser') {
      const admin = await verifyAdmin(body.token)
      if (!admin.ok) return { error: admin.error }
      if (admin.userId === body.uid && body.data && body.data.banned === true) {
        return { error: '不能封禁自己' }
      }
      return await updateUser(body.uid, body.data)
    } else if (action === 'changePassword') {
      return await changePassword(body.token, body.newPassword)
    } else if (action === 'resetPassword') {
      return await resetPassword(body.email, body.newPassword)
    } else {
      return { error: '未知操作: ' + action }
    }
  } catch (e) {
    return { error: '服务器错误：' + (e.message || JSON.stringify(e)) }
  }
}

async function signup(email, password, nickname) {
  // 1. 用 Admin API 直接创建用户
  const adminResp = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { nickname: nickname || email.split('@')[0] }
    })
  })

  if (!adminResp.ok) {
    const errText = await adminResp.text()
    let errMsg = errText
    try {
      const errJson = JSON.parse(errText)
      errMsg = errJson.msg || errJson.message || errJson.error_description || errText
    } catch (e) {}

    if (adminResp.status === 422 || errText.includes('already') || errText.includes('exists')) {
      return { error: '该邮箱已注册，请直接登录' }
    }
    return { error: '注册失败：' + String(errMsg).substring(0, 200) }
  }

  const adminData = await adminResp.json()
  if (!adminData || !adminData.id) {
    return { error: '注册失败：未返回用户ID' }
  }

  // 2. 用 anon API 登录获取 session token
  const loginResp = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'apikey': ANON_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  })

  if (!loginResp.ok) {
    return {
      error: '注册成功但登录失败，请直接登录',
      registered: true
    }
  }

  const session = await loginResp.json()
  const token = session.access_token
  if (!token) {
    return { error: '注册成功但获取会话失败，请直接登录' }
  }

  return {
    user: {
      id: adminData.id,
      email: adminData.email,
      nickname: nickname || email.split('@')[0]
    },
    token
  }
}

async function login(email, password) {
  const resp = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'apikey': ANON_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  })

  if (!resp.ok) {
    const errText = await resp.text()
    let msg = '邮箱或密码错误'
    try {
      const errJson = JSON.parse(errText)
      if (errJson.error_description) msg = errJson.error_description
      if (errJson.msg) msg = errJson.msg
    } catch (e) {}
    if (msg.includes('Invalid') || msg.includes('invalid') || msg.includes('credentials')) {
      msg = '邮箱或密码错误'
    }
    return { error: msg }
  }

  const session = await resp.json()
  const token = session.access_token
  if (!token) return { error: '登录失败：未获取到token' }

  return {
    user: {
      id: session.user?.id,
      email: session.user?.email,
      nickname: session.user?.user_metadata?.nickname || email.split('@')[0]
    },
    token
  }
}

async function verify(token) {
  if (!token) return { valid: false }

  const resp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${token}`
    }
  })

  if (!resp.ok) return { valid: false }

  const user = await resp.json()
  if (!user || !user.id) return { valid: false }

  return {
    valid: true,
    user: {
      id: user.id,
      email: user.email,
      nickname: user.user_metadata?.nickname || user.email.split('@')[0]
    }
  }
}

async function listUsers(page, perPage) {
  const resp = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=${page}&per_page=${perPage}`, {
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`
    }
  })

  if (!resp.ok) {
    return { error: '获取用户列表失败: ' + resp.status }
  }

  const data = await resp.json()
  const users = (data.users || []).map(u => ({
    id: u.id,
    email: u.email,
    nickname: u.user_metadata?.nickname || u.email?.split('@')[0] || '',
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at,
    email_confirmed: !!u.email_confirmed_at,
    banned: !!u.banned_until
  }))

  return {
    users,
    total: data.aud || users.length
  }
}

async function deleteUser(uid) {
  if (!uid) return { error: '缺少用户ID' }

  const resp = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${uid}`, {
    method: 'DELETE',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`
    }
  })

  if (!resp.ok) {
    return { error: '删除用户失败: ' + resp.status }
  }

  return { success: true }
}

async function updateUser(uid, data) {
  if (!uid) return { error: '缺少用户ID' }

  const body = {}
  if (data.nickname !== undefined) {
    body.user_metadata = { nickname: data.nickname }
  }
  if (data.banned !== undefined) {
    body.ban_duration = data.banned ? '87600h' : 'none'
  }

  const resp = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${uid}`, {
    method: 'PUT',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })

  if (!resp.ok) {
    return { error: '更新用户失败: ' + resp.status }
  }

  return { success: true }
}

async function changePassword(token, newPassword) {
  if (!token) return { error: '未提供认证凭证' }
  if (!newPassword || newPassword.length < 6) return { error: '新密码至少6位' }

  const resp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    method: 'PUT',
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ password: newPassword })
  })

  if (!resp.ok) {
    const errText = await resp.text()
    let msg = '修改密码失败'
    try {
      const errJson = JSON.parse(errText)
      msg = errJson.msg || errJson.message || msg
    } catch (e) {}
    return { error: msg }
  }

  return { success: true }
}

async function resetPassword(email, newPassword) {
  if (!email) return { error: '请输入邮箱' }

  const listResp = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?per_page=1000`, {
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`
    }
  })

  if (!listResp.ok) return { error: '查找用户失败' }

  const listData = await listResp.json()
  const user = (listData.users || []).find(u => u.email === email)

  if (!user) return { error: '该邮箱未注册' }
  if (user.banned_until) return { error: '该账号已被封禁' }
  if (!newPassword || newPassword.length < 6) return { success: true, checkOnly: true }

  const resp = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
    method: 'PUT',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ password: newPassword })
  })

  if (!resp.ok) {
    return { error: '重置密码失败' }
  }

  return { success: true }
}
