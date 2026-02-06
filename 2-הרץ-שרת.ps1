# מפעיל את שרת הפיתוח
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  מפעיל את שרת הפיתוח" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "השרת יעלה בקרוב..." -ForegroundColor Yellow
Write-Host "אחרי שהוא יעלה, פתח בדפדפן: http://localhost:3000" -ForegroundColor Yellow
Write-Host ""
Write-Host "כדי לעצור את השרת, לחץ Ctrl+C" -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# מעבר לתיקיית הפרויקט
Set-Location $PSScriptRoot

# הרצת השרת
npm run dev
