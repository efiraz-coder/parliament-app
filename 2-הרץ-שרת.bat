@echo off
chcp 65001 >nul
echo ========================================
echo   מפעיל את שרת הפיתוח
echo ========================================
echo.
echo השרת יעלה בקרוב...
echo אחרי שהוא יעלה, פתח בדפדפן: http://localhost:3000
echo.
echo כדי לעצור את השרת, לחץ Ctrl+C
echo.
echo ========================================
echo.

cd /d "%~dp0"
npm run dev

pause
