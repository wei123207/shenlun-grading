import axios from 'axios'
import { MOCK_ENABLED, MOCK_AI, generateMockGradingResult } from './mockData.js'

const USE_MOCK = MOCK_ENABLED && MOCK_AI

const IS_DEV = import.meta.env.DEV
const ENV_ID = import.meta.env.VITE_CLOUDBASE_ENV_ID
const API_BASE = `https://${ENV_ID}-1473604851.ap-shanghai.app.tcloudbase.com`

const AI_ENDPOINT = IS_DEV ? '/zhipu-ai/api/paas/v4/chat/completions' : `${API_BASE}/api/zhipu-ai`
// 仅开发模式直连时使用；生产环境由云函数代理，密钥不下发到前端
const ZHIPU_API_KEY = import.meta.env.VITE_ZHIPU_API_KEY

export async function gradeAnswer(question, studentAnswer, isVip = false) {
  if (USE_MOCK) {
    return new Promise(resolve => {
      setTimeout(() => resolve(generateMockGradingResult(question, studentAnswer)), 1500)
    })
  }

  if (IS_DEV) {
    const prompt = buildPrompt(question, studentAnswer, isVip)
    const { data } = await axios.post(
      AI_ENDPOINT,
      {
        model: 'glm-4-flash',
        messages: [
          { role: 'system', content: isVip ? '你是一位资深申论阅卷专家，提供深度采分点分析和逐段点评，评分严格公正。' : '你是一位经验丰富的申论阅卷老师，评分客观公正，评语专业简洁。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: isVip ? 2500 : 1500
      },
      {
        headers: {
          'Authorization': `Bearer ${ZHIPU_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    )
    return parseGradingResult(data.choices[0].message.content, question.full_score)
  } else {
    const slimQuestion = {
      question_content: question.question_content,
      reference_answer: question.reference_answer,
      full_score: question.full_score
    }
    const maxRetries = 2
    for (let i = 0; i <= maxRetries; i++) {
      try {
        const { data } = await axios.post(AI_ENDPOINT, {
          question: slimQuestion,
          studentAnswer,
          isVip
        }, {
          timeout: 55000,
          headers: { 'Content-Type': 'application/json' }
        })
        if (data.rawText) return parseGradingResult(data.rawText, slimQuestion.full_score)
        throw new Error('AI评分失败：' + JSON.stringify(data))
      } catch (err) {
        if (i < maxRetries && (err.code === 'ECONNABORTED' || err.message?.includes('504') || err.response?.status === 504)) {
          await new Promise(r => setTimeout(r, 2000))
          continue
        }
        throw err
      }
    }
  }
}

function buildPrompt(question, studentAnswer, isVip = false) {
  const fullScore = question.full_score
  const isEssay = fullScore >= 30
  const tier1Min = isEssay ? Math.round(fullScore * 0.8) : Math.round(fullScore * 0.8)
  const tier2Min = isEssay ? Math.round(fullScore * 0.55) : Math.round(fullScore * 0.5)
  const tier3Min = isEssay ? Math.round(fullScore * 0.3) : Math.round(fullScore * 0.25)

  const dim1Max = Math.round(fullScore * 0.4)
  const dim2Max = Math.round(fullScore * 0.2)
  const dim3Max = Math.round(fullScore * 0.2)
  const dim4Max = fullScore - dim1Max - dim2Max - dim3Max

  return `你是一位资深申论阅卷老师，请严格按照以下赋分标准批改学生答案。

【题目】
${question.question_content}

【满分】${fullScore}分

【参考答案】
${question.reference_answer}

【学生答案】
${studentAnswer}

【申论赋分标准】
${isEssay ? `本文题为大作文（${fullScore}分），按以下四类卷标准赋分：` : `本题为小题（${fullScore}分），按以下四类卷标准赋分：`}

一类卷（${tier1Min}-${fullScore}分）：要点齐全，语言通畅，卷面整洁，句子通顺，标点正确，字迹清晰，无错别字，字数符合要求。${isEssay ? '主题明确，紧密结合给定材料中的具体事例进行论证和阐释，条理清楚，全面符合答题要求。' : ''}

二类卷（${tier2Min}-${tier1Min - 1}分）：要点基本齐全，但表述有所欠缺，语言通顺，卷面无明显改动，标点符号无明显问题，有个别错别字，字数未达到要求。${isEssay ? '基本符合答题要求，结合资料，没有照抄材料和罗列材料，资料和观点比例得当。' : ''}

三类卷（${tier3Min}-${tier2Min - 1}分）：要点明显不足，语句不通顺，卷面改动较多，错别字多，标点单一，字数较少。${isEssay ? '偏题，结合资料不充分，分析很少。' : ''}

四类卷（0-${tier3Min - 1}分）：作答错误，跑题或只有特别简单的内容。${isEssay ? '完全不符合答题要求，文不对题，字数不够，语句不通，纯粹抄材料。' : ''}

【评分规则——严格执行】
1. 内容偏离/跑题/文不对题/完全未涉及题目要求 → 直接0分，不得给分
2. 与参考答案要点匹配度为0% → 直接0分
3. 学生答案为空或仅有标点符号/无意义内容 → 直接0分
4. 学生答案照抄材料而无自己的分析/对策 → 0分
5. 偏题但部分内容沾边 → 最高不超过四类卷上限
6. 不得因为"鼓励学生"而给虚高分，必须实事求是

请严格按以下格式输出，每项必须包含：

1. 得分：X分（满分${fullScore}分）
2. 分项维度：
- 要点完整度：X分（满分${dim1Max}分）— 评语
- 逻辑条理：X分（满分${dim2Max}分）— 评语
- 语言表达：X分（满分${dim3Max}分）— 评语
- 格式规范：X分（满分${dim4Max}分）— 评语
3. 答题亮点：（2-3点）
4. 存在不足：（2-3点）
5. 修改优化建议：（1-2点）
${isVip ? `
6. 采分点分析：
   - 命中采分点：（列出学生答案命中的参考答案要点，绿色标记）
   - 遗漏采分点：（列出学生答案遗漏的参考答案要点，红色标注）
   - 采分点命中率：X%
7. 逐段点评：（对学生答案逐段进行点评，指出每段的优缺点）
8. 高分范文参考：（提供一个简短的高分答题示范）` : ''}

要求：先判断属于哪类卷，再在该类卷分数区间内根据要点匹配度精确打分。四个维度分数之和应等于总得分。和参考答案要点匹配度越高分越高，语言简洁专业。如果学生答案内容偏离题目要求或与参考答案完全不匹配，必须给0分，不得给虚高分数。`
}

function parseGradingResult(text, questionFullScore) {
  const result = {
    score: 0,
    fullScore: questionFullScore || 0,
    dimensions: [],
    advantages: '',
    disadvantages: '',
    suggestions: '',
    rawText: text
  }

  const scoreMatch = text.match(/得分[：:]\s*(\d+(?:\.\d+)?)\s*分/)
  if (scoreMatch) {
    result.score = parseFloat(scoreMatch[1])
  }
  const fullMatch = text.match(/满分\s*(\d+)\s*分/)
  if (fullMatch) {
    result.fullScore = parseInt(fullMatch[1])
  }

  const dimNames = [
    { name: '要点完整度' },
    { name: '逻辑条理' },
    { name: '语言表达' },
    { name: '格式规范' }
  ]
  for (const dim of dimNames) {
    const re = new RegExp(dim.name + '[：:]\\s*(\\d+(?:\\.\\d+)?)\\s*分?.*?[—\\-:：。\\s]+(.+)', 'm')
    const m = text.match(re)
    if (m) {
      result.dimensions.push({
        name: dim.name,
        score: parseFloat(m[1]),
        comment: m[2].trim()
      })
    } else {
      result.dimensions.push({
        name: dim.name,
        score: 0,
        comment: ''
      })
    }
  }

  if (result.dimensions.every(d => d.score === 0)) {
    const total = result.score || 0
    if (total > 0) {
      const maxes = [
        Math.round(result.fullScore * 0.4),
        Math.round(result.fullScore * 0.2),
        Math.round(result.fullScore * 0.2),
        result.fullScore - Math.round(result.fullScore * 0.4) - Math.round(result.fullScore * 0.2) - Math.round(result.fullScore * 0.2)
      ]
      const pct = total / result.fullScore
      result.dimensions = dimNames.map((d, i) => ({
        name: d.name,
        score: Math.round(maxes[i] * pct),
        comment: ''
      }))
    }
  }

  result.advantages = extractSection(text, ['答题亮点', '优点'])
  result.disadvantages = extractSection(text, ['存在不足', '不足'])
  result.suggestions = extractSection(text, ['修改优化建议', '改进建议'])

  return result
}

export async function generateEssay(question) {
  const { data } = await axios.post(AI_ENDPOINT, { action: 'essay', question }, {
    timeout: 60000,
    headers: { 'Content-Type': 'application/json' }
  })
  if (data.essay) return data.essay
  throw new Error('范文生成失败：' + JSON.stringify(data))
}

export async function askFollowUp(question, studentAnswer, scoreResult, userQuestion, chatHistory) {
  const { data } = await axios.post(AI_ENDPOINT, {
    action: 'ask',
    question,
    studentAnswer,
    scoreResult,
    userQuestion,
    chatHistory
  }, {
    timeout: 30000,
    headers: { 'Content-Type': 'application/json' }
  })
  if (data.answer) return data.answer
  throw new Error('追问失败：' + JSON.stringify(data))
}

export async function generateStudyPlan(stats) {
  const { data } = await axios.post(AI_ENDPOINT, { action: 'plan', stats }, {
    timeout: 30000,
    headers: { 'Content-Type': 'application/json' }
  })
  if (data.plan) return data.plan
  throw new Error('学习计划生成失败：' + JSON.stringify(data))
}

export async function chatWithAssistant(message, history) {
  const { data } = await axios.post(AI_ENDPOINT, {
    action: 'assistant',
    message,
    history
  }, {
    timeout: 30000,
    headers: { 'Content-Type': 'application/json' }
  })
  if (data.reply) return data.reply
  throw new Error('AI助手回答失败：' + JSON.stringify(data))
}

export async function getDailyKnowledge() {
  const { data } = await axios.post(AI_ENDPOINT, {
    action: 'dailyKnowledge'
  }, {
    timeout: 10000,
    headers: { 'Content-Type': 'application/json' }
  })
  if (data.knowledge) return data.knowledge
  throw new Error('获取知识点失败：' + JSON.stringify(data))
}

function extractSection(text, sectionNames) {
  for (const name of sectionNames) {
    const idx = text.indexOf(name)
    if (idx === -1) continue

    let start = idx + name.length
    while (start < text.length && /[：:\s]/.test(text[start])) {
      start++
    }

    let end = text.length
    const nextSecRe = /\n\s*\d+\.\s*[\u4e00-\u9fff]/g
    nextSecRe.lastIndex = start
    let match
    while ((match = nextSecRe.exec(text)) !== null) {
      if (match.index >= start) {
        end = match.index
        break
      }
    }

    const content = text.substring(start, end).trim()
    if (content) return content
  }
  return ''
}
