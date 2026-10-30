import axios from 'axios'
import { getAuthHeaders } from './auth'

const IS_DEV = import.meta.env.DEV
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_REST
const ENV_ID = import.meta.env.VITE_CLOUDBASE_ENV_ID
const API_BASE = `https://${ENV_ID}-1473604851.ap-shanghai.app.tcloudbase.com`

const supabaseClient = axios.create({
  baseURL: '/supabase/rest/v1',
  headers: { 'Content-Type': 'application/json' }
})

function getHeaders() {
  if (IS_DEV) {
    const h = getAuthHeaders()
    if (h) {
      h['Content-Type'] = 'application/json'
      return h
    }
    return null
  } else {
    const h = getAuthHeaders()
    if (!h) return null
    return h
  }
}

// ====== localStorage 回退方案 ======
function getLocalRecords() {
  const raw = localStorage.getItem('sl_grading_records')
  return raw ? JSON.parse(raw) : []
}

function saveLocalRecords(records) {
  localStorage.setItem('sl_grading_records', JSON.stringify(records))
}

export async function saveGradingRecord(record) {
  const headers = getHeaders()
  if (!headers) throw new Error('请先登录后再保存记录')

  const payload = {
    user_id: record.userId,
    question_id: record.questionId,
    province: record.province || '',
    year: record.year || null,
    question_number: record.questionNumber || null,
    question_type: record.questionType || '',
    full_score: record.fullScore || 0,
    student_answer: record.studentAnswer || '',
    score: record.score || 0,
    grading_result: record.gradingResult || '',
    advantages: record.advantages || '',
    disadvantages: record.disadvantages || '',
    suggestions: record.suggestions || '',
    raw_text: record.rawText || ''
  }

  try {
    if (IS_DEV) {
      const { data } = await supabaseClient.post('/grading_records', payload, { headers })
      return data
    } else {
      const { data } = await axios.post(`${SUPABASE_URL}/grading_records`, payload, { headers })
      return data
    }
  } catch (e) {
    // 回退到 localStorage
    const records = getLocalRecords()
    const localRecord = {
      ...payload,
      id: 'local_' + Date.now(),
      created_at: new Date().toISOString()
    }
    records.unshift(localRecord)
    saveLocalRecords(records.slice(0, 200))
    return localRecord
  }
}

export async function getMyRecordsByUser(userId, page = 1, pageSize = 50) {
  const headers = getHeaders()
  if (!headers) throw new Error('请先登录')

  const offset = (page - 1) * pageSize
  const params = {
    user_id: `eq.${userId}`,
    order: 'created_at.desc',
    limit: pageSize,
    offset
  }

  try {
    if (IS_DEV) {
      const { data } = await supabaseClient.get('/grading_records', { params, headers })
      return data || []
    } else {
      const { data } = await axios.get(`${SUPABASE_URL}/grading_records`, { params, headers })
      return data || []
    }
  } catch (e) {
    // 回退到 localStorage
    return getLocalRecords()
  }
}

export async function getRecordStats(userId) {
  const headers = getHeaders()
  if (!headers) throw new Error('请先登录')

  let allData = []
  let useLocal = false

  try {
    const params = {
      user_id: `eq.${userId}`,
      select: 'score,full_score,question_type,created_at'
    }

    let offset = 0
    while (true) {
      const p = { ...params, limit: 1000, offset }
      if (IS_DEV) {
        const { data } = await supabaseClient.get('/grading_records', { params: p, headers })
        if (!data || data.length === 0) break
        allData.push(...data)
        if (data.length < 1000) break
        offset += 1000
      } else {
        const { data } = await axios.get(`${SUPABASE_URL}/grading_records`, { params: p, headers })
        if (!data || data.length === 0) break
        allData.push(...data)
        if (data.length < 1000) break
        offset += 1000
      }
    }
  } catch (e) {
    // 回退到 localStorage
    allData = getLocalRecords()
    useLocal = true
  }

  const total = allData.length
  const avgScore = total > 0
    ? Math.round(allData.reduce((sum, r) => sum + (r.full_score > 0 ? (r.score / r.full_score) * 100 : 0), 0) / total)
    : 0

  const typeMap = {}
  allData.forEach(r => {
    const t = r.question_type || '未知'
    if (!typeMap[t]) typeMap[t] = { count: 0, totalScore: 0, totalFull: 0 }
    typeMap[t].count++
    typeMap[t].totalScore += r.score || 0
    typeMap[t].totalFull += r.full_score || 0
  })

  const typeStats = Object.entries(typeMap).map(([type, v]) => ({
    type,
    count: v.count,
    avgScore: v.totalFull > 0 ? Math.round((v.totalScore / v.totalFull) * 100) : 0
  }))

  const dates = [...new Set(allData.map(r => (r.created_at || '').split('T')[0]).filter(Boolean))]
  const practiceDays = dates.length

  const recentScores = allData
    .filter(r => r.created_at)
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
    .slice(0, 7)
    .reverse()
    .map(r => ({
      date: (r.created_at || '').split('T')[0],
      score: r.score || 0,
      fullScore: r.full_score || 1,
      rate: r.full_score > 0 ? Math.round((r.score / r.full_score) * 100) : 0
    }))

  return { total, avgScore, practiceDays, typeStats, recentScores }
}

export async function deleteRecord(id) {
  const headers = getHeaders()
  if (!headers) throw new Error('请先登录')

  if (String(id).startsWith('local_')) {
    const records = getLocalRecords()
    saveLocalRecords(records.filter(r => r.id !== id))
    return
  }

  if (IS_DEV) {
    await supabaseClient.delete('/grading_records', {
      params: { id: `eq.${id}` },
      headers
    })
  } else {
    await axios.delete(`${SUPABASE_URL}/grading_records`, {
      params: { id: `eq.${id}` },
      headers
    })
  }
}
