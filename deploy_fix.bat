@echo off
cd /d "C:\Users\K\Desktop\FINAL PROJ\GLX2"
echo === Git Status ===
git status
echo === Adding Files ===
git add backend/src/lib/emailService.ts backend/src/lib/pdfService.ts
echo === Committing ===
git commit -m "fix: remove phantom discount from PDF/email - use stored values directly"
echo === Pushing ===
git push origin main
echo === Done ===
pause
