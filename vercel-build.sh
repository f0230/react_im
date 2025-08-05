#!/bin/bash
echo "Instalando dependencias con scripts habilitados..."
pnpm install --ignore-scripts=false
echo "Compilando proyecto..."
pnpm run build
