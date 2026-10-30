// Cloudflare Pages Functions: 百度OCR代理
// 路径: /api/baidu-ocr
// 密钥通过 Cloudflare 环境变量/Secret 注入（wrangler secret put 或 Dashboard），运行时从 context.env 读取

let cachedToken = null
let tokenExpire = 0

async function getAccessToken(env) {
  if (cachedToken && Date.now() < tokenExpire) return cachedToken
  const url = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${env.BAIDU_OCR_API_KEY}&client_secret=${env.BAIDU_OCR_SECRET_KEY}`
  const resp = await fetch(url, { method: 'POST' })
  const data = await resp.json()
  cachedToken = data.access_token
  tokenExpire = Date.now() + (data.expires_in - 60) * 1000
  return cachedToken
}

export async function onRequestPost(context) {
  try {
    const { request } = context
    const { image } = await request.json()

    const accessToken = await getAccessToken(context.env)
    const ocrUrl = `https://aip.baidubce.com/rest/2.0/ocr/v1/accurate_basic?access_token=${accessToken}`

    const params = new URLSearchParams()
    params.append('image', image)

    const resp = await fetch(ocrUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    })

    const data = await resp.json()

    if (data.words_result) {
      const text = data.words_result.map(item => item.words).join('\n')
      return new Response(JSON.stringify({ text }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    return new Response(JSON.stringify({ error: 'OCR识别失败', detail: data }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
