import { getMyRecordsByUser } from './records'

function getLocalFavorites() {
  const raw = localStorage.getItem('sl_favorites')
  return raw ? JSON.parse(raw) : []
}

function saveLocalFavorites(items) {
  localStorage.setItem('sl_favorites', JSON.stringify(items))
}

export async function getFavorites(userId) {
  return getLocalFavorites().filter(f => f.user_id === userId)
}

export async function addFavorite(userId, item) {
  const favorites = getLocalFavorites()
  const exists = favorites.find(f => f.user_id === userId && f.question_id === item.question_id)
  if (exists) return
  favorites.unshift({
    id: 'fav_' + Date.now(),
    user_id: userId,
    question_id: item.question_id,
    province: item.province || '',
    year: item.year || null,
    question_number: item.question_number || null,
    question_type: item.question_type || '',
    question_content: item.question_content || '',
    full_score: item.full_score || 0,
    category: item.category || '默认',
    created_at: new Date().toISOString()
  })
  saveLocalFavorites(favorites)
}

export async function removeFavorite(id) {
  const favorites = getLocalFavorites()
  saveLocalFavorites(favorites.filter(f => f.id !== id))
}

export async function isFavorited(userId, questionId) {
  const favorites = getLocalFavorites()
  return favorites.some(f => f.user_id === userId && f.question_id === questionId)
}

export async function getFavoriteCategories(userId) {
  const favorites = await getFavorites(userId)
  return [...new Set(favorites.map(f => f.category || '默认'))]
}
