@echo off
setlocal
cd /d "%~dp0"
title MallWay Local Server
if not exist "serve.py" goto missing
py -3 -c "import sys; sys.exit(sys.version_info < (3, 8))" >nul 2>&1
if not errorlevel 1 goto use_py
python -c "import sys; sys.exit(sys.version_info < (3, 8))" >nul 2>&1
if not errorlevel 1 goto use_python
echo Python 3.8 or newer was not found.
echo Install Python, then close and reopen this launcher.
goto finish
:use_py
py -3 serve.py
goto finish
:use_python
python serve.py
goto finish
:missing
echo serve.py is missing. Extract the entire ZIP, then open the MallWay folder.
:finish
pause
