#!/usr/bin/env bash
echo "============================================================"
echo "      CavaLocal — Limpieza de Recursos de Kubernetes        "
echo "============================================================"

echo "Eliminando recursos de Kubernetes desde /k8s..."
kubectl delete -f k8s/ --ignore-not-found=true

echo "============================================================"
echo "  ¡Recursos eliminados exitosamente!"
echo "============================================================"
