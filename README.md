# 煎饼个人网站

AI行动家的个人品牌展示平台，包含完整的后台管理系统。

## 功能特性

- 首页展示个人简介、最新文章、产品
- 文章管理（创建、编辑、删除）
- 产品管理（创建、编辑、删除）
- 后台管理系统
- Markdown编辑器
- 图片上传
- 响应式设计
- **Supabase PostgreSQL 数据库存储**

## 技术栈

- Node.js + Express
- EJS 模板引擎
- Tailwind CSS (CDN)
- Supabase PostgreSQL 数据库

---

## 🚀 部署指南（Vercel + Supabase）

### 第一步：创建 Supabase 项目

1. 访问 https://supabase.com 注册账号（可用 GitHub 登录）
2. 点击 **"New Project"**（新建项目）
3. 填写信息：
   - **Organization**：选择或创建组织
   - **Project Name**：`jianbing-website`（或任意名字）
   - **Database Password**：设置一个强密码（**务必记住！**）
   - **Region**：选择 `Northeast Asia (Tokyo)`（亚洲区域，访问快）
4. 点击 **"Create New Project"**，等待项目创建完成（约 1-2 分钟）

### 第二步：创建数据表

1. 项目创建完成后，点击左侧菜单 **"Table Editor"**（表格编辑器）
2. 点击 **"Create a new table"**，分别创建以下 4 张表：

#### 表 1: articles（文章表）
- **Name**: `articles`
- 勾选 **Enable Row Level Security (RLS)**
- 添加列（点击 "Add column"）：

| 列名 | 类型 | 默认值 | 其他 |
|------|------|--------|------|
| `id` | int8 | - | 主键，已默认创建 |
| `title` | varchar | - | 非空 |
| `slug` | varchar | - | 非空，唯一 |
| `content` | text | - | - |
| `excerpt` | text | - | - |
| `cover_image` | text | - | - |
| `category` | varchar | - | - |
| `tags` | varchar | - | - |
| `status` | varchar | `'published'` | - |
| `view_count` | int8 | `0` | - |
| `created_at` | timestamptz | `now()` | - |
| `updated_at` | timestamptz | `now()` | - |

- 点击 **"Save"** 保存

#### 表 2: products（产品表）
- **Name**: `products`
- 添加列：

| 列名 | 类型 | 默认值 | 其他 |
|------|------|--------|------|
| `id` | int8 | - | 主键 |
| `name` | varchar | - | 非空 |
| `slug` | varchar | - | 非空，唯一 |
| `description` | text | - | - |
| `short_description` | text | - | - |
| `images` | text | - | - |
| `tech_stack` | varchar | - | - |
| `project_url` | varchar | - | - |
| `github_url` | varchar | - | - |
| `featured` | bool | `false` | - |
| `display_order` | int8 | `0` | - |
| `created_at` | timestamptz | `now()` | - |
| `updated_at` | timestamptz | `now()` | - |

#### 表 3: admins（管理员表）
- **Name**: `admins`
- 添加列：

| 列名 | 类型 | 默认值 | 其他 |
|------|------|--------|------|
| `id` | int8 | - | 主键 |
| `username` | varchar | - | 非空，唯一 |
| `password_hash` | varchar | - | 非空 |
| `email` | varchar | - | - |
| `created_at` | timestamptz | `now()` | - |
| `last_login` | timestamptz | - | - |

#### 表 4: profile（个人资料表）
- **Name**: `profile`
- 添加列：

| 列名 | 类型 | 默认值 | 其他 |
|------|------|--------|------|
| `id` | int8 | `1` | 主键 |
| `name` | varchar | - | - |
| `title` | varchar | - | - |
| `avatar` | text | - | - |
| `bio` | text | - | - |
| `email` | varchar | - | - |
| `phone` | varchar | - | - |
| `location` | varchar | - | - |
| `github` | varchar | - | - |
| `twitter` | varchar | - | - |
| `linkedin` | varchar | - | - |
| `wechat` | varchar | - | - |
| `skills` | text | - | - |

### 第三步：获取数据库连接字符串

1. 点击左侧菜单 **"Project Settings"**（项目设置）
2. 点击 **"Database"**
3. 在 **"Connection string"** 部分，点击 **"URI"** 标签
4. 点击 **"Copy"** 复制连接字符串
   - 格式类似：`postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`
   - **注意**：复制后需要将 `[PASSWORD]` 替换为你创建项目时设置的密码

### 第四步：部署到 Vercel

1. 将代码推送到 GitHub
2. 访问 https://vercel.com，导入项目
3. 在 **"Configure Project"** 页面：
   - Framework Preset: **Other**
   - Build Command: 留空
   - Output Directory: 留空
   - Install Command: `npm install`
4. 点击 **"Environment Variables"**，添加以下变量：

| 变量名 | 值 |
|--------|-----|
| `DATABASE_URL` | `postgresql://postgres:你的密码@db.xxxxx.supabase.co:5432/postgres` |

5. 点击 **"Deploy"** 完成部署

### 第五步：初始化数据

1. 等待 Vercel 部署完成
2. 访问你的域名，数据库会自动初始化：
   - 创建默认管理员账号
   - 创建默认个人资料
3. 默认登录账号：
   - 用户名: `admin`
   - 密码: `jianbing2024`

---

## 💻 本地开发

### 1. 安装依赖
```bash
npm install
```

### 2. 配置环境变量
复制 `.env.example` 为 `.env`，填入你的 Supabase 连接字符串：
```
DATABASE_URL=postgresql://postgres:你的密码@db.xxxxx.supabase.co:5432/postgres
```

### 3. 启动服务器
```bash
npm start
```

### 4. 访问网站
- 前台: http://localhost:3000
- 后台: http://localhost:3000/admin/login

---

## 🔐 默认账号

- 用户名: `admin`
- 密码: `jianbing2024`

**注意**：生产环境请立即修改默认密码！

---

## 📝 注意事项

1. **免费额度**：Supabase 免费版包含：
   - 500MB 数据库空间
   - 每月 2GB 带宽
   - 无限 API 请求
   - 对于个人网站完全够用

2. **数据备份**：Supabase 自动每日备份，也可在 Dashboard 手动备份

3. **安全**：不要将 `.env` 文件提交到 GitHub，已添加到 `.gitignore`

4. **连接问题**：如果遇到连接错误，检查：
   - 密码是否正确（注意特殊字符需要 URL 编码）
   - 数据库是否在正确的 region
   - Vercel 的环境变量是否设置正确

---

## 🔧 故障排除

**Q: 部署后显示 "数据库未配置"**
> A: 检查 Vercel 的 `DATABASE_URL` 环境变量是否设置正确，设置后需要重新部署

**Q: 提示 "password authentication failed"**
> A: 密码错误，去 Supabase Project Settings > Database 重新生成密码

**Q: 提示 "relation 'articles' does not exist"**
> A: 数据表没有创建成功，去 Table Editor 检查表是否存在

**Q: 登录时提示 "用户名或密码错误"**
> A: 首次部署后会自动创建默认账号，等待几秒后刷新页面再试
