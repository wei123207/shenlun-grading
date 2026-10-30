# 申论AI评分系统 - Vercel 部署指南

## 部署架构

```
浏览器 → Vercel CDN
  ├── 静态文件 (dist/)        → Vue 前端
  ├── /api/baidu-ocr          → Serverless → 百度OCR API
  ├── /api/baidu-ocr-token    → Serverless → 百度OCR Token
  ├── /api/zhipu-ai           → Serverless → 智谱清言 API
  └── /api/supabase/*         → Serverless → Supabase 数据库
```

## 部署步骤

### 方法一：通过 GitHub 自动部署（推荐）

1. **将代码推送到 GitHub**
```bash
cd e:\shenlun\shenlun-grading
git init
git add .
git commit -m "申论AI评分系统"
git remote add origin https://github.com/你的用户名/shenlun-grading.git
git push -u origin main
```

2. **在 Vercel 中导入项目**
- 打开 https://vercel.com → 注册/登录（可用 GitHub 账号）
- 点击 "Add New Project"
- 选择你的 GitHub 仓库 `shenlun-grading`
- Vercel 会自动识别 Vite 框架

3. **部署配置**
- Framework Preset: Vite（自动识别）
- Build Command: `npm run build`（自动填充）
- Output Directory: `dist`（自动填充）
- 点击 "Deploy"

4. **等待构建完成**（约 1-2 分钟），Vercel 会分配一个 `xxx.vercel.app` 域名

### 方法二：通过 Vercel CLI 手动部署

1. **安装 Vercel CLI**
```bash
npm i -g vercel
```

2. **登录 Vercel**
```bash
vercel login
```

3. **部署到生产环境**
```bash
cd e:\shenlun\shenlun-grading
vercel --prod
```

首次部署会询问几个问题，按默认回答即可。

## 文件结构

```
shenlun-grading/
├── api/                    # Vercel Serverless 函数
│   ├── baidu-ocr.js        # 百度OCR代理
│   ├── baidu-ocr-token.js  # 百度OCR Token代理
│   ├── zhipu-ai.js         # 智谱清言AI代理
│   └── supabase.js         # Supabase数据库代理
├── src/
│   └── api/
│       ├── ocr.js          # 前端→开发走proxy，生产走/api/baidu-ocr
│       ├── ai.js           # 前端→开发走proxy，生产走/api/zhipu-ai
│       └── supabase.js     # 前端→开发走proxy，生产走/api/supabase
├── vercel.json             # Vercel配置（路由+函数超时）
└── dist/                   # 构建产物
```

## 绑定自定义域名（可选）

1. 在 Vercel 项目设置中 → Domains
2. 添加你的域名
3. 按提示在域名 DNS 中添加 CNAME 记录指向 `cname.vercel-dns.com`
4. Vercel 自动配置 HTTPS 证书

## 更新部署

- **GitHub 方式**：push 代码到 main 分支，Vercel 自动重新部署
- **CLI 方式**：重新执行 `vercel --prod`

## 环境变量（可选）

如果不想把 API Key 硬编码在代码中，可以在 Vercel 项目设置 → Environment Variables 中添加：
- `BAIDU_OCR_API_KEY`
- `BAIDU_OCR_SECRET_KEY`
- `ZHIPU_API_KEY`
- `SUPABASE_ANON_KEY`

然后在 `api/*.js` 中用 `process.env.XXX` 读取，并把 `src/api/*.js` 中的硬编码改为通过环境变量传递。
