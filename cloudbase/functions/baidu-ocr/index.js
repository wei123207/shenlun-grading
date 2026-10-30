// CloudBase 云函数: 百度OCR代理
// 兼容 HTTP 触发器和 SDK callFunction

// 密钥通过云函数环境变量注入，切勿硬编码
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

exports.main = async (event) => {
  try {
    let body
    if (typeof event.body === 'string') {
      body = JSON.parse(event.body)
    } else if (event.httpMethod) {
      body = { image: event.queryStringParameters?.image }
    } else {
      body = event
    }

    const image = body.image
    if (!image) {
      return { error: '缺少image参数' }
    }

    const imageLen = image.length
    console.log(`OCR请求: image base64 length = ${imageLen}`)

    const accessToken = await getAccessToken()
    const ocrUrl = `https://aip.baidubce.com/rest/2.0/ocr/v1/accurate_basic?access_token=${accessToken}`

    const params = new URLSearchParams()
    params.append('image', image)

    const resp = await fetch(ocrUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    })

    const data = await resp.json()

    if (data.words_result) {
      return { text: data.words_result.map(item => item.words).join('\n') }
    }

    console.error('OCR返回无结果:', JSON.stringify(data).slice(0, 500))
    return { error: 'OCR识别失败', detail: JSON.stringify(data).slice(0, 300) }
  } catch (e) {
    console.error('OCR云函数异常:', e.message)
    return { error: e.message }
  }
}
