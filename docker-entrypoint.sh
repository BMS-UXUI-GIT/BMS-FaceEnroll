#!/bin/sh
# nginx image รันไฟล์นี้อัตโนมัติตอน start (อยู่ใน /docker-entrypoint.d/) ก่อนสตาร์ท nginx
# เขียน URL ของ backend ลง config.js จาก env API_BASE — เปลี่ยนโดเมนไม่ต้อง build image ใหม่
set -e
: "${API_BASE:=}"
echo "window.__API_BASE__ = \"${API_BASE}\";" > /usr/share/nginx/html/config.js
echo "[config] API_BASE=${API_BASE:-<empty, fallback localhost>}"
