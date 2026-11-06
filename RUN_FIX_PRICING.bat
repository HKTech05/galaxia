@echo off
title Galaxia - Update Pricing to SS1
color 0A
echo ================================================================
echo   GALAXIA RESORTS - UPDATE PRICING TO SS1 & CLEAR ALL OVERRIDES
echo ================================================================
echo.
cd /d "C:\Users\K\Desktop\FINAL PROJ\GLX2\backend"
echo Working directory: %cd%
echo.
echo Executing fix-pricing.ts ...
echo.
call npx ts-node fix-pricing.ts
echo.
echo ================================================================
echo   Completed! Press any key to exit.
echo ================================================================
pause
