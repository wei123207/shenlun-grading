// Vercel Serverless: 百度OCR Token获取（开发模式用）
// 密钥通过 Vercel 环境变量注入，切勿硬编码
const BAIDU_OCR_API_KEY = process.env.BAIDU_OCR_API_KEY
const BAIDU_OCR_SECRET_KEY = process.env.BAIDU_OCR_SECRET_KEY

export default async function handler(req, res) {
  try {
    const url = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${BAIDU_OCR_API_KEY}&client_secret=${BAIDU_OCR_SECRET_KEY}`
    const resp = await fetch(url, { method: 'POST' })
    const data = await resp.json()
    return res.status(200).json(data)
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
