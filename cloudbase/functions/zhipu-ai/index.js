// 密钥通过云函数环境变量注入，切勿硬编码
const ZHIPU_API_KEY = process.env.ZHIPU_API_KEY

async function callAI(messages, temperature, maxTokens) {
  const resp = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ZHIPU_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'glm-4-flash',
      messages,
      temperature: temperature || 0.3,
      max_tokens: maxTokens || 1500
    })
  })
  const data = await resp.json()
  if (data.choices && data.choices[0]) {
    return data.choices[0].message.content
  }
  throw new Error(data.error?.message || 'AI返回异常')
}

exports.main = async (event) => {
  try {
    let body
    if (typeof event.body === 'string') {
      body = JSON.parse(event.body)
    } else {
      body = event
    }

    const { action } = body

    // ========== 批改评分 ==========
    if (!action || action === 'grade') {
      const { question, studentAnswer, isVip } = body

      const fullScore = question.full_score
      const isEssay = fullScore >= 30
      const tier1Min = Math.round(fullScore * 0.8)
      const tier2Min = isEssay ? Math.round(fullScore * 0.55) : Math.round(fullScore * 0.5)
      const tier3Min = isEssay ? Math.round(fullScore * 0.3) : Math.round(fullScore * 0.25)

      const dim1Max = Math.round(fullScore * 0.4)
      const dim2Max = Math.round(fullScore * 0.2)
      const dim3Max = Math.round(fullScore * 0.2)
      const dim4Max = fullScore - dim1Max - dim2Max - dim3Max

      let prompt = `申论阅卷。${isEssay ? '大作文' : '小题'}，满分${fullScore}分。

【题目】${question.question_content}
【参考答案】${question.reference_answer}
【学生答案】${studentAnswer}

【严重警告——以下情况必须给0分，不得给虚高分】
1. 答案内容与题目要求无关（如答案是从无关图片中识别的文字）→0分
2. 答案与参考答案要点匹配度为0%→0分
3. 答案为空或仅有标点符号/无意义内容→0分
4. 答案照抄材料无自己分析→0分
5. 答案偏题但部分沾边→最高不超过四类卷上限${tier3Min-1}分
6. 不得因为"鼓励学生"而给虚高分，必须实事求是

赋分标准：
一类(${tier1Min}-${fullScore}分)：要点齐全，语言通畅
二类(${tier2Min}-${tier1Min-1}分)：要点基本齐全，表述欠缺
三类(${tier3Min}-${tier2Min-1}分)：要点不足，语句不通
四类(0-${tier3Min-1}分)：跑题或无内容

先判断：答案是否与题目相关？答案要点是否与参考答案有匹配？如果不相关或匹配度为0，直接0分。

输出格式：
1. 得分：X分（满分${fullScore}分）
2. 分项维度：
- 要点完整度：X分（满分${dim1Max}分）—评语
- 逻辑条理：X分（满分${dim2Max}分）—评语
- 语言表达：X分（满分${dim3Max}分）—评语
- 格式规范：X分（满分${dim4Max}分）—评语
3. 答题亮点：（2-3点）
4. 存在不足：（2-3点）
5. 修改优化建议：（1-2点）`

      if (isVip) {
        prompt += `
6. 采分点分析：
- 命中采分点：
- 遗漏采分点：
- 命中率：X%
7. 高分范文参考：（简短示范）`
      }

      prompt += `\n要求：四维度之和=总得分。匹配度越高分越高。跑题给0分。`

      const text = await callAI([
        { role: 'system', content: isVip ? '你是一位资深申论阅卷专家，提供深度采分点分析、逐段点评和高分范文。评分严格公正。' : '你是一位经验丰富的申论阅卷老师，评分客观公正，评语专业简洁。' },
        { role: 'user', content: prompt }
      ], 0.3, isVip ? 2500 : 1500)

      return { rawText: text }
    }

    // ========== AI同题范文生成 ==========
    if (action === 'essay') {
      const { question } = body
      const prompt = `你是一位申论高分答题专家。请根据以下题目和参考答案，撰写一篇高分范文。

【题目】
${question.question_content}

【满分】${question.full_score}分

【参考答案要点】
${question.reference_answer}

【材料】
${question.material || '无材料'}

要求：
1. 范文应紧扣题目要求，结构完整，逻辑清晰
2. 语言规范，符合申论答题风格
3. 字数适中（大作文约800-1000字，小题约200-300字）
4. 在范文末尾标注各采分点的命中情况
5. 直接输出范文内容，不要加多余的解释`

      const text = await callAI([
        { role: 'system', content: '你是一位申论高分答题专家，擅长撰写结构清晰、要点全面的高分范文。' },
        { role: 'user', content: prompt }
      ], 0.5, 2000)

      return { essay: text }
    }

    // ========== AI深度追问对话 ==========
    if (action === 'ask') {
      const { question, studentAnswer, scoreResult, userQuestion, chatHistory } = body

      const messages = [
        { role: 'system', content: '你是一位资深申论阅卷专家。学生已完成一次批改，现在就批改结果进行深度追问。请根据学生的评分结果、题目和答案，针对学生的问题给出专业、具体、有建设性的回答。回答简洁有力，不超过300字。' }
      ]

      if (chatHistory && chatHistory.length > 0) {
        for (const msg of chatHistory) {
          messages.push({ role: msg.role, content: msg.content })
        }
      }

      const contextPrompt = `【题目】${question.question_content}
【满分】${question.full_score}分
【学生答案】${studentAnswer}
【批改结果】${scoreResult}

学生追问：${userQuestion}`

      messages.push({ role: 'user', content: contextPrompt })

      const text = await callAI(messages, 0.4, 800)
      return { answer: text }
    }

    // ========== 智能学习计划 ==========
    if (action === 'plan') {
      const { stats } = body
      const prompt = `你是一位申论学习规划专家。根据以下学生的练习数据，生成一份个性化学习计划。

【学生练习数据】
- 总练习题数：${stats.totalQuestions}
- 平均得分率：${stats.avgScoreRate}%
- 常练省份：${stats.topProvinces?.join('、') || '暂无'}
- 弱题型：${stats.weakTypes?.join('、') || '暂无'}
- 近期得分趋势：${stats.recentScores?.map(s => `${s.province}${s.year}第${s.qNum}题:${s.score}分`).join('；') || '暂无'}
- 最低得分率题型：${stats.weakestType || '暂无'}

请生成一份本周学习计划，按以下格式输出：

1. 学习目标：（本周要达成的具体目标，2-3条）
2. 重点练习方向：（基于弱题型和常练省份，建议本周重点练习哪些类型的题目）
3. 每日计划：
   - 周一：建议练习内容
   - 周二：建议练习内容
   - ...
   - 周日：建议练习内容
4. 提分建议：（针对弱项的具体提升建议，2-3条）

要求：计划具体可执行，贴合学生实际水平，语言简洁。`

      const text = await callAI([
        { role: 'system', content: '你是一位申论学习规划专家，擅长根据学生练习数据制定个性化提分计划。' },
        { role: 'user', content: prompt }
      ], 0.5, 1200)

      return { plan: text }
    }

    // ========== AI助手对话 ==========
    if (action === 'assistant') {
      const { message, history } = body

      const systemPrompt = `你是一位资深的申论辅导专家，拥有10年以上申论教学经验，精通国考及各省考申论命题规律与评分标准。

你的职责：
1. 解答考生关于申论各题型答题规范、文体格式、高分要点、解题技巧的问题
2. 回答需结构化、分点列出，重点内容用**加粗**标注
3. 涉及格式规范时，需给出标准模板+示例
4. 涉及答题技巧时，需结合申论材料特点给出可操作的方法
5. 不确定的问题如实告知，不编造
6. 回答简洁专业，避免冗余，单次回答控制在500字以内
7. 回答末尾推荐2-3个相关问题，格式为：
相关问题：
- 问题1
- 问题2
- 问题3

知识范围：归纳概括、综合分析、提出对策、应用文写作、申发论述五大题型；发言稿、倡议书、短评、通知、报告等常见文体格式；议论文写作方法；申论语言规范；评分标准与采分点。

只回答申论相关问题，无关问题请礼貌拒绝。`

      const messages = [
        { role: 'system', content: systemPrompt }
      ]

      if (history && history.length > 0) {
        for (const msg of history) {
          messages.push({ role: msg.role, content: msg.content })
        }
      }

      messages.push({ role: 'user', content: message })

      const text = await callAI(messages, 0.5, 1000)
      return { reply: text }
    }

    // ========== 每日知识点 ==========
    if (action === 'dailyKnowledge') {
      const knowledgeList = [
        { title: '归纳概括题的基本答题框架', category: '归纳概括', content: '归纳概括题是申论基础题型，核心在于从材料中提炼要点。答题结构：总括句+分条罗列。总括句需高度概括核心内容，分条要点按"序号+关键词+具体表述"展开。', example: '【例】概括农村发展存在的问题：总括：农村发展面临基础设施薄弱、产业单一、人才流失三大问题。1.基础设施：道路、水利等设施不完善……' },
        { title: '对策题答题公式', category: '提出对策', content: '对策题的核心公式：主体+手段+内容+目的。主体指谁来做（政府/企业/社会/个人），手段指怎么做（立法/监管/宣传/投入），内容指具体措施，目的指达到什么效果。', example: '【例】政府（主体）应加大财政投入（手段），完善农村道路、水利等基础设施建设（内容），改善农村生产生活条件（目的）。' },
        { title: '倡议书标准格式', category: '应用文', content: '倡议书格式：标题居中（关于XX的倡议书）+称谓（顶格写倡议对象）+正文（背景+倡议内容+呼吁）+落款（发起单位+日期）。正文部分要具体可行，有号召力。', example: '【例】标题：关于参与垃圾分类的倡议书  称谓：广大市民朋友们：  正文：背景意义+具体倡议内容+号召行动  落款：XX街道办事处  2026年X月X日' },
        { title: '议论文五段三分式结构', category: '申发论述', content: '标准议论文结构：五段三分式。第一段：开头引出总论点；第二至四段：三个分论点段（每段=分论点+论据+论证+回扣分论点）；第五段：结尾升华总结。分论点要并列或递进，紧扣总论点。', example: '【例】总论点：以创新驱动高质量发展。分论点1：科技创新是核心动力；分论点2：制度创新是重要保障；分论点3：文化创新是精神支撑。' },
        { title: '综合分析题答题思路', category: '综合分析', content: '综合分析题遵循"是什么-为什么-怎么办"思路。是什么：解释含义、亮明观点；为什么：分析原因、影响、意义；怎么办：提出对策、总结升华。答题要有逻辑性，层层递进。', example: '【例】谈谈对"绿水青山就是金山银山"的理解：是什么：这句话强调生态保护与经济发展的辩证关系；为什么：生态优势可转化为经济优势；怎么办：坚持绿色发展理念……' },
        { title: '发言稿格式与写作要点', category: '应用文', content: '发言稿格式：标题+称谓+开场白+正文+结束语。开场白要问候并点明主题，正文要有层次，结束语要致谢或号召。语言要口语化、有感染力，符合讲话场景。', example: '【例】标题：在XX动员会上的讲话  称谓：各位领导、同志们：  开场白：大家好！今天我们召开……  正文：分点阐述  结尾：谢谢大家！' },
        { title: '采分点提炼技巧', category: '高分技巧', content: '提炼采分点三步骤：1.定位关键句：关注首句、尾句、转折句；2.提取关键词：动宾结构、专业术语、高频词汇；3.规范表述：将口语化表达转化为申论规范用语。要点宁多勿少，但不可重复。', example: '【例】材料说"村里路不好，东西运不出去"→提炼为：基础设施薄弱，交通不便，制约农产品外销。' },
        { title: '大作文开头写法', category: '申发论述', content: '议论文开头三要素：引出话题+过渡分析+亮明总论点。常用写法：名言式、案例式、排比式、对比式。开头要简短有力，控制在150字左右，尽快亮明观点。', example: '【例】"治国之道，富民为始。"共同富裕是社会主义的本质要求。当前我国已进入新发展阶段，实现共同富裕面临新的机遇与挑战。因此，我们要多措并举，扎实推进共同富裕。' },
        { title: '通知标准格式', category: '应用文', content: '通知格式：标题（关于XX的通知）+主送机关（顶格）+正文（缘由+事项+要求）+落款（发文机关+日期）。通知语言要准确、简洁，事项要具体明确。', example: '【例】关于开展XX培训的通知  各部门：  为提升……，决定开展……培训，现将有关事项通知如下：一、培训时间 二、培训内容 三、注意事项  XX单位  2026年X月X日' },
        { title: '审题四步法', category: '高分技巧', content: '审题四步法：1.审题型：判断是归纳概括/综合分析/提出对策/应用文/大作文；2.审对象：明确作答对象是什么；3.审范围：确定在哪则材料找答案；4.审要求：字数、特殊要求等。审清题目再动手，事半功倍。', example: '【例】"根据给定资料2，概括S市在推进智慧城市建设中的主要做法"→题型：归纳概括；对象：智慧城市建设做法；范围：资料2；字数：一般200-300字。' },
        { title: '短评写作方法', category: '应用文', content: '短评是短小精悍的评论，结构：标题+正文。标题要鲜明有观点，正文一般三段：第一段摆现象亮观点，第二段分析原因或影响，第三段提对策或总结升华。语言要犀利有深度。', example: '【例】标题：莫让"网红打卡"变了味  正文：近年来网红打卡热潮……（现象+观点）→背后反映了……（分析）→因此，要……（对策）' },
        { title: '分论点设置技巧', category: '申发论述', content: '设置分论点三原则：1.紧扣总论点，不跑题；2.角度不重复，有逻辑（并列/递进/辩证）；3.句式要工整，有气势。常见角度：是什么（内涵）、为什么（意义）、怎么办（对策）。', example: '【例】总论点：推进乡村振兴。分论点1：产业振兴是基础（经济角度）；分论点2：人才振兴是关键（人的角度）；分论点3：文化振兴是灵魂（文化角度）。三个角度并列，不重复。' },
        { title: '简报格式与写作', category: '应用文', content: '简报格式：报头（简报名称+期号+编发单位+日期）+报体（标题+正文）+报尾（发送范围+印发份数）。正文要客观真实，简明扼要，用事实说话，不加议论。', example: '【例】XX工作简报  第X期  XX单位编  2026年X月X日  标题：XX工作取得阶段性成效  正文：基本情况+主要做法+下一步计划  报尾：送：XX领导  发：各部门（共印XX份）' },
        { title: '提出对策的三大来源', category: '提出对策', content: '对策三大来源：1.直接对策：材料中现成的措施、建议、做法；2.问题反推：根据材料中的问题、原因反推对策；3.经验教训：从成功案例提炼经验，从失败案例吸取教训。优先用直接对策。', example: '【例】材料说"监管缺位导致乱象丛生"→反推对策：加强监管力度，建立健全监管机制，加大对违法行为的处罚力度。' },
        { title: '大作文结尾写法', category: '申发论述', content: '议论文结尾三方式：1.总结式：总结全文，重申总论点；2.升华式：拔高立意，上升到国家、民族层面；3.展望式：展望未来，发出号召。结尾要呼应开头，首尾圆合，控制在100字左右。', example: '【例】"路虽远，行则将至；事虽难，做则必成。"推进XX工作非一日之功，需要久久为功。唯有……，才能……，为实现中华民族伟大复兴的中国梦贡献力量。' }
      ]

      // 按日期取模
      const today = new Date()
      const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000)
      const index = dayOfYear % knowledgeList.length
      return { knowledge: knowledgeList[index] }
    }

    return { error: '未知操作类型' }
  } catch (e) {
    return { error: e.message }
  }
}
