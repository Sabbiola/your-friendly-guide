$ErrorActionPreference = "Stop"

# 1. Configura Git Path
$GitPath = "C:\Users\dennis.bobu\AppData\Local\Programs\Git\bin\git.exe"

Write-Host "Uso git da: $GitPath" -ForegroundColor Cyan

# 2. Vai alla cartella
$RepoDir = "c:\Users\dennis.bobu\Desktop\solana\your-friendly-guide"
Set-Location $RepoDir

# 3. Stage e Commit (nel caso non fossero passati prima)
Write-Host "Assicuro che tutto sia nell'area di stage..." -ForegroundColor Cyan
& $GitPath add .
try {
    & $GitPath commit -m "fix: stability improvements for token scanner (persistence + retries)"
} catch {
    Write-Host "Niente da committare (già fatto)." -ForegroundColor Gray
}

# 4. Force Push
# Usiamo --force perché abbiamo scaricato lo ZIP e non abbiamo la storia completa.
# Questo sovrascriverà la history remota con quella locale corretta.
Write-Host "Eseguo FORCE PUSH su GitHub..." -ForegroundColor Yellow
Write-Host "NOTA: Questo sovrascriverà la history remota. Se ti chiede la password, inseriscila." -ForegroundColor Cyan

& $GitPath push -u origin main --force

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ PUSH COMPLETATO CON SUCCESSO!" -ForegroundColor Green
    Write-Host "Vercel dovrebbe aggiornarsi tra circa 2 minuti." -ForegroundColor Green
} else {
    Write-Host "❌ Errore durante il push." -ForegroundColor Red
}

Read-Host "Premi Invio per chiudere"
