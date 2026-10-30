# 申论AI评分系统 - 部署指南

## 一、部署架构

```
用户浏览器 → Nginx(80端口) → 静态文件(dist/)
                       ├── /baidu-ocr/* → aip.baidubce.com
                       ├── /zhipu-ai/*  → open.bigmodel.cn
                       └── /supabase/*  → hcjqxbknumjvkwzakgqj.supabase.co
```

Nginx 同时承担两个职责：
1. 托管前端静态文件（dist/ 目录）
2. 反向代理三个外部 API（解决跨域问题）

## 二、部署步骤（云服务器 + Nginx）

### 前提条件
- 一台云服务器（阿里云/腾讯云/华为云等）
- 操作系统：Ubuntu 20.04 / CentOS 7+ / Debian 10+
- 已开放 80 端口（在云服务器安全组中放行）

### 步骤 1：本地构建生产包

在本地项目目录执行：
```bash
cd e:\shenlun\shenlun-grading
npm run build
```
构建完成后，`dist/` 目录就是完整的前端产物。

### 步骤 2：上传文件到服务器

将以下两个文件/目录上传到服务器：

```bash
# 方式一：用 scp 上传（在本地 PowerShell 执行）
scp -r dist/* root@你的服务器IP:/var/www/shenlun-grading/dist/
scp deploy/nginx.conf root@你的服务器IP:/etc/nginx/conf.d/shenlun.conf

# 方式二：用 WinSCP / FileZilla 等工具拖拽上传
```

服务器目录结构：
```
/var/www/shenlun-grading/dist/
    ├── index.html
    └── assets/
        ├── index-xxx.css
        └── index-xxx.js
```

### 步骤 3：安装 Nginx 并启动

SSH 登录服务器后执行：

```bash
# Ubuntu / Debian
apt update && apt install -y nginx

# CentOS / RHEL
yum install -y nginx
```

### 步骤 4：修改 Nginx 配置

编辑配置文件：
```bash
nano /etc/nginx/conf.d/shenlun.conf
```

将 `server_name your-domain.com;` 改为你的实际域名或服务器 IP。

如果没有域名，直接用 IP：
```nginx
server_name _;  # 匹配所有请求
```

### 步骤 5：启动 Nginx

```bash
# 测试配置是否正确
nginx -t

# 启动 / 重载
systemctl start nginx
systemctl enable nginx    # 设置开机自启
systemctl reload nginx    # 修改配置后重载
```

### 步骤 6：访问验证

浏览器打开 `http://你的服务器IP`，能看到网站首页即部署成功。

## 三、配置 HTTPS（可选但推荐）

有域名的话建议加上 HTTPS：

```bash
# 安装 certbot
apt install -y certbot python3-certbot-nginx    # Ubuntu
yum install -y certbot python3-certbot-nginx     # CentOS

# 自动申请并配置 SSL 证书
certbot --nginx -d your-domain.com
```

certbot 会自动修改 Nginx 配置，把 80 端口重定向到 443。

## 四、后续更新流程

每次修改代码后，重新部署只需 3 步：

```bash
# 1. 本地重新构建
npm run build

# 2. 上传到服务器（替换旧文件）
scp -r dist/* root@你的服务器IP:/var/www/shenlun-grading/dist/

# 3. 无需重启 Nginx（静态文件直接生效）
```

## 五、常见问题排查

### 页面空白 / 404
- 检查 Nginx root 路径是否正确指向 dist/ 目录
- 检查 `try_files $uri $uri/ /index.html;` 是否配置

### API 调用失败
- 检查 Nginx proxy_pass 是否正确
- 在服务器上执行 `curl https://aip.baidubce.com` 测试网络连通性

### OCR 识别失败
- 确认服务器能访问百度 OCR 的 API
- 检查百度 OCR 的 API Key 是否在有效期内

### AI 批改失败
- 确认智谱清言 API Key 有效且有余额
- 检查请求超时设置（AI 响答可能需要 10-30 秒）
