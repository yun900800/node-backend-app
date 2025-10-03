const express = require('express');
const app = express();
const PORT = 3000; // 请确保这个端口在你的小主机上是开放的且未被占用

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
    version: '1.0.0', // 部署成功后，你可以修改这里来测试更新
    deployedBy: 'GitHub Actions'
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Access at: http://your_host_ip:${PORT}`);
});