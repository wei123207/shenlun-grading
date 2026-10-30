import axios from 'axios'
import imageCompression from 'browser-image-compression'
import { MOCK_ENABLED, MOCK_OCR, getMockOcrResult } from './mockData.js'

const USE_MOCK = MOCK_ENABLED && MOCK_OCR

// 仅开发模式直连百度 OCR 时使用；生产环境由云函数代理，SECRET 不下发到前端
const BAIDU_OCR_API_KEY = import.meta.env.VITE_BAIDU_OCR_API_KEY
const BAIDU_OCR_SECRET_KEY = import.meta.env.VITE_BAIDU_OCR_SECRET_KEY

const IS_DEV = import.meta.env.DEV
const ENV_ID = import.meta.env.VITE_CLOUDBASE_ENV_ID
const API_BASE = `https://${ENV_ID}-1473604851.ap-shanghai.app.tcloudbase.com`
const OCR_ENDPOINT = IS_DEV ? '/baidu-ocr/rest/2.0/ocr/v1/accurate_basic' : `${API_BASE}/api/baidu-ocr`
const OCR_TOKEN_ENDPOINT = IS_DEV ? '/baidu-ocr/oauth/2.0/token' : null

async function getAccessToken() {
  if (!IS_DEV) return null
  const url = `${OCR_TOKEN_ENDPOINT}?grant_type=client_credentials&client_id=${BAIDU_OCR_API_KEY}&client_secret=${BAIDU_OCR_SECRET_KEY}`
  const { data } = await axios.post(url)
  return data.access_token
}

async function recognizeText(imageBase64) {
  if (USE_MOCK) {
    return new Promise(resolve => {
      setTimeout(() => resolve(getMockOcrResult(imageBase64)), 1200)
    })
  }

  if (IS_DEV) {
    const accessToken = await getAccessToken()
    const url = `${OCR_ENDPOINT}?access_token=${accessToken}`
    const params = new URLSearchParams()
    params.append('image', imageBase64)
    const { data } = await axios.post(url, params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })
    if (data.words_result) {
      return data.words_result.map(item => item.words).join('\n')
    }
    throw new Error('OCR识别失败：' + JSON.stringify(data))
  } else {
    const { data } = await axios.post(OCR_ENDPOINT, { image: imageBase64 }, {
      timeout: 60000,
      headers: { 'Content-Type': 'application/json' }
    })
    if (data.text) return data.text
    const errDetail = data.error || data.detail ? JSON.stringify(data).slice(0, 200) : '未知错误'
    throw new Error('OCR_FAIL:' + errDetail)
  }
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = () => reject(new Error('图片读取失败'))
    reader.readAsDataURL(blob)
  })
}

const COMPRESSION_LEVELS = [
  { maxSizeMB: 0.3, maxWidthOrHeight: 1000, initialQuality: 0.5 },
  { maxSizeMB: 0.15, maxWidthOrHeight: 700, initialQuality: 0.3 },
  { maxSizeMB: 0.08, maxWidthOrHeight: 500, initialQuality: 0.2 },
  { maxSizeMB: 0.05, maxWidthOrHeight: 400, initialQuality: 0.15 }
]

const MAX_BASE64_LENGTH = 550000

export async function fileToBase64(file) {
  for (let i = 0; i < COMPRESSION_LEVELS.length; i++) {
    const cfg = COMPRESSION_LEVELS[i]
    const compressed = await imageCompression(file, {
      ...cfg,
      useWebWorker: true,
      fileType: 'image/jpeg'
    })
    const base64 = await blobToBase64(compressed)
    if (base64.length < MAX_BASE64_LENGTH) return base64
  }
  const lastCompressed = await imageCompression(file, {
    ...COMPRESSION_LEVELS[COMPRESSION_LEVELS.length - 1],
    useWebWorker: true,
    fileType: 'image/jpeg'
  })
  return blobToBase64(lastCompressed)
}

export async function recognizeImage(file) {
  if (USE_MOCK) {
    const base64 = await fileToBase64(file)
    return new Promise(resolve => {
      setTimeout(() => resolve(getMockOcrResult(base64)), 1200)
    })
  }

  let lastError = null
  for (let i = 0; i < COMPRESSION_LEVELS.length; i++) {
    const cfg = COMPRESSION_LEVELS[i]
    const compressed = await imageCompression(file, {
      ...cfg,
      useWebWorker: true,
      fileType: 'image/jpeg'
    })
    const base64 = await blobToBase64(compressed)

    if (!IS_DEV && base64.length >= MAX_BASE64_LENGTH && i < COMPRESSION_LEVELS.length - 1) {
      continue
    }

    try {
      return await recognizeText(base64)
    } catch (e) {
      lastError = e
      const isLarge = e.response?.status === 413 || e.message?.includes('IMAGE_TOO_LARGE') ||
                      e.message?.includes('413') || e.message?.includes('too large')
      if (isLarge && i < COMPRESSION_LEVELS.length - 1) {
        continue
      }
      if (i < COMPRESSION_LEVELS.length - 1) {
        continue
      }
      throw e
    }
  }

  if (lastError) {
    throw lastError
  }
  throw new Error('图片压缩后仍过大，请裁剪后重试')
}
