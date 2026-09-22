@echo off
title ASF GROUP - Mini App (brauzerda sinash)
cd /d "%~dp0miniapp"
start "" http://localhost:5173
call npm run dev
pause
