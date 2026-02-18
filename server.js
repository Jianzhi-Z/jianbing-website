const express = require('express');
const path = require('path');
const session = require('express-session');
const flash = require('connect-flash');
const methodOverride = require('method-override');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const { marked } = require('marked');
const { readDB, writeDB, initDB } = require('./lib/db');

const app = express();
const PORT = process.env.PORT || 3000;

// 初始化数据库
let db = initDB();

// 创建默认管理员
if (db.admins.length === 0) {
  const hashedPassword = bcrypt.hashSync('jianbing2024', 10);
  db.admins.push({
    id: 1,
    username: 'admin',
    password_hash: hashedPassword,
    email: 'admin@jianbing.dev',
    created_at: new Date().toISOString(),
    last_login: null
  });
  writeDB(db);
  console.log('默认管理员创建成功: admin / jianbing2024');
}

// 配置中间件
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));
app.use(express.static('public'));
app.use(session({
  secret: process.env.SESSION_SECRET || 'jianbing-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));
app.use(flash());

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

// 文件上传配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/images/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
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
app.get('/', (req, res) => {
  db = readDB();
  const articles = db.articles
    .filter(a => a.status === 'published')
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 3);
  const products = db.products
    .sort((a, b) => (b.featured - a.featured) || (a.display_order - b.display_order))
    .slice(0, 4);
  res.render('index', { articles, products, profile: db.profile, path: '/' });
});

// 文章列表
app.get('/articles', (req, res) => {
  db = readDB();
  const category = req.query.category;
  let articles = db.articles.filter(a => a.status === 'published');
  if (category && category !== '全部') {
    articles = articles.filter(a => a.category === category);
  }
  articles.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const categories = [...new Set(db.articles.filter(a => a.status === 'published').map(a => a.category))];
  res.render('articles', { articles, categories, currentCategory: category || '全部', path: '/articles' });
});

// 文章详情
app.get('/articles/:slug', (req, res) => {
  db = readDB();
  const article = db.articles.find(a => a.slug === req.params.slug && a.status === 'published');
  if (!article) {
    return res.status(404).render('404');
  }
  article.view_count = (article.view_count || 0) + 1;
  writeDB(db);
  const relatedArticles = db.articles
    .filter(a => a.status === 'published' && a.id !== article.id && a.category === article.category)
    .slice(0, 3);
  res.render('article-detail', { article, relatedArticles, path: '/articles' });
});

// 产品列表
app.get('/products', (req, res) => {
  db = readDB();
  const products = db.products
    .sort((a, b) => (b.featured - a.featured) || (a.display_order - b.display_order));
  res.render('products', { products, path: '/products' });
});

// 产品详情
app.get('/products/:slug', (req, res) => {
  db = readDB();
  const product = db.products.find(p => p.slug === req.params.slug);
  if (!product) {
    return res.status(404).render('404');
  }
  res.render('product-detail', { product, path: '/products' });
});

// 关于页面
app.get('/about', (req, res) => {
  db = readDB();
  const products = db.products.slice(0, 3);
  res.render('about', { profile: db.profile, products, path: '/about' });
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
app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;
  db = readDB();
  const admin = db.admins.find(a => a.username === username);
  
  if (admin && bcrypt.compareSync(password, admin.password_hash)) {
    req.session.adminId = admin.id;
    admin.last_login = new Date().toISOString();
    writeDB(db);
    res.redirect('/admin/dashboard');
  } else {
    req.flash('error', '用户名或密码错误');
    res.redirect('/admin/login');
  }
});

// 登出
app.get('/admin/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/admin/login');
});

// 后台仪表盘
app.get('/admin/dashboard', requireAuth, (req, res) => {
  db = readDB();
  const stats = {
    articles: db.articles.length,
    publishedArticles: db.articles.filter(a => a.status === 'published').length,
    products: db.products.length,
    totalViews: db.articles.reduce((sum, a) => sum + (a.view_count || 0), 0)
  };
  const recentArticles = db.articles
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    .slice(0, 5);
  const recentProducts = db.products
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    .slice(0, 5);
  res.render('admin/dashboard', { stats, recentArticles, recentProducts, path: '/admin/dashboard' });
});

// ========== 文章管理 ==========

app.get('/admin/articles', requireAuth, (req, res) => {
  db = readDB();
  const articles = db.articles.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.render('admin/articles', { articles, path: '/admin/articles', success: req.flash('success'), error: req.flash('error') });
});

app.get('/admin/articles/new', requireAuth, (req, res) => {
  res.render('admin/article-edit', { article: null, path: '/admin/articles' });
});

app.get('/admin/articles/:id/edit', requireAuth, (req, res) => {
  db = readDB();
  const article = db.articles.find(a => a.id === parseInt(req.params.id));
  if (!article) {
    req.flash('error', '文章不存在');
    return res.redirect('/admin/articles');
  }
  res.render('admin/article-edit', { article, path: '/admin/articles' });
});

app.post('/admin/articles', requireAuth, upload.single('cover_image'), (req, res) => {
  const { title, slug, content, excerpt, category, tags, status } = req.body;
  const coverImage = req.file ? `/images/${req.file.filename}` : null;
  
  db = readDB();
  
  if (db.articles.find(a => a.slug === slug)) {
    req.flash('error', 'URL别名已存在');
    return res.redirect('/admin/articles/new');
  }
  
  const newArticle = {
    id: Date.now(),
    title,
    slug,
    content,
    excerpt,
    cover_image: coverImage,
    category,
    tags,
    status,
    view_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  db.articles.push(newArticle);
  writeDB(db);
  
  req.flash('success', '文章创建成功');
  res.redirect('/admin/articles');
});

app.put('/admin/articles/:id', requireAuth, upload.single('cover_image'), (req, res) => {
  const { title, slug, content, excerpt, category, tags, status } = req.body;
  const articleId = parseInt(req.params.id);
  
  db = readDB();
  const articleIndex = db.articles.findIndex(a => a.id === articleId);
  
  if (articleIndex === -1) {
    req.flash('error', '文章不存在');
    return res.redirect('/admin/articles');
  }
  
  const existingArticle = db.articles.find(a => a.slug === slug && a.id !== articleId);
  if (existingArticle) {
    req.flash('error', 'URL别名已被其他文章使用');
    return res.redirect(`/admin/articles/${articleId}/edit`);
  }
  
  const article = db.articles[articleIndex];
  article.title = title;
  article.slug = slug;
  article.content = content;
  article.excerpt = excerpt;
  article.category = category;
  article.tags = tags;
  article.status = status;
  article.updated_at = new Date().toISOString();
  
  if (req.file) {
    article.cover_image = `/images/${req.file.filename}`;
  }
  
  writeDB(db);
  
  req.flash('success', '文章更新成功');
  res.redirect('/admin/articles');
});

app.delete('/admin/articles/:id', requireAuth, (req, res) => {
  const articleId = parseInt(req.params.id);
  
  db = readDB();
  const articleIndex = db.articles.findIndex(a => a.id === articleId);
  
  if (articleIndex > -1) {
    db.articles.splice(articleIndex, 1);
    writeDB(db);
    req.flash('success', '文章删除成功');
  } else {
    req.flash('error', '文章不存在');
  }
  
  res.redirect('/admin/articles');
});

// ========== 产品管理 ==========

app.get('/admin/products', requireAuth, (req, res) => {
  db = readDB();
  const products = db.products.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  res.render('admin/products', { products, path: '/admin/products', success: req.flash('success'), error: req.flash('error') });
});

app.get('/admin/products/new', requireAuth, (req, res) => {
  res.render('admin/product-edit', { product: null, path: '/admin/products' });
});

app.get('/admin/products/:id/edit', requireAuth, (req, res) => {
  db = readDB();
  const product = db.products.find(p => p.id === parseInt(req.params.id));
  if (!product) {
    req.flash('error', '产品不存在');
    return res.redirect('/admin/products');
  }
  res.render('admin/product-edit', { product, path: '/admin/products' });
});

app.post('/admin/products', requireAuth, upload.array('images', 5), (req, res) => {
  const { name, slug, description, short_description, tech_stack, project_url, github_url, featured, display_order } = req.body;
  const images = req.files.map(f => `/images/${f.filename}`).join(',');
  
  db = readDB();
  
  if (db.products.find(p => p.slug === slug)) {
    req.flash('error', 'URL别名已存在');
    return res.redirect('/admin/products/new');
  }
  
  const newProduct = {
    id: Date.now(),
    name,
    slug,
    description,
    short_description,
    images,
    tech_stack,
    project_url,
    github_url,
    featured: featured ? 1 : 0,
    display_order: parseInt(display_order) || 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  db.products.push(newProduct);
  writeDB(db);
  
  req.flash('success', '产品创建成功');
  res.redirect('/admin/products');
});

app.put('/admin/products/:id', requireAuth, upload.array('images', 5), (req, res) => {
  const { name, slug, description, short_description, tech_stack, project_url, github_url, featured, display_order } = req.body;
  const productId = parseInt(req.params.id);
  
  db = readDB();
  const productIndex = db.products.findIndex(p => p.id === productId);
  
  if (productIndex === -1) {
    req.flash('error', '产品不存在');
    return res.redirect('/admin/products');
  }
  
  const existingProduct = db.products.find(p => p.slug === slug && p.id !== productId);
  if (existingProduct) {
    req.flash('error', 'URL别名已被其他产品使用');
    return res.redirect(`/admin/products/${productId}/edit`);
  }
  
  const product = db.products[productIndex];
  product.name = name;
  product.slug = slug;
  product.description = description;
  product.short_description = short_description;
  product.tech_stack = tech_stack;
  product.project_url = project_url;
  product.github_url = github_url;
  product.featured = featured ? 1 : 0;
  product.display_order = parseInt(display_order) || 0;
  product.updated_at = new Date().toISOString();
  
  if (req.files && req.files.length > 0) {
    product.images = req.files.map(f => `/images/${f.filename}`).join(',');
  }
  
  writeDB(db);
  
  req.flash('success', '产品更新成功');
  res.redirect('/admin/products');
});

app.delete('/admin/products/:id', requireAuth, (req, res) => {
  const productId = parseInt(req.params.id);
  
  db = readDB();
  const productIndex = db.products.findIndex(p => p.id === productId);
  
  if (productIndex > -1) {
    db.products.splice(productIndex, 1);
    writeDB(db);
    req.flash('success', '产品删除成功');
  } else {
    req.flash('error', '产品不存在');
  }
  
  res.redirect('/admin/products');
});

// ========== 个人资料管理 ==========

app.get('/admin/profile', requireAuth, (req, res) => {
  db = readDB();
  res.render('admin/profile', { profile: db.profile, path: '/admin/profile', success: req.flash('success'), error: req.flash('error') });
});

app.put('/admin/profile', requireAuth, upload.single('avatar'), (req, res) => {
  const { name, title, bio, email, phone, location, github, twitter, linkedin, wechat, skills } = req.body;
  
  db = readDB();
  
  db.profile = {
    ...db.profile,
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
    skills,
    updated_at: new Date().toISOString()
  };
  
  if (req.file) {
    db.profile.avatar = `/images/${req.file.filename}`;
  }
  
  writeDB(db);
  
  req.flash('success', '个人资料更新成功');
  res.redirect('/admin/profile');
});

// 404页面
app.use((req, res) => {
  res.status(404).render('404');
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
  console.log(`后台管理: http://localhost:${PORT}/admin/login`);
  console.log(`默认账号: admin / jianbing2024`);
});

module.exports = app;
