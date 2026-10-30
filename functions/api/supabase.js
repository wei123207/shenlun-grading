// Cloudflare Pages Functions: Supabase代理
// 路径: /api/supabase/*
// 密钥/地址通过 Cloudflare 环境变量注入，运行时从 context.env 读取

export async function onRequestGet(context) {
  try {
    const SUPABASE_URL = context.env.SUPABASE_URL
    const SUPABASE_ANON_KEY = context.env.SUPABASE_ANON_KEY
    const { request } = context
    const url = new URL(request.url)

    // URL 路径格式: /api/supabase/shenlun_questions?select=province&...
    // 需要提取 shenlun_questions 及之后的查询参数
    const pathParts = url.pathname.split('/api/supabase/')
    const supabasePath = pathParts[1] || ''
    const queryString = url.search

    const targetUrl = `${SUPABASE_URL}/${supabasePath}${queryString}`

    const resp = await fetch(targetUrl, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    })

    const data = await resp.json()
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
