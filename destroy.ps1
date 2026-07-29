# Script de Limpieza y Eliminacion de Recursos en Kubernetes (PowerShell)
Write-Host "============================================================" -ForegroundColor Yellow
Write-Host "      CavaLocal - Limpieza de Recursos de Kubernetes        " -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Yellow

Write-Host "Eliminando recursos de Kubernetes desde /k8s..." -ForegroundColor Cyan
kubectl delete -f k8s/ --ignore-not-found=true

Write-Host "============================================================" -ForegroundColor Green
Write-Host "  Recursos eliminados exitosamente!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green

