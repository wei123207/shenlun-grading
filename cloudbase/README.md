# 腾讯云 CloudBase 部署指南

## 部署架构

```
用户浏览器 → CloudBase 静态托管 (dist/)
                ├── 云函数 baidu-ocr → 百度OCR API
                ├── 云函数 zhipu-ai  → 智谱清言 API
                └── 云函数 supabase  → Supabase 数据库
```

## 部署步骤

### 第一步：开通 CloudBase 环境

1. 打开 https://console.cloud.tencent.com/tcb
2. 点击"新建环境"
3. 环境名称填 `shenlun`，选择"按量计费"（有免费额度）
4. 创建完成后，记下**环境ID**（格式如 `shenlun-xxxxx`）

### 第二步：安装 CloudBase CLI

```bash
npm i -g @cloudbase/cli
```

### 第三步：登录 CloudBase

```bash
tcb login
```
会打开浏览器让你扫码登录腾讯云。

### 第四步：修改配置

编辑 `cloudbase/cloudbaserc.json`，把 `your-env-id` 改为你的实际环境ID。

### 第五步：部署

```bash
cd e:\shenlun\shenlun-grading
tcb framework deploy
```

### 第六步：访问

部署完成后，CloudBase 会给你一个访问地址：
```
https://你的环境ID.tcloudbaseapp.com
```

## 各部分说明

### 静态文件
- 构建命令: `npm run build`
- 输出目录: `dist/`
- CloudBase 自动部署为静态网站

### 云函数
- `baidu-ocr`: 接收 base64 图片，调用百度OCR识别文字
- `zhipu-ai`: 接收题目和答案，调用智谱清言AI批改
- `supabase`: 接收查询参数，转发到Supabase数据库

### 前端调用方式

前端通过 CloudBase JS SDK 调用云函数，或通过 HTTP 访问：
```
POST https://环境ID.service.tcloudbase.com/baidu-ocr
POST https://环境ID.service.tcloudbase.com/zhipu-ai
GET  https://环境ID.service.tcloudbase.com/supabase
```

## 注意事项

1. CloudBase 免费额度：
   - 静态托管: 5GB 存储 + 5GB/月 CDN 流量
   - 云函数: 4万次/月调用
   - 如果用户量不大，免费额度足够

2. 云函数超时：
   - baidu-ocr: 30秒（OCR识别可能较慢）
   - zhipu-ai: 30秒（AI批改需要时间）
   - supabase: 15秒（数据库查询较快）

3. 需要在 CloudBase 控制台开启 HTTP 访问：
   - 云函数 → 函数管理 → 选择函数 → 触发器 → 添加 HTTP 触发器
   - 路径分别设为 /baidu-ocr, /zhipu-ai, /supabase
