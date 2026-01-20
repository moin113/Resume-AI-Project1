# Resume Doctor AI - Deploy to Elastic Beanstalk
# This script prepares and deploys the application to AWS EB

Write-Host "=" -NoNewline -ForegroundColor Cyan
Write-Host ("=" * 59) -ForegroundColor Cyan
Write-Host "Resume Doctor AI - EB Deployment Script" -ForegroundColor Cyan
Write-Host ("=" * 60) -ForegroundColor Cyan

# Step 1: Check if EB CLI is installed
Write-Host "`n[Step 1] Checking EB CLI..." -ForegroundColor Yellow
try {
    $ebVersion = eb --version 2>&1
    Write-Host "✅ EB CLI is installed: $ebVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ EB CLI is not installed" -ForegroundColor Red
    Write-Host "Please install: pip install awsebcli" -ForegroundColor Yellow
    exit 1
}

# Step 2: Verify all required files exist
Write-Host "`n[Step 2] Verifying required files..." -ForegroundColor Yellow
$requiredFiles = @(
    "requirements.txt",
    "backend\app.py",
    ".ebextensions\01_flask.config",
    ".ebextensions\02_nlp_models.config",
    "Procfile"
)

$allFilesExist = $true
foreach ($file in $requiredFiles) {
    if (Test-Path $file) {
        Write-Host "✅ Found: $file" -ForegroundColor Green
    } else {
        Write-Host "❌ Missing: $file" -ForegroundColor Red
        $allFilesExist = $false
    }
}

if (-not $allFilesExist) {
    Write-Host "`n❌ Some required files are missing. Please fix before deploying." -ForegroundColor Red
    exit 1
}

# Step 3: Check git status
Write-Host "`n[Step 3] Checking git status..." -ForegroundColor Yellow
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Host "⚠️  You have uncommitted changes:" -ForegroundColor Yellow
    git status --short
    
    $commit = Read-Host "`nDo you want to commit these changes? (y/n)"
    if ($commit -eq 'y') {
        $commitMessage = Read-Host "Enter commit message"
        git add .
        git commit -m $commitMessage
        Write-Host "✅ Changes committed" -ForegroundColor Green
    }
} else {
    Write-Host "✅ Working directory is clean" -ForegroundColor Green
}

# Step 4: Show current EB environment
Write-Host "`n[Step 4] Current EB environment..." -ForegroundColor Yellow
try {
    eb status
} catch {
    Write-Host "⚠️  No EB environment initialized" -ForegroundColor Yellow
    $init = Read-Host "Do you want to initialize EB? (y/n)"
    if ($init -eq 'y') {
        eb init
    } else {
        Write-Host "❌ Cannot deploy without EB initialization" -ForegroundColor Red
        exit 1
    }
}

# Step 5: Confirm deployment
Write-Host "`n[Step 5] Ready to deploy..." -ForegroundColor Yellow
Write-Host "This will deploy the following fixes:" -ForegroundColor Cyan
Write-Host "  • Enhanced NLP error handling" -ForegroundColor White
Write-Host "  • Automatic NLTK data download" -ForegroundColor White
Write-Host "  • Automatic spaCy model download" -ForegroundColor White
Write-Host "  • Improved error messaging" -ForegroundColor White
Write-Host "  • Better frontend error display" -ForegroundColor White

$deploy = Read-Host "`nProceed with deployment? (y/n)"
if ($deploy -ne 'y') {
    Write-Host "❌ Deployment cancelled" -ForegroundColor Yellow
    exit 0
}

# Step 6: Deploy to EB
Write-Host "`n[Step 6] Deploying to Elastic Beanstalk..." -ForegroundColor Yellow
Write-Host "This may take several minutes..." -ForegroundColor Cyan

try {
    eb deploy
    Write-Host "`n✅ Deployment completed!" -ForegroundColor Green
} catch {
    Write-Host "`n❌ Deployment failed!" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
}

# Step 7: Check deployment status
Write-Host "`n[Step 7] Checking deployment status..." -ForegroundColor Yellow
Start-Sleep -Seconds 5
eb health

# Step 8: Show logs
Write-Host "`n[Step 8] Recent logs..." -ForegroundColor Yellow
$showLogs = Read-Host "Do you want to view recent logs? (y/n)"
if ($showLogs -eq 'y') {
    eb logs
}

# Step 9: Open application
Write-Host "`n[Step 9] Opening application..." -ForegroundColor Yellow
$openApp = Read-Host "Do you want to open the application in browser? (y/n)"
if ($openApp -eq 'y') {
    eb open
}

# Summary
Write-Host "`n" -NoNewline
Write-Host ("=" * 60) -ForegroundColor Cyan
Write-Host "DEPLOYMENT SUMMARY" -ForegroundColor Cyan
Write-Host ("=" * 60) -ForegroundColor Cyan
Write-Host "✅ Application deployed successfully" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Test the scan feature on the live site" -ForegroundColor White
Write-Host "2. Monitor logs for any errors: eb logs" -ForegroundColor White
Write-Host "3. Check application health: eb health" -ForegroundColor White
Write-Host "`nIf scan feature still fails:" -ForegroundColor Yellow
Write-Host "1. Check EB logs: eb logs" -ForegroundColor White
Write-Host "2. SSH into instance: eb ssh" -ForegroundColor White
Write-Host "3. Verify NLP models: python3 -c 'import spacy; spacy.load(\"en_core_web_sm\")'" -ForegroundColor White
Write-Host ("=" * 60) -ForegroundColor Cyan
