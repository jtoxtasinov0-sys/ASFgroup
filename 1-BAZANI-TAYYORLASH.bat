@echo off
title ASF GROUP - Bazani tayyorlash
cd /d "%~dp0backend"
echo.
echo ====================================
echo   ASF GROUP - Bazani tayyorlash
echo ====================================
echo.
call npx prisma db push
if errorlevel 1 goto err
echo.
call npm run db:seed
if errorlevel 1 goto err
echo.
echo TAYYOR! Endi 2-BACKEND.bat ni ishga tushiring.
goto end
:err
echo.
echo XATO! backend\.env faylidagi DATABASE_URL ni tekshiring.
:end
echo.
pause
