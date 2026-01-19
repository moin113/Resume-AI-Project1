# Elastic Beanstalk Deployment Script
# Run this to deploy Phase 3 & 4 to AWS

Write-Host "================================" -ForegroundColor Cyan
Write-Host "  Phase 3 & 4 EB Deployment" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

# Step 1: Verify configuration
Write-Host "`n[1/5] Verifying configuration..." -ForegroundColor Yellow
python verify_phase3_phase4.py
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Configuration verification failed!" -ForegroundColor Red
    Write-Host "Fix the errors above before deploying." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Configuration verified" -ForegroundColor Green

# Step 2: Check EB CLI
Write-Host "`n[2/5] Checking EB CLI..." -ForegroundColor Yellow
$ebInstalled = Get-Command eb -ErrorAction SilentlyContinue
if (-not $ebInstalled) {
    Write-Host "❌ EB CLI not found!" -ForegroundColor Red
    Write-Host "Install it with: pip install awsebcli" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ EB CLI found" -ForegroundColor Green

# Step 3: Check git status
Write-Host "`n[3/5] Checking git status..." -ForegroundColor Yellow
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Host "⚠️  Uncommitted changes detected:" -ForegroundColor Yellow
    git status --short
    $commit = Read-Host "`nCommit changes before deploying? (y/n)"
    if ($commit -eq 'y') {
        $message = Read-Host "Enter commit message"
        git add .
        git commit -m "$message"
        Write-Host "✅ Changes committed" -ForegroundColor Green
    }
} else {
    Write-Host "✅ No uncommitted changes" -ForegroundColor Green
}

# Step 4: Deploy to EB
Write-Host "`n[4/5] Deploying to Elastic Beanstalk..." -ForegroundColor Yellow
Write-Host "This may take a few minutes..." -ForegroundColor Gray

eb deploy

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    Write-Host "Check the error messages above." -ForegroundColor Red
    Write-Host "View logs with: eb logs" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Deployment successful!" -ForegroundColor Green

# Step 5: Get EB URL and status
Write-Host "`n[5/5] Getting deployment info..." -ForegroundColor Yellow
eb status

Write-Host "`n================================" -ForegroundColor Cyan
Write-Host "  Deployment Complete!" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

# Get the EB URL
$ebUrl = (eb status | Select-String "CNAME:").ToString().Split(":")[1].Trim()
if ($ebUrl) {
    Write-Host "`n🌐 Application URL: http://$ebUrl" -ForegroundColor Green
    
    Write-Host "`n📋 Next Steps:" -ForegroundColor Yellow
    Write-Host "   1. Test /health endpoint: http://$ebUrl/health" -ForegroundColor White
    Write-Host "   2. Test /api/ping endpoint: http://$ebUrl/api/ping" -ForegroundColor White
    Write-Host "   3. Run full test suite (update BASE_URL in test script)" -ForegroundColor White
    Write-Host "   4. Follow PHASE3_PHASE4_TESTING_GUIDE.md for complete testing" -ForegroundColor White
    
    Write-Host "`n🔍 Useful Commands:" -ForegroundColor Yellow
    Write-Host "   View logs:    eb logs" -ForegroundColor White
    Write-Host "   Stream logs:  eb logs --stream" -ForegroundColor White
    Write-Host "   Open in browser: eb open" -ForegroundColor White
    Write-Host "   Check status: eb status" -ForegroundColor White
    
    # Quick health check
    Write-Host "`n🏥 Quick Health Check..." -ForegroundColor Yellow
    try {
        $response = Invoke-WebRequest -Uri "http://$ebUrl/health" -UseBasicParsing -TimeoutSec 10
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ Health check passed!" -ForegroundColor Green
            Write-Host "Response: $($response.Content)" -ForegroundColor Gray
        }
    } catch {
        Write-Host "⚠️  Health check failed or timed out" -ForegroundColor Yellow
        Write-Host "The app might still be starting up. Wait a minute and try again." -ForegroundColor Gray
    }
} else {
    Write-Host "⚠️  Could not retrieve EB URL" -ForegroundColor Yellow
    Write-Host "Run 'eb status' to get the URL manually" -ForegroundColor Gray
}

Write-Host "`n✨ Deployment script complete!" -ForegroundColor Cyan
