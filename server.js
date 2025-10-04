import express from 'express';
import cors from 'cors'; // 导入 cors
const app = express();
const PORT = process.env.PORT || 5002; 
const HOST = '0.0.0.0';  

// 假设你的前端部署在 https://your-frontend-domain.com
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'https://auth.webhost.innocation.dpdns.org',
      'https://webhost.innocation.dpdns.org',
      // WARNING: 在生产环境中，不应该允许内部 IP，但为了测试暂时保留
      'http://192.168.5.228:5002',
      'http://localhost:5173', // Vite 默认端口
    ];

    // 允许没有 Origin 头部（如 curl 或 Postman）或在白名单内的请求
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true); // ✅ 允许
    } else {
      // ❌ 拒绝：通过返回 false 而不是抛出 Error 来防止进程崩溃
      // 这会允许 CORS 中间件返回 403 Forbidden 响应
      callback(null, false); 
    }
  },
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
};

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
  console.log('Version endpoint was hit');
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