import express from 'express';
import cors from 'cors'; // 导入 cors
const app = express();
const PORT = process.env.PORT || 40050; 
const HOST = '0.0.0.0'; 

// 假设你的前端部署在 https://your-frontend-domain.com
const allowedOrigins = [
    'https://auth.webhost.innocation.dpdns.org', // 替换为你实际的前端域名！
    'https://webhost.innocation.dpdns.org' // 如果前端也部署在这个域名下，也加进来
];

// 配置 CORS 选项
const corsOptions = {
  origin: function (origin, callback) {
    // 允许来自特定域名的请求，或者允许没有 origin 的请求（如Postman、curl、同源请求）
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // 允许的 HTTP 方法
  credentials: true, // 允许发送 Cookie (对应你的 fetch 中的 credentials: 'include')
};

// 将 CORS 中间件应用于你的 API 路由之前
app.use(cors(corsOptions)); 


// 定义一个简单的 GET 路由
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'GitHub Actions Deployment Test Successful!',
    timestamp: new Date().toISOString(),
    service: 'Test Express App'
  });
});

// 如果你想部署后修改版本来测试更新
app.get('/version', (req, res) => {
  res.json({
    version: '1.0.2', // 部署成功后，你可以修改这里来测试更新
    deployedBy: 'GitHub Actions'
  });
});

// 启动服务器
app.listen(PORT, HOST, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Access at: http://your_host_ip:${PORT}`);
});