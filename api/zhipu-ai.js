// Vercel Serverless: 智谱清言AI代理
// 前端调用 /api/zhipu-ai 由此函数转发到智谱API

// 密钥通过 Vercel 环境变量注入，切勿硬编码
const ZHIPU_API_KEY = process.env.ZHIPU_API_KEY

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { question, studentAnswer } = req.body

    const prompt = `你是一位资深申论阅卷老师，请严格按照以下标准批改学生答案。

【题目】
${question.question_content}

【满分】${question.full_score}分

【参考答案】
${question.reference_answer}

【学生答案】
${studentAnswer}

请按以下格式输出：
1. 得分：X分（满分${question.full_score}分）
2. 优点：（学生答案做得好的地方，2-3点，每点一句话）
3. 不足：（学生答案的问题，2-3点，每点一句话）
4. 改进建议：（具体怎么改，1-2点）

要求：打分客观，和参考答案要点匹配度越高分越高，语言简洁专业。`

    const resp = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ZHIPU_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'glm-4-flash',
        messages: [
          { role: 'system', content: '你是一位经验丰富的申论阅卷老师，评分客观公正，评语专业简洁。' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 1000
      })
    })

    const data = await resp.json()

    if (data.choices && data.choices[0]) {
      const aiText = data.choices[0].message.content
      return res.status(200).json({ rawText: aiText })
    }
    return res.status(500).json({ error: 'AI返回异常', detail: data })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}
