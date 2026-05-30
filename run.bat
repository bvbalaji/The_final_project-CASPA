@echo off
title CASPA - Career Advisor
cd /d "%~dp0"
for /f "usebackq tokens=1,2 delims==" %%a in (".env") do set "%%a=%%b"
echo Starting CASPA...
python app.py
pause
