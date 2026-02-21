const express = require('express');
const path = require('path');
const session = require('express-session');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const { marked } = require('marked');

// 导入数据库模块
const db = require('./lib/db');

const app = express();
const PORT = process.env.PORT || 3000;

// 配置中间件
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// 支持 _method 查询参数（用于覆盖 POST 为 PUT/DELETE）
app.use(methodOverride('_method'));
app.use(express.static('public'));
app.use(session({
  secret: process.env.SESSION_SECRET || 'jianbing-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));
app.use(flash());

// 初始化数据库（Vercel 环境）
// 注意：在 Vercel Serverless 环境中，每次请求都会冷启动
// 数据库初始化应该在请求处理前完成
let dbInitialized = false;
app.use(async (req, res, next) => {
  if (!dbInitialized) {
    try {
      await db.initializeDatabase();
      dbInitialized = true;
    } catch (error) {
      console.error('数据库初始化失败:', error);
    }
  }
  next();
});

// 设置模板引擎
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 全局变量
app.locals.siteTitle = '煎饼 - AI行动家';
app.locals.siteDescription = '专注于AI智能体与编程业务';

// Markdown 渲染辅助函数
app.locals.renderMarkdown = (content) => {
  return marked(content || '');
};

// 格式化日期
app.locals.formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// 文件上传配置（Vercel 只支持内存存储）
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// 认证中间件
const requireAuth = (req, res, next) => {
  if (req.session.adminId) {
    next();
  } else {
    req.flash('error', '请先登录');
    res.redirect('/admin/login');
  }
};

// ========== 前台路由 ==========

// 首页
app.get('/', async (req, res) => {
  try {
    const articles = await db.getPublishedArticles();
    const products = await db.getAllProducts();
    const profile = await db.getProfile();
    
    res.render('index', { 
      articles: articles.slice(0, 3), 
      products: products.slice(0, 4), 
      profile: profile || {}, 
      path: '/' 
    });
  } catch (error) {
    console.error('首页错误:', error);
    res.status(500).send('服务器错误');
  }
});

// 文章列表
app.get('/articles', async (req, res) => {
  try {
    const category = req.query.category;
    let articles = await db.getPublishedArticles();
    
    if (category && category !== '全部') {
      articles = articles.filter(a => a.category === category);
    }
    
    const categories = [...new Set((await db.getPublishedArticles()).map(a => a.category))];
    res.render('articles', { articles, categories, currentCategory: category || '全部', path: '/articles' });
  } catch (error) {
    console.error('文章列表错误:', error);
    res.status(500).send('服务器错误');
  }
});

// 文章详情
app.get('/articles/:slug', async (req, res) => {
  try {
    const article = await db.getArticleBySlug(req.params.slug);
    if (!article || article.status !== 'published') {
      return res.status(404).render('404');
    }
    
    // 增加浏览量
    await db.incrementArticleViews(article.id);
    article.view_count = (article.view_count || 0) + 1;
    
    // 获取相关文章
    const allArticles = await db.getPublishedArticles();
    const relatedArticles = allArticles
      .filter(a => a.id !== article.id && a.category === article.category)
      .slice(0, 3);
    
    res.render('article-detail', { article, relatedArticles, path: '/articles' });
  } catch (error) {
    console.error('文章详情错误:', error);
    res.status(500).send('服务器错误');
  }
});

// 产品列表
app.get('/products', async (req, res) => {
  try {
    const products = await db.getAllProducts();
    res.render('products', { products, path: '/products' });
  } catch (error) {
    console.error('产品列表错误:', error);
    res.status(500).send('服务器错误');
  }
});

// 产品详情
app.get('/products/:slug', async (req, res) => {
  try {
    const product = await db.getProductBySlug(req.params.slug);
    if (!product) {
      return res.status(404).render('404');
    }
    res.render('product-detail', { product, path: '/products' });
  } catch (error) {
    console.error('产品详情错误:', error);
    res.status(500).send('服务器错误');
  }
});

// 关于页面
app.get('/about', async (req, res) => {
  try {
    const products = await db.getAllProducts();
    const profile = await db.getProfile();
    res.render('about', { profile: profile || {}, products: products.slice(0, 3), path: '/about' });
  } catch (error) {
    console.error('关于页面错误:', error);
    res.status(500).send('服务器错误');
  }
});

// ========== 后台路由 ==========

// 登录页面
app.get('/admin/login', (req, res) => {
  if (req.session.adminId) {
    return res.redirect('/admin/dashboard');
  }
  res.render('admin/login', { error: req.flash('error'), success: req.flash('success') });
});

// 登录处理
app.post('/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const admin = await db.getAdminByUsername(username);
    
    if (admin && bcrypt.compareSync(password, admin.password_hash)) {
      req.session.adminId = admin.id;
      await db.updateAdminLastLogin(admin.id);
      res.redirect('/admin/dashboard');
    } else {
      req.flash('error', '用户名或密码错误');
      res.redirect('/admin/login');
    }
  } catch (error) {
    console.error('登录错误:', error);
    req.flash('error', '登录失败，请重试');
    res.redirect('/admin/login');
  }
});

// 登出
app.get('/admin/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/admin/login');
});

// 后台仪表盘
app.get('/admin/dashboard', requireAuth, async (req, res) => {
  try {
    const stats = await db.getArticleStats();
    const productCount = await db.getProductCount();
    const articles = await db.getAllArticles();
    const products = await db.getAllProducts();
    
    res.render('admin/dashboard', { 
      stats: {
        articles: stats.total,
        publishedArticles: stats.published,
        products: productCount,
        totalViews: stats.totalViews
      }, 
      recentArticles: articles.slice(0, 5), 
      recentProducts: products.slice(0, 5), 
      path: '/admin/dashboard' 
    });
  } catch (error) {
    console.error('仪表盘错误:', error);
    res.status(500).send('服务器错误');
  }
});

// ========== 文章管理 ==========

app.get('/admin/articles', requireAuth, async (req, res) => {
  try {
    const articles = await db.getAllArticles();
    res.render('admin/articles', { articles, path: '/admin/articles', success: req.flash('success'), error: req.flash('error') });
  } catch (error) {
    console.error('文章管理错误:', error);
    res.status(500).send('服务器错误');
  }
});

app.get('/admin/articles/new', requireAuth, (req, res) => {
  res.render('admin/article-edit', { article: null, path: '/admin/articles' });
});

app.get('/admin/articles/:id/edit', requireAuth, async (req, res) => {
  try {
    const article = await db.getArticleById(req.params.id);
    if (!article) {
      req.flash('error', '文章不存在');
      return res.redirect('/admin/articles');
    }
    res.render('admin/article-edit', { article, path: '/admin/articles' });
  } catch (error) {
    console.error('编辑文章错误:', error);
    req.flash('error', '获取文章失败');
    res.redirect('/admin/articles');
  }
});

app.post('/admin/articles', requireAuth, upload.single('cover_image'), async (req, res) => {
  try {
    const { title, slug, content, excerpt, category, tags, status } = req.body;
    
    const existingArticle = await db.getArticleBySlug(slug);
    if (existingArticle) {
      req.flash('error', 'URL别名已存在');
      return res.redirect('/admin/articles/new');
    }
    
    const cover_image = req.file ? `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}` : null;
    
    await db.createArticle({
      title,
      slug,
      content,
      excerpt,
      cover_image,
      category,
      tags,
      status
    });
    
    req.flash('success', '文章创建成功');
    res.redirect('/admin/articles');
  } catch (error) {
    console.error('创建文章错误:', error);
    req.flash('error', '创建文章失败');
    res.redirect('/admin/articles/new');
  }
});

app.put('/admin/articles/:id', requireAuth, upload.single('cover_image'), async (req, res) => {
  try {
    const { title, slug, content, excerpt, category, tags, status } = req.body;
    const articleId = parseInt(req.params.id);
    
    const article = await db.getArticleById(articleId);
    if (!article) {
      req.flash('error', '文章不存在');
      return res.redirect('/admin/articles');
    }
    
    const existingArticle = await db.getArticleBySlug(slug);
    if (existingArticle && existingArticle.id !== articleId) {
      req.flash('error', 'URL别名已被其他文章使用');
      return res.redirect(`/admin/articles/${articleId}/edit`);
    }
    
    const updateData = {
      title,
      slug,
      content,
      excerpt,
      category,
      tags,
      status
    };
    
    if (req.file) {
      updateData.cover_image = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    }
    
    await db.updateArticle(articleId, updateData);
    
    req.flash('success', '文章更新成功');
    res.redirect('/admin/articles');
  } catch (error) {
    console.error('更新文章错误:', error);
    req.flash('error', '更新文章失败');
    res.redirect(`/admin/articles/${req.params.id}/edit`);
  }
});

app.delete('/admin/articles/:id', requireAuth, async (req, res) => {
  try {
    const articleId = parseInt(req.params.id);
    await db.deleteArticle(articleId);
    req.flash('success', '文章删除成功');
  } catch (error) {
    console.error('删除文章错误:', error);
    req.flash('error', '删除文章失败');
  }
  res.redirect('/admin/articles');
});

// ========== 产品管理 ==========

app.get('/admin/products', requireAuth, async (req, res) => {
  try {
    const products = await db.getAllProducts();
    res.render('admin/products', { products, path: '/admin/products', success: req.flash('success'), error: req.flash('error') });
  } catch (error) {
    console.error('产品管理错误:', error);
    res.status(500).send('服务器错误');
  }
});

app.get('/admin/products/new', requireAuth, (req, res) => {
  res.render('admin/product-edit', { product: null, path: '/admin/products' });
});

app.get('/admin/products/:id/edit', requireAuth, async (req, res) => {
  try {
    const product = await db.getProductById(req.params.id);
    if (!product) {
      req.flash('error', '产品不存在');
      return res.redirect('/admin/products');
    }
    res.render('admin/product-edit', { product, path: '/admin/products' });
  } catch (error) {
    console.error('编辑产品错误:', error);
    req.flash('error', '获取产品失败');
    res.redirect('/admin/products');
  }
});

app.post('/admin/products', requireAuth, upload.array('images', 5), async (req, res) => {
  try {
    const { name, slug, description, short_description, tech_stack, project_url, github_url, featured, display_order } = req.body;
    
    const existingProduct = await db.getProductBySlug(slug);
    if (existingProduct) {
      req.flash('error', 'URL别名已存在');
      return res.redirect('/admin/products/new');
    }
    
    const images = req.files && req.files.length > 0 
      ? req.files.map(f => `data:${f.mimetype};base64,${f.buffer.toString('base64')}`).join(',')
      : '';
    
    await db.createProduct({
      name,
      slug,
      description,
      short_description,
      images,
      tech_stack,
      project_url,
      github_url,
      featured: featured ? 1 : 0,
      display_order: parseInt(display_order) || 0
    });
    
    req.flash('success', '产品创建成功');
    res.redirect('/admin/products');
  } catch (error) {
    console.error('创建产品错误:', error);
    req.flash('error', '创建产品失败');
    res.redirect('/admin/products/new');
  }
});

app.put('/admin/products/:id', requireAuth, upload.array('images', 5), async (req, res) => {
  try {
    const { name, slug, description, short_description, tech_stack, project_url, github_url, featured, display_order } = req.body;
    const productId = parseInt(req.params.id);
    
    const product = await db.getProductById(productId);
    if (!product) {
      req.flash('error', '产品不存在');
      return res.redirect('/admin/products');
    }
    
    const existingProduct = await db.getProductBySlug(slug);
    if (existingProduct && existingProduct.id !== productId) {
      req.flash('error', 'URL别名已被其他产品使用');
      return res.redirect(`/admin/products/${productId}/edit`);
    }
    
    const updateData = {
      name,
      slug,
      description,
      short_description,
      tech_stack,
      project_url,
      github_url,
      featured: featured ? 1 : 0,
      display_order: parseInt(display_order) || 0
    };
    
    if (req.files && req.files.length > 0) {
      updateData.images = req.files.map(f => `data:${f.mimetype};base64,${f.buffer.toString('base64')}`).join(',');
    }
    
    await db.updateProduct(productId, updateData);
    
    req.flash('success', '产品更新成功');
    res.redirect('/admin/products');
  } catch (error) {
    console.error('更新产品错误:', error);
    req.flash('error', '更新产品失败');
    res.redirect(`/admin/products/${req.params.id}/edit`);
  }
});

app.delete('/admin/products/:id', requireAuth, async (req, res) => {
  try {
    const productId = parseInt(req.params.id);
    await db.deleteProduct(productId);
    req.flash('success', '产品删除成功');
  } catch (error) {
    console.error('删除产品错误:', error);
    req.flash('error', '删除产品失败');
  }
  res.redirect('/admin/products');
});

// ========== 个人资料管理 ==========

app.get('/admin/profile', requireAuth, async (req, res) => {
  try {
    const profile = await db.getProfile();
    res.render('admin/profile', { profile: profile || {}, path: '/admin/profile', success: req.flash('success'), error: req.flash('error') });
  } catch (error) {
    console.error('获取个人资料错误:', error);
    res.status(500).send('服务器错误');
  }
});

app.put('/admin/profile', requireAuth, upload.single('avatar'), async (req, res) => {
  try {
    const { name, title, bio, email, phone, location, github, twitter, linkedin, wechat, skills } = req.body;
    
    const updateData = {
      name,
      title,
      bio,
      email,
      phone,
      location,
      github,
      twitter,
      linkedin,
      wechat,
      skills
    };
    
    if (req.file) {
      updateData.avatar = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    }
    
    await db.updateProfile(updateData);
    
    req.flash('success', '个人资料更新成功');
    res.redirect('/admin/profile');
  } catch (error) {
    console.error('更新个人资料错误:', error);
    req.flash('error', '更新个人资料失败');
    res.redirect('/admin/profile');
  }
});

// ========== API 路由（用于 OpenClaw/自动化工具）==========

// 验证 API Key 的中间件
const verifyApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  if (apiKey !== process.env.API_KEY) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Invalid API Key' });
  }
  next();
};

// 发布文章 API
app.post('/api/articles', verifyApiKey, async (req, res) => {
  try {
    const { title, slug, content, excerpt, category, tags, status, cover_image } = req.body;
    
    // 验证必填字段
    if (!title || !slug || !content) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: title, slug, content' 
      });
    }
    
    // 检查 slug 是否已存在
    const existingArticle = await db.getArticleBySlug(slug);
    if (existingArticle) {
      return res.status(409).json({ 
        success: false, 
        error: 'Article with this slug already exists' 
      });
    }
    
    // 创建文章
    const article = await db.createArticle({
      title,
      slug,
      content,
      excerpt: excerpt || content.substring(0, 200) + '...',
      category: category || '默认分类',
      tags: tags || '',
      status: status || 'published',
      cover_image: cover_image || null
    });
    
    res.json({ 
      success: true, 
      message: 'Article created successfully',
      data: {
        id: article.id,
        title: article.title,
        slug: article.slug,
        url: `https://${req.headers.host}/articles/${article.slug}`
      }
    });
  } catch (error) {
    console.error('API 创建文章错误:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error',
      details: error.message 
    });
  }
});

// 获取文章列表 API（用于验证）
app.get('/api/articles', verifyApiKey, async (req, res) => {
  try {
    const articles = await db.getAllArticles();
    res.json({ 
      success: true, 
      count: articles.length,
      data: articles.map(a => ({
        id: a.id,
        title: a.title,
        slug: a.slug,
        status: a.status,
        created_at: a.created_at
      }))
    });
  } catch (error) {
    console.error('API 获取文章错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 健康检查 API（无需验证）
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    database: db.isDatabaseConfigured() ? 'connected' : 'not configured'
  });
});

// 404页面
app.use((req, res) => {
  res.status(404).render('404');
});

// 本地开发环境启动服务器
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, async () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
    console.log(`后台管理: http://localhost:${PORT}/admin/login`);
    
    // 初始化数据库
    await db.initializeDatabase();
    
    if (!db.isDatabaseConfigured()) {
      console.log('\n⚠️ 警告: 数据库未配置，请在 Vercel 环境变量中设置数据库连接信息');
      console.log('本地测试时，可以创建 .env 文件设置环境变量\n');
    }
  });
}

module.exports = app;
