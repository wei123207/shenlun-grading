// Vercel Serverless: Supabase代理
// 前端调用 /api/supabase/* 由此函数转发到Supabase

// 密钥/地址通过 Vercel 环境变量注入，切勿硬编码
const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // req.url 格式: /api/supabase/shenlun_questions?select=province&province=eq.安徽
    // 需要提取 shenlun_questions?select=province&province=eq.安徽
    const url = new URL(req.url, 'http://localhost')
    const fullPath = url.pathname.replace(/^\/api\/supabase\//, '')
    const queryString = url.search

    const supabaseUrl = `${SUPABASE_URL}/${fullPath}${queryString}`

    const resp = await fetch(supabaseUrl, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    })

    const data = await resp.json()
    return res.status(200).json(data)
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
