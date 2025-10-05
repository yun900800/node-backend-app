# ----------------------------------------------------------------------
# PowerShell 脚本: 测试 Node.js 后端 JWT 认证流程
# ----------------------------------------------------------------------

$PSDefaultParameterValues['*:Encoding'] = 'utf8'
# 配置变量
$BaseUrl = "http://localhost:5002/api"
$LoginUrl = "$BaseUrl/auth/login"
$ProfileUrl = "$BaseUrl/profile"
$Email = "user@example.com"      # 替换为您的测试邮箱
$Password = "password123"        # 替换为您的测试密码

# ------------------------------------
# 步骤 1: 登录并获取 JWT Token
# ------------------------------------
Write-Host ">>> 1. Attempting to log in and retrieve JWT token..." -ForegroundColor Cyan

# 构建请求体 (JSON格式)
$Body = @{
    email    = $Email
    password = $Password
} | ConvertTo-Json

try {
    # 发送 POST 请求到登录路由
    $LoginResponse = Invoke-RestMethod -Uri $LoginUrl -Method Post -Body $Body -ContentType "application/json" -TimeoutSec 10

    # 检查响应是否包含 Token
    if ($LoginResponse.token) {
        $Token = $LoginResponse.token
        Write-Host "Login Successful! Token retrieved (Expires in $($LoginResponse.expiresIn) seconds)." -ForegroundColor Green
        # Write-Host "Token: $Token" # 生产环境中不应打印 Token
    } else {
        Write-Host "Login Failed: Response did not contain a token." -ForegroundColor Red
        Write-Host "Response:" $LoginResponse
        exit 1
    }

} catch {
    Write-Host "Login Failed! An error occurred during the request." -ForegroundColor Red
    Write-Host "Error Details: $($_.Exception.Message)"
    exit 1
}

# ------------------------------------
# 步骤 2: 使用 Token 访问受保护的 /api/profile 资源
# ------------------------------------
Write-Host "`n>>> 2. Accessing protected resource ($ProfileUrl)..." -ForegroundColor Cyan

# 构建包含 JWT Token 的授权头部
$Headers = @{
    Authorization = "Bearer $Token"
}

try {
    # 发送 GET 请求到受保护的路由
    $ProfileResponse = Invoke-RestMethod -Uri $ProfileUrl -Method Get -Headers $Headers -TimeoutSec 10

    Write-Host "Profile Access Successful (Status 200)!" -ForegroundColor Green
    Write-Host "Response Data:"
    $ProfileResponse | ConvertTo-Json -Depth 5 | Write-Host
    
} catch {
    # 捕获 401 Unauthorized 错误
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "Profile Access Failed: Server returned 401 Unauthorized." -ForegroundColor Red
    } else {
        Write-Host "Profile Access Failed! An unexpected error occurred." -ForegroundColor Red
        Write-Host "Error Details: $($_.Exception.Message)"
    }
    exit 1
}

# ------------------------------------
# 步骤 3: 尝试使用过期/无效 Token 访问 (可选验证)
# ------------------------------------
Write-Host "`n>>> 3. Testing access without a valid token (Expected 401)..." -ForegroundColor Yellow
$InvalidHeaders = @{ Authorization = "Bearer THIS.IS.AN.INVALID.TOKEN" }
try {
    Invoke-RestMethod -Uri $ProfileUrl -Method Get -Headers $InvalidHeaders -TimeoutSec 5
    Write-Host "ERROR: Resource accessed with an invalid token (Should have failed with 401)." -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "Successfully received expected 401 Unauthorized response." -ForegroundColor Green
    } else {
        Write-Host "Warning: Failed, but not with the expected 401 status." -ForegroundColor Yellow
    }
}