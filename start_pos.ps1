# Script de Inicio Automático para VARO POS
Write-Host "Iniciando entorno de desarrollo VARO POS..." -ForegroundColor Cyan

$RepoDir = "C:\varo-pos"
$BackendDir = "$RepoDir\backend"
$FrontendDir = "$RepoDir\frontend"

Write-Host "Iniciando Backend..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$BackendDir'; npm run dev"

Start-Sleep -Seconds 2

Write-Host "Iniciando Frontend..." -ForegroundColor Magenta
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$FrontendDir'; npm run dev"

Write-Host "Listo. Ventanas abiertas." -ForegroundColor Cyan
