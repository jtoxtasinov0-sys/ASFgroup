@echo off
title ASF GROUP - Admin panel
cd /d "%~dp0admin"
start "" http://localhost:5174
call npm run dev
pause
