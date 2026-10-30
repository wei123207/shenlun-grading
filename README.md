# 申论 AI 智能评分系统

> 面向公务员考试申论科目训练场景的 AI 辅助评分应用，支持 **Web + Android** 跨端。
> 上传手写作答图片 / PDF，经 OCR 识别后由大模型进行多维度智能评分，并提供真题题库、作答记录、错题本等学习管理功能。

![Vue](https://img.shields.io/badge/Vue-3-42b883) ![Vite](https://img.shields.io/badge/Vite-5-646cff) ![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e) ![License](https://img.shields.io/badge/license-MIT-gray)

## ✨ 核心功能

- **真题题库**：覆盖国考及多省份历年申论真题，按省份 / 年份 / 试卷类型两级筛选
- **拍照识别**：图片多级压缩 + 百度 OCR 高精度通用文字识别，将手写作答转为文本
- **AI 智能评分**：调用智谱 GLM 大模型，按「要点完整度 / 逻辑条理 / 语言表达 / 格式规范」四维度赋分，输出总分、亮点、不足与改进建议
- **学习闭环**：作答记录、成绩趋势、错题本、智能推荐、AI 助手追问
- **用户系统**：注册 / 登录、管理员后台、会员分级（VIP 深度采分点分析）
- **跨端交付**：一套 Vue 代码，经 Capacitor 打包为 Android APK

## 🧱 技术栈

| 层次 | 技术选型 |
|---|---|
| 前端 | Vue 3（Composition API + `<script setup>`）、Vite、Element Plus、Vue Router 4、Pinia、Axios |
| 数据服务 | Supabase（PostgreSQL + PostgREST + Auth + RLS） |
| 服务端代理 | Tencent CloudBase 云函数 / Vercel Serverless / Cloudflare Pages Functions（三套适配） |
| AI 能力 | 智谱 GLM（评分 / 范文 / 助手）、百度智能云 OCR |
| 真题解析 | Python（PyMuPDF 批量解析 PDF 题库并入库） |
| 跨端 | Capacitor（Android APK） |
| 运维 | GitHub Actions（Supabase 免费实例定时保活） |

## 🏗️ 架构设计

采用「前端直连云 + 密钥代理」的无自建后端框架架构：CRUD 通过 Supabase PostgREST 完成；OCR 与大模型评分等含密钥的调用，统一经云函数代理，**密钥不下发到客户端**。

```
浏览器 / Android(Capacitor)
        │
        ├── 题库/记录 CRUD ──► Supabase PostgREST
        │
        └── OCR / AI 评分 ──► 云函数代理 ──► 百度 OCR / 智谱 GLM
                              (密钥存于服务端环境变量)
```

## 🚀 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量：复制模板并填入真实密钥
cp .env.example .env    # Windows 可用 copy .env.example .env

# 3. 启动开发服务器
npm run dev
```

### 环境变量说明

所有密钥与地址通过环境变量注入（见 `.env.example`），**切勿硬编码到源码中**：

- 前端变量以 `VITE_` 开头，由 Vite 在构建时内联（`import.meta.env`）
- 云函数 / Serverless 变量通过各平台控制台的环境变量或 Secret 注入（`process.env` / `context.env`）

## 📁 项目结构

```
├── src/                 # Vue3 前端源码
│   ├── api/             # 接口层（含 Mock 兜底机制）
│   ├── pages/           # 各功能页面
│   ├── components/      # 通用组件（评分卡、图片上传、AI 助手）
│   └── stores/          # Pinia 状态管理
├── api/                 # Vercel Serverless 代理
├── functions/api/       # Cloudflare Pages Functions 代理
├── cloudbase/functions/ # 腾讯云 CloudBase 云函数
├── deploy/              # nginx / Vercel 部署配置
└── .github/workflows/   # Supabase 定时保活
```

## 📦 构建与部署

```bash
npm run build            # 产物输出到 dist/
```

- **Web**：Vercel / Cloudflare Pages（Framework Preset: Vite，需配置 SPA 路由回退）
- **Android**：`npx cap add android && npx cap sync && npx cap open android`，在 Android Studio 中打包 APK

## 📝 说明

本项目为课程实践作品。出于安全考虑，仓库不包含任何第三方密钥；运行前请自行注册 Supabase / 百度智能云 OCR / 智谱 AI 账号，并按 `.env.example` 配置环境变量。
