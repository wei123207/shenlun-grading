// CloudBase 云函数: Supabase代理
// SDK callFunction: event 直接是 data 对象

// 密钥/地址通过云函数环境变量注入，切勿硬编码
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY

exports.main = async (event) => {
  try {
    let body
    if (typeof event.body === 'string') {
      body = JSON.parse(event.body)
    } else {
      body = event
    }

    const tableName = body.path || 'shenlun_questions'
    const query = { ...body }
    delete query.path

    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(query)) {
      params.append(key, value)
    }
    const queryStr = params.toString()

    const targetUrl = `${SUPABASE_URL}/${tableName}${queryStr ? '?' + queryStr : ''}`

    const resp = await fetch(targetUrl, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    })

    const data = await resp.json()
    return data
  } catch (e) {
    return { error: e.message }
  }
}
