import axios from 'axios'
import { getRecordStats } from './records'

const SUPABASE_REST = import.meta.env.VITE_SUPABASE_REST
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

const headers = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`
}

export async function getRecommendedQuestions(userId) {
  let practicedIds = []
  let weakTypes = []
  let practicedProvinces = []
  let allTypeStats = []

  if (userId) {
    try {
      const stats = await getRecordStats(userId)
      if (stats.typeStats && stats.typeStats.length > 0) {
        allTypeStats = stats.typeStats
        weakTypes = stats.typeStats
          .filter(t => t.avgScore < 70)
          .sort((a, b) => a.avgScore - b.avgScore)
          .slice(0, 3)
          .map(t => t.type)
      }
    } catch (e) {}

    try {
      const { getMyRecordsByUser } = await import('./records')
      const records = await getMyRecordsByUser(userId, 1, 100)
      practicedIds = records.map(r => r.question_id).filter(Boolean)
      practicedProvinces = [...new Set(records.map(r => r.province).filter(Boolean))]
    } catch (e) {}
  }

  const allQuestions = []
  const seenIds = new Set()

  const recentYears = [2024, 2023, 2022]

  for (const year of recentYears) {
    try {
      const { data } = await axios.get(`${SUPABASE_REST}/shenlun_questions`, {
        params: {
          year: `eq.${year}`,
          select: 'id,province,year,question_number,question_type,full_score,question_title,question_content',
          'full_score': 'gt.0',
          order: 'question_number.asc',
          limit: 30
        },
        headers
      })
      if (data && data.length > 0) {
        for (const q of data) {
          if (!seenIds.has(q.id)) {
            seenIds.add(q.id)
            allQuestions.push(q)
          }
        }
      }
    } catch (e) {}
  }

  const unpracticed = allQuestions.filter(q =>
    !practicedIds.includes(q.id) && q.full_score > 0
  )

  const dedupMap = new Map()
  for (const q of unpracticed) {
    const key = `${q.province}_${q.year}_${q.question_number}_${q.question_type}`
    if (!dedupMap.has(key)) {
      dedupMap.set(key, q)
    }
  }
  const dedupedUnpracticed = Array.from(dedupMap.values())

  let recommendations = []
  const addedIds = new Set()

  function addRecs(list, maxCount) {
    let count = 0
    for (const q of list) {
      if (addedIds.has(q.id)) continue
      if (count >= maxCount) break
      recommendations.push(q)
      addedIds.add(q.id)
      count++
    }
  }

  if (weakTypes.length > 0) {
    const weakMatches = dedupedUnpracticed.filter(q => weakTypes.includes(q.question_type))
    addRecs(weakMatches, 3)
  }

  if (practicedProvinces.length > 0) {
    const sameProvince = dedupedUnpracticed
      .filter(q => practicedProvinces.includes(q.province))
    addRecs(sameProvince, 2)
  }

  const hotProvinces = ['国考', '江苏', '山东', '浙江', '广东', '北京']
  const hotMatches = dedupedUnpracticed
    .filter(q => hotProvinces.includes(q.province))
  addRecs(hotMatches, 3)

  if (recommendations.length < 6) {
    addRecs(dedupedUnpracticed, 6 - recommendations.length)
  }

  return recommendations.slice(0, 6).map(q => ({
    ...q,
    recommendReason: getRecommendReason(q, weakTypes, practicedProvinces, allTypeStats)
  }))
}

function getRecommendReason(q, weakTypes, practicedProvinces, allTypeStats) {
  if (weakTypes.includes(q.question_type)) {
    const stat = allTypeStats.find(s => s.type === q.question_type)
    if (stat) {
      return `${q.question_type}平均${stat.avgScore}分，建议加强`
    }
    return `${q.question_type}薄弱，建议加强`
  }
  if (practicedProvinces.includes(q.province)) {
    return `你常练${q.province}题目`
  }
  if (q.province === '国考') {
    return '国考热门题目'
  }
  return '热门推荐'
}
