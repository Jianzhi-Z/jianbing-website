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

## 技术栈

- Node.js + Express
- EJS 模板引擎
- Tailwind CSS (CDN)
- JSON 文件数据库

## 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 启动服务器
```bash
npm start
```

### 3. 访问网站
- 前台: http://localhost:3000
- 后台: http://localhost:3000/admin/login

### 默认账号
- 用户名: admin
- 密码: jianbing2024

## 部署到 Vercel

1. 推送代码到 GitHub
2. 在 Vercel 导入项目
3. 框架预设选择 "Other"
4. 部署完成

## 注意事项

- 生产环境请修改默认密码
- 定期备份 data/db.json 文件
