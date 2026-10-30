// 密钥/地址通过云函数环境变量注入，切勿硬编码
const SUPABASE_URL = process.env.SUPABASE_KEEPALIVE_URL
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY

exports.main = async () => {
  try {
    const resp = await fetch(SUPABASE_URL, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    })
    const status = resp.status
    console.log(`Supabase keepalive ping status: ${status}`)
    return { success: status === 200, status }
  } catch (e) {
    console.error('Keepalive failed:', e.message)
    return { success: false, error: e.message }
  }
}
