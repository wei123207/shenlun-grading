import axios from 'axios'
import { getAuthHeaders } from './auth'
import { getMyRecordsByUser } from './records'

const IS_DEV = import.meta.env.DEV
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_REST

const supabaseClient = axios.create({
  baseURL: '/supabase/rest/v1',
  headers: { 'Content-Type': 'application/json' }
})

function getLocalWrong() {
  const raw = localStorage.getItem('sl_wrong_book')
  return raw ? JSON.parse(raw) : []
}

function saveLocalWrong(items) {
  localStorage.setItem('sl_wrong_book', JSON.stringify(items))
}

export async function getWrongQuestions(userId) {
  const allRecords = await getMyRecordsByUser(userId, 1, 500)
  const wrong = allRecords.filter(r => {
    const rate = r.full_score > 0 ? (r.score / r.full_score) : 0
    return rate < 0.6
  })
  const removed = JSON.parse(localStorage.getItem('sl_wrong_removed') || '[]')
  return wrong.filter(r => !removed.includes(String(r.id)))
}

export async function getWrongStats(userId) {
  const wrong = await getWrongQuestions(userId)
  const typeMap = {}
  wrong.forEach(r => {
    const t = r.question_type || '未知'
    if (!typeMap[t]) typeMap[t] = 0
    typeMap[t]++
  })
  return {
    total: wrong.length,
    byType: typeMap
  }
}

export async function removeWrong(id) {
  const removed = JSON.parse(localStorage.getItem('sl_wrong_removed') || '[]')
  removed.push(String(id))
  localStorage.setItem('sl_wrong_removed', JSON.stringify(removed))
}
