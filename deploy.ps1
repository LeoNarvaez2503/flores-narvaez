# Script de Despliegue Automático para Windows PowerShell
$ErrorActionPreference = "Stop"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "      CavaLocal — Despliegue Automático en Kubernetes      " -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

Write-Host "[1/5] Iniciando Minikube clúster..." -ForegroundColor Yellow
minikube start --driver=docker

Write-Host "[2/5] Habilitando Addon Ingress NGINX..." -ForegroundColor Yellow
minikube addons enable ingress

Write-Host "[3/5] Construyendo imágenes Docker locales..." -ForegroundColor Yellow
docker build -t cavalocal-backend:latest ./backend
docker build -t cavalocal-audit:latest ./audit-service
docker build -t cavalocal-dashboard:latest ./web

Write-Host "[4/5] Cargando imágenes Docker en Minikube..." -ForegroundColor Yellow
minikube image load cavalocal-backend:latest
minikube image load cavalocal-audit:latest
minikube image load cavalocal-dashboard:latest

Write-Host "[5/5] Aplicando Manifiestos de Kubernetes (/k8s)..." -ForegroundColor Yellow
kubectl delete ValidatingWebhookConfiguration ingress-nginx-admission --ignore-not-found=$true
kubectl apply -f k8s/

Write-Host "Esperando que los Pods estén listos (Ready)..." -ForegroundColor Yellow
kubectl wait --for=condition=ready pod --all --timeout=180s

$minikubeIp = (minikube ip).Trim()

Write-Host "============================================================" -ForegroundColor Green
Write-Host "  ¡Despliegue Completado Exitosamente!" -ForegroundColor Green
Write-Host "  IP de Minikube: $minikubeIp" -ForegroundColor White
Write-Host ""
Write-Host "  Agregue la siguiente línea a C:\Windows\System32\drivers\etc\hosts:" -ForegroundColor Yellow
Write-Host "  $minikubeIp   conjunta3p.espe.edu.ec" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Acceso al Dashboard:  http://conjunta3p.espe.edu.ec/dashboard" -ForegroundColor White
Write-Host "  Acceso a Auditoría:   http://conjunta3p.espe.edu.ec/api/audit" -ForegroundColor White
Write-Host "  Acceso a Backend API: http://conjunta3p.espe.edu.ec/api" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Green
