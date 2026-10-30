// Vercel Serverless: 百度OCR代理
// 前端调用 /api/baidu-ocr/* 由此函数转发到百度API

// 密钥通过 Vercel 环境变量注入（Project Settings → Environment Variables），切勿硬编码
const BAIDU_OCR_API_KEY = process.env.BAIDU_OCR_API_KEY
const BAIDU_OCR_SECRET_KEY = process.env.BAIDU_OCR_SECRET_KEY

let cachedToken = null
let tokenExpire = 0

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpire) return cachedToken
  const url = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${BAIDU_OCR_API_KEY}&client_secret=${BAIDU_OCR_SECRET_KEY}`
  const resp = await fetch(url, { method: 'POST' })
  const data = await resp.json()
  cachedToken = data.access_token
  tokenExpire = Date.now() + (data.expires_in - 60) * 1000
  return cachedToken
}

export default async function handler(req, res) {
  // 只允许 POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const accessToken = await getAccessToken()
    const ocrUrl = `https://aip.baidubce.com/rest/2.0/ocr/v1/accurate_basic?access_token=${accessToken}`

    // 获取前端传来的 base64 图片
    const { image } = req.body

    const params = new URLSearchParams()
    params.append('image', image)

    const resp = await fetch(ocrUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })

    const data = await resp.json()

    if (data.words_result) {
      const text = data.words_result.map(item => item.words).join('\n')
      return res.status(200).json({ text })
    }
    return res.status(500).json({ error: 'OCR识别失败', detail: data })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
