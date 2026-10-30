function getLocalShares() {
  const raw = localStorage.getItem('sl_community_shares')
  return raw ? JSON.parse(raw) : []
}

function saveLocalShares(items) {
  localStorage.setItem('sl_community_shares', JSON.stringify(items))
}

export async function getSharedPosts() {
  return getLocalShares()
}

export async function shareResult(userId, userNickname, data) {
  const posts = getLocalShares()
  posts.unshift({
    id: 'post_' + Date.now(),
    user_id: userId,
    user_nickname: userNickname || '匿名用户',
    province: data.province || '',
    year: data.year || '',
    question_type: data.questionType || '',
    question_number: data.questionNumber || '',
    score: data.score || 0,
    full_score: data.fullScore || 0,
    student_answer: (data.studentAnswer || '').slice(0, 200),
    advantages: (data.advantages || '').slice(0, 200),
    suggestions: (data.suggestions || '').slice(0, 200),
    likes: 0,
    likedBy: [],
    comments: [],
    created_at: new Date().toISOString()
  })
  saveLocalShares(posts.slice(0, 100))
  return posts[0]
}

export async function likePost(postId, userId) {
  const posts = getLocalShares()
  const post = posts.find(p => p.id === postId)
  if (post) {
    if (post.likedBy.includes(userId)) {
      post.likedBy = post.likedBy.filter(u => u !== userId)
      post.likes--
    } else {
      post.likedBy.push(userId)
      post.likes++
    }
    saveLocalShares(posts)
  }
}

export async function addComment(postId, userId, userNickname, content) {
  const posts = getLocalShares()
  const post = posts.find(p => p.id === postId)
  if (post) {
    post.comments.push({
      id: 'cmt_' + Date.now(),
      user_id: userId,
      user_nickname: userNickname,
      content,
      created_at: new Date().toISOString()
    })
    saveLocalShares(posts)
  }
}
