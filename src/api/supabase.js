import axios from 'axios'
import { MOCK_ENABLED, MOCK_SUPABASE, mockProvinces, mockYearsByProvince, mockQuestions } from './mockData.js'

const USE_MOCK = MOCK_ENABLED && MOCK_SUPABASE

const IS_DEV = import.meta.env.DEV
const ENV_ID = import.meta.env.VITE_CLOUDBASE_ENV_ID
const API_BASE = `https://${ENV_ID}-1473604851.ap-shanghai.app.tcloudbase.com`

// 前端可见密钥，由 .env 注入（构建时内联）；真实值不入库，参考 .env.example
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

const supabaseClient = axios.create({
  baseURL: '/supabase/rest/v1',
  headers: {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json'
  }
})

// 生产环境: 直接调用 Supabase REST API（数据量小，不经过云函数）
const SUPABASE_REST = import.meta.env.VITE_SUPABASE_REST

const PAGE_SIZE = 1000

function mockDelay(data, ms = 300) {
  return new Promise(resolve => setTimeout(() => resolve(data), ms))
}

async function fetchAllPaginated(baseURL, baseParams, headers) {
  const allData = []
  let offset = 0
  while (true) {
    const config = { params: { ...baseParams, limit: PAGE_SIZE, offset } }
    if (headers) config.headers = headers
    const { data } = await axios.get(baseURL, config)
    if (!data || data.length === 0) break
    allData.push(...data)
    if (data.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }
  return allData
}

export async function getProvinces() {
  if (USE_MOCK) return mockDelay(mockProvinces)

  if (IS_DEV) {
    const allData = []
    let offset = 0
    while (true) {
      const { data } = await supabaseClient.get('/shenlun_questions', {
        params: { select: 'province', limit: PAGE_SIZE, offset }
      })
      if (!data || data.length === 0) break
      allData.push(...data)
      if (data.length < PAGE_SIZE) break
      offset += PAGE_SIZE
    }
    return [...new Set(allData.map(item => item.province))].sort()
  } else {
    const headers = {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    }
    const allData = await fetchAllPaginated(
      `${SUPABASE_REST}/shenlun_questions`,
      { select: 'province' },
      headers
    )
    return [...new Set(allData.map(item => item.province))].sort()
  }
}

export async function getYearsByProvince(province) {
  if (USE_MOCK) {
    return mockDelay(mockYearsByProvince[province] || [2024, 2023, 2022, 2021, 2020])
  }

  if (IS_DEV) {
    const { data } = await supabaseClient.get('/shenlun_questions', {
      params: { select: 'year', province: `eq.${province}`, limit: PAGE_SIZE }
    })
    return [...new Set(data.map(item => item.year))].sort((a, b) => b - a)
  } else {
    const { data } = await axios.get(`${SUPABASE_REST}/shenlun_questions`, {
      params: { select: 'year', province: `eq.${province}`, limit: PAGE_SIZE },
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    })
    return [...new Set(data.map(item => item.year))].sort((a, b) => b - a)
  }
}

export async function getPaperTypes(province, year) {
  if (USE_MOCK) {
    return mockDelay(['通用卷', 'A卷', 'B卷'])
  }

  if (IS_DEV) {
    const { data } = await supabaseClient.get('/shenlun_questions', {
      params: { select: 'paper_type', province: `eq.${province}`, year: `eq.${year}`, limit: PAGE_SIZE }
    })
    return [...new Set(data.map(item => item.paper_type))].sort()
  } else {
    const { data } = await axios.get(`${SUPABASE_REST}/shenlun_questions`, {
      params: { select: 'paper_type', province: `eq.${province}`, year: `eq.${year}`, limit: PAGE_SIZE },
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    })
    return [...new Set(data.map(item => item.paper_type))].sort()
  }
}

export async function getQuestionsByProvinceAndYear(province, year, paperType = null) {
  if (USE_MOCK) {
    const key = `${province}-${year}`
    return mockDelay(mockQuestions[key] || [])
  }

  const params = {
    province: `eq.${province}`,
    year: `eq.${year}`,
    order: 'question_number.asc',
    limit: PAGE_SIZE
  }
  if (paperType) {
    params.paper_type = `eq.${paperType}`
  }

  if (IS_DEV) {
    const { data } = await supabaseClient.get('/shenlun_questions', { params })
    return data
  } else {
    const { data } = await axios.get(`${SUPABASE_REST}/shenlun_questions`, {
      params,
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    })
    return data
  }
}

export async function getQuestionById(id) {
  if (USE_MOCK) {
    for (const key of Object.keys(mockQuestions)) {
      const found = mockQuestions[key].find(q => q.id === id)
      if (found) return mockDelay(found)
    }
    return mockDelay(null)
  }

  if (IS_DEV) {
    const { data } = await supabaseClient.get('/shenlun_questions', {
      params: { id: `eq.${id}` }
    })
    return data[0] || null
  } else {
    const { data } = await axios.get(`${SUPABASE_REST}/shenlun_questions`, {
      params: { id: `eq.${id}` },
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    })
    return data[0] || null
  }
}
