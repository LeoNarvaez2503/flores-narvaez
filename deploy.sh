#!/usr/bin/env bash
set -e

echo "============================================================"
echo "      CavaLocal — Despliegue Automático en Kubernetes      "
echo "============================================================"

echo "[1/5] Iniciando Minikube clúster..."
minikube start --driver=docker

echo "[2/5] Habilitando Addon Ingress NGINX..."
minikube addons enable ingress

echo "[3/5] Construyendo imágenes Docker locales..."
docker build -t cavalocal-backend:latest ./backend
docker build -t cavalocal-audit:latest ./audit-service
docker build -t cavalocal-dashboard:latest ./web

echo "[4/5] Cargando imágenes Docker en Minikube..."
minikube image load cavalocal-backend:latest
minikube image load cavalocal-audit:latest
minikube image load cavalocal-dashboard:latest

echo "[5/5] Aplicando Manifiestos de Kubernetes (/k8s)..."
kubectl delete ValidatingWebhookConfiguration ingress-nginx-admission --ignore-not-found=true
kubectl apply -f k8s/

echo "Esperando que los Pods estén listos (Ready)..."
kubectl wait --for=condition=ready pod --all --timeout=180s

MINIKUBE_IP=$(minikube ip)

echo "============================================================"
echo "  ¡Despliegue Completado Exitosamente!"
echo "  IP de Minikube: ${MINIKUBE_IP}"
echo ""
echo "  Agregue la siguiente línea a su archivo /etc/hosts:"
echo "  ${MINIKUBE_IP}   conjunta3p.espe.edu.ec"
echo ""
echo "  Acceso al Dashboard:  http://conjunta3p.espe.edu.ec/dashboard"
echo "  Acceso a Auditoría:   http://conjunta3p.espe.edu.ec/api/audit"
echo "  Acceso a Backend API: http://conjunta3p.espe.edu.ec/api"
echo "============================================================"
