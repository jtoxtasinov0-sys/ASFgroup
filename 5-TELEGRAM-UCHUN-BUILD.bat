@echo off
title ASF GROUP - Mini App build
cd /d "%~dp0miniapp"
echo Mini App tayyorlanmoqda...
call npm run build
echo.
echo TAYYOR! Endi backendni qayta ishga tushiring va ngrok http 5000 ni bajaring.
echo.
pause
