/**
 * Supabase PostgreSQL 数据库连接模块
 * 使用 pg 驱动连接 Supabase
 */

const { Pool } = require('pg');

// 数据库配置 - 从环境变量读取
// Supabase 连接字符串格式: postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Supabase 需要这个
  }
});

// 检查是否配置了数据库
const isDatabaseConfigured = () => {
  return !!process.env.DATABASE_URL;
};

// 测试数据库连接
const testConnection = async () => {
  if (!isDatabaseConfigured()) return false;
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch (error) {
    console.error('数据库连接失败:', error.message);
    return false;
  }
};

// 执行查询的辅助函数
const query = async (text, params) => {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
};

// ========== 文章相关操作 ==========

// 获取所有文章
async function getAllArticles() {
  if (!isDatabaseConfigured()) return [];
  const result = await query('SELECT * FROM articles ORDER BY created_at DESC');
  return result.rows;
}

// 获取已发布文章
async function getPublishedArticles() {
  if (!isDatabaseConfigured()) return [];
  const result = await query(
    'SELECT * FROM articles WHERE status = $1 ORDER BY created_at DESC',
    ['published']
  );
  return result.rows;
}

// 根据 slug 获取文章
async function getArticleBySlug(slug) {
  if (!isDatabaseConfigured()) return null;
  const result = await query('SELECT * FROM articles WHERE slug = $1', [slug]);
  return result.rows[0] || null;
}

// 根据 ID 获取文章
async function getArticleById(id) {
  if (!isDatabaseConfigured()) return null;
  const result = await query('SELECT * FROM articles WHERE id = $1', [id]);
  return result.rows[0] || null;
}

// 创建文章
async function createArticle(article) {
  if (!isDatabaseConfigured()) return null;
  const { title, slug, content, excerpt, cover_image, category, tags, status } = article;
  const result = await query(
    `INSERT INTO articles (title, slug, content, excerpt, cover_image, category, tags, status, view_count) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0) RETURNING *`,
    [title, slug, content, excerpt, cover_image, category, tags, status]
  );
  return result.rows[0];
}

// 更新文章
async function updateArticle(id, article) {
  if (!isDatabaseConfigured()) return false;
  const { title, slug, content, excerpt, cover_image, category, tags, status } = article;
  
  let sql = `UPDATE articles SET title = $1, slug = $2, content = $3, excerpt = $4, category = $5, tags = $6, status = $7, updated_at = NOW()`;
  let params = [title, slug, content, excerpt, category, tags, status];
  
  if (cover_image !== undefined) {
    sql += `, cover_image = $8`;
    params.push(cover_image);
    sql += ` WHERE id = $9`;
    params.push(id);
  } else {
    sql += ` WHERE id = $8`;
    params.push(id);
  }
  
  await query(sql, params);
  return true;
}

// 删除文章
async function deleteArticle(id) {
  if (!isDatabaseConfigured()) return false;
  await query('DELETE FROM articles WHERE id = $1', [id]);
  return true;
}

// 增加文章浏览量
async function incrementArticleViews(id) {
  if (!isDatabaseConfigured()) return;
  await query('UPDATE articles SET view_count = view_count + 1 WHERE id = $1', [id]);
}

// ========== 产品相关操作 ==========

// 获取所有产品
async function getAllProducts() {
  if (!isDatabaseConfigured()) return [];
  const result = await query(
    'SELECT * FROM products ORDER BY featured DESC, display_order ASC, created_at DESC'
  );
  return result.rows;
}

// 根据 slug 获取产品
async function getProductBySlug(slug) {
  if (!isDatabaseConfigured()) return null;
  const result = await query('SELECT * FROM products WHERE slug = $1', [slug]);
  return result.rows[0] || null;
}

// 根据 ID 获取产品
async function getProductById(id) {
  if (!isDatabaseConfigured()) return null;
  const result = await query('SELECT * FROM products WHERE id = $1', [id]);
  return result.rows[0] || null;
}

// 创建产品
async function createProduct(product) {
  if (!isDatabaseConfigured()) return null;
  const { name, slug, description, short_description, images, tech_stack, project_url, github_url, featured, display_order } = product;
  const result = await query(
    `INSERT INTO products (name, slug, description, short_description, images, tech_stack, project_url, github_url, featured, display_order) 
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
    [name, slug, description, short_description, images, tech_stack, project_url, github_url, featured ? 1 : 0, display_order || 0]
  );
  return result.rows[0];
}

// 更新产品
async function updateProduct(id, product) {
  if (!isDatabaseConfigured()) return false;
  const { name, slug, description, short_description, images, tech_stack, project_url, github_url, featured, display_order } = product;
  
  let sql = `UPDATE products SET name = $1, slug = $2, description = $3, short_description = $4, tech_stack = $5, project_url = $6, github_url = $7, featured = $8, display_order = $9, updated_at = NOW()`;
  let params = [name, slug, description, short_description, tech_stack, project_url, github_url, featured ? 1 : 0, display_order || 0];
  
  if (images !== undefined) {
    sql += `, images = $10`;
    params.push(images);
    sql += ` WHERE id = $11`;
    params.push(id);
  } else {
    sql += ` WHERE id = $10`;
    params.push(id);
  }
  
  await query(sql, params);
  return true;
}

// 删除产品
async function deleteProduct(id) {
  if (!isDatabaseConfigured()) return false;
  await query('DELETE FROM products WHERE id = $1', [id]);
  return true;
}

// ========== 管理员相关操作 ==========

// 根据用户名获取管理员
async function getAdminByUsername(username) {
  if (!isDatabaseConfigured()) return null;
  const result = await query('SELECT * FROM admins WHERE username = $1', [username]);
  return result.rows[0] || null;
}

// 更新管理员最后登录时间
async function updateAdminLastLogin(id) {
  if (!isDatabaseConfigured()) return;
  await query('UPDATE admins SET last_login = NOW() WHERE id = $1', [id]);
}

// ========== 个人资料相关操作 ==========

// 获取个人资料
async function getProfile() {
  if (!isDatabaseConfigured()) return null;
  const result = await query('SELECT * FROM profile WHERE id = 1');
  return result.rows[0] || null;
}

// 更新个人资料
async function updateProfile(profile) {
  if (!isDatabaseConfigured()) return false;
  const { name, title, bio, email, phone, location, github, twitter, linkedin, wechat, skills, avatar } = profile;
  
  let sql = `UPDATE profile SET name = $1, title = $2, bio = $3, email = $4, phone = $5, location = $6, github = $7, twitter = $8, linkedin = $9, wechat = $10, skills = $11`;
  let params = [name, title, bio, email, phone, location, github, twitter, linkedin, wechat, skills];
  
  if (avatar !== undefined) {
    sql += `, avatar = $12`;
    params.push(avatar);
  }
  
  sql += ` WHERE id = 1`;
  
  await query(sql, params);
  return true;
}

// ========== 统计数据 ==========

// 获取文章统计
async function getArticleStats() {
  if (!isDatabaseConfigured()) {
    return { total: 0, published: 0, totalViews: 0 };
  }
  const totalResult = await query('SELECT COUNT(*) as count FROM articles');
  const publishedResult = await query('SELECT COUNT(*) as count FROM articles WHERE status = $1', ['published']);
  const viewsResult = await query('SELECT SUM(view_count) as total FROM articles');
  return {
    total: parseInt(totalResult.rows[0].count),
    published: parseInt(publishedResult.rows[0].count),
    totalViews: parseInt(viewsResult.rows[0].total) || 0
  };
}

// 获取产品统计
async function getProductCount() {
  if (!isDatabaseConfigured()) return 0;
  const result = await query('SELECT COUNT(*) as count FROM products');
  return parseInt(result.rows[0].count);
}

// 初始化数据库（插入默认数据）
async function initializeDatabase() {
  if (!isDatabaseConfigured()) {
    console.log('⚠️ 数据库未配置，跳过初始化');
    return;
  }
  
  const connected = await testConnection();
  if (!connected) {
    console.error('❌ 无法连接到数据库');
    return;
  }
  
  try {
    // 检查是否有管理员账号
    const adminResult = await query('SELECT COUNT(*) as count FROM admins');
    if (parseInt(adminResult.rows[0].count) === 0) {
      // 插入默认管理员
      const bcrypt = require('bcryptjs');
      const passwordHash = bcrypt.hashSync('jianbing2024', 10);
      await query(
        'INSERT INTO admins (username, password_hash, email) VALUES ($1, $2, $3)',
        ['admin', passwordHash, 'admin@jianbing.dev']
      );
      console.log('✅ 默认管理员已创建: admin / jianbing2024');
    }
    
    // 检查是否有个人资料
    const profileResult = await query('SELECT COUNT(*) as count FROM profile');
    if (parseInt(profileResult.rows[0].count) === 0) {
      await query(
        `INSERT INTO profile (id, name, title, avatar, bio, email, location, skills) 
         VALUES (1, $1, $2, $3, $4, $5, $6, $7)`,
        ['煎饼', 'AI行动家', '/images/avatar.jpg', '专注于AI智能体开发与编程业务，探索人工智能的无限可能。', 'hello@jianbing.dev', '中国', 'AI智能体,Python,LangChain,OpenAI,React,Node.js,TypeScript']
      );
      console.log('✅ 默认个人资料已创建');
    }
    
    console.log('✅ 数据库初始化完成');
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error.message);
  }
}

module.exports = {
  isDatabaseConfigured,
  initializeDatabase,
  // 文章
  getAllArticles,
  getPublishedArticles,
  getArticleBySlug,
  getArticleById,
  createArticle,
  updateArticle,
  deleteArticle,
  incrementArticleViews,
  // 产品
  getAllProducts,
  getProductBySlug,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  // 管理员
  getAdminByUsername,
  updateAdminLastLogin,
  // 个人资料
  getProfile,
  updateProfile,
  // 统计
  getArticleStats,
  getProductCount
};
