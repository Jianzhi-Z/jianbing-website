const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

// 默认数据
const defaultData = {
  articles: [],
  products: [],
  admins: [],
  profile: {
    id: 1,
    name: '煎饼',
    title: 'AI行动家',
    avatar: '/images/avatar.jpg',
    bio: '专注于AI智能体开发与编程业务，探索人工智能的无限可能。',
    email: 'hello@jianbing.dev',
    phone: '',
    location: '中国',
    github: '',
    twitter: '',
    linkedin: '',
    wechat: '',
    skills: 'AI智能体,Python,LangChain,OpenAI,React,Node.js,TypeScript'
  }
};

// 读取数据库
function readDB() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('读取数据库失败:', error);
  }
  return { ...defaultData };
}

// 写入数据库
function writeDB(data) {
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('写入数据库失败:', error);
    return false;
  }
}

// 初始化数据库
function initDB() {
  const data = readDB();
  
  // 确保所有表存在
  if (!data.articles) data.articles = [];
  if (!data.products) data.products = [];
  if (!data.admins) data.admins = [];
  if (!data.profile) data.profile = defaultData.profile;
  
  writeDB(data);
  return data;
}

module.exports = {
  readDB,
  writeDB,
  initDB,
  defaultData
};
