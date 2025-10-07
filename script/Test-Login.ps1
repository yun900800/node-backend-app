# ----------------------------------------------------------------------
# PowerShell 脚本: 测试 Node.js 后端 JWT 认证流程
# ----------------------------------------------------------------------

$PSDefaultParameterValues['*:Encoding'] = 'utf8'

# 配置变量
# $BaseUrl = "http://localhost:5002/api"
$BaseUrl = "https://bayh.pp.ua/api"
$RegisterUrl = "$BaseUrl/auth/register" # 新增注册 URL
$LoginUrl = "$BaseUrl/auth/login"
$ProfileUrl = "$BaseUrl/profile"
$Email = "testuser_$(Get-Random).@example.com" # 使用随机邮箱确保每次测试都注册新用户
$Password = "password123" 

# 如果你想使用固定的邮箱，请取消注释下一行，并注释掉上面的随机邮箱行
# $Email = "fixeduser@example.com"


# ------------------------------------
# 步骤 1: 注册新用户
# ------------------------------------
Write-Host ">>> 1. Attempting to register new user: $Email..." -ForegroundColor Cyan

# 构建请求体 (JSON格式)
$Body = @{
    email    = $Email
    password = $Password
} | ConvertTo-Json

try {
    # 发送 POST 请求到注册路由
    $RegisterResponse = Invoke-RestMethod -Uri $RegisterUrl -Method Post -Body $Body -ContentType "application/json" -TimeoutSec 10

    # 检查响应是否成功
    if ($RegisterResponse.userId) {
        Write-Host "Registration Successful! User ID: $($RegisterResponse.userId)" -ForegroundColor Green
    } else {
        Write-Host "Registration Failed: Unexpected response structure." -ForegroundColor Red
        Write-Host "Response:" $RegisterResponse
        # 即使结构异常，也继续尝试登录，以防后端直接返回Token
    }

} catch {
    # 捕获 409 Conflict (用户已存在)
    if ($_.Exception.Response.StatusCode -eq 409) {
        Write-Host "Registration Warning: User $Email already exists (Status 409). Continuing to login." -ForegroundColor Yellow
        # 如果用户已存在，则继续执行登录步骤
    } 
    # 捕获其他错误
    elseif ($_.Exception) {
        Write-Host "Registration Failed! An error occurred during the request." -ForegroundColor Red
        Write-Host "Error Details: $($_.Exception.Message)"
        exit 1
    }
}

# ------------------------------------
# 步骤 2: 登录并获取 JWT Token
# ------------------------------------
Write-Host "`n>>> 2. Attempting to log in and retrieve JWT token..." -ForegroundColor Cyan

# 请求体沿用步骤 1 的 $Body
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
# 步骤 3: 使用 Token 访问受保护的 /api/profile 资源
# ------------------------------------
Write-Host "`n>>> 3. Accessing protected resource ($ProfileUrl)..." -ForegroundColor Cyan

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
# 步骤 4: 尝试使用过期/无效 Token 访问 (可选验证)
# ------------------------------------
Write-Host "`n>>> 4. Testing access without a valid token (Expected 401)..." -ForegroundColor Yellow
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
