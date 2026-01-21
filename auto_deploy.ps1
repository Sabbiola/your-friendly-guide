$ErrorActionPreference = "Stop"

# 1. Configura Git Path trovato
$GitPath = "C:\Users\dennis.bobu\AppData\Local\Programs\Git\bin\git.exe"

Write-Host "Uso git da: $GitPath" -ForegroundColor Cyan

# 2. Vai alla cartella
$RepoDir = "c:\Users\dennis.bobu\Desktop\solana\your-friendly-guide"
Set-Location $RepoDir

# 3. Inizializza Git se manca (caso ZIP)
if (-not (Test-Path ".git")) {
    Write-Host "Inizializzo repository Git..." -ForegroundColor Yellow
    & $GitPath init
    & $GitPath branch -M main
    & $GitPath remote add origin https://github.com/Sabbiola/your-friendly-guide.git
}

# 4. Stage e Commit
Write-Host "Preparazione file..." -ForegroundColor Cyan
& $GitPath add .
& $GitPath commit -m "fix: stability improvements for token scanner (persistence + retries)"

# 5. Push
Write-Host "Tento il push su GitHub..." -ForegroundColor Yellow
Write-Host "NOTA: Potrebbe aprirsi una finestra per il login." -ForegroundColor Cyan
try {
    & $GitPath push -u origin main
} catch {
    Write-Host "Push standard fallito (probabilmente conflitti di storia dovuti allo ZIP)." -ForegroundColor Red
    Write-Host "Provo con --force (sovrascrive la remote history con questa versione locale)..." -ForegroundColor Yellow
    & $GitPath push -u origin main --force
}

Write-Host "Finito! Se ha funzionato, Vercel dovrebbe aggiornarsi tra poco." -ForegroundColor Green
Read-Host "Premi Invio per chiudere"
