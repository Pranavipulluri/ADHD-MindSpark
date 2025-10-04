@echo off
REM MindSpark Python AI Setup Script for Windows

echo 🧠 Setting up MindSpark Python AI components...

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python is not installed. Please install Python 3.8+ first.
    pause
    exit /b 1
)

echo ✅ Python found
python --version

REM Check if pip is installed
pip --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ pip is not installed. Please install pip first.
    pause
    exit /b 1
)

echo ✅ pip found
pip --version

REM Create virtual environment (optional but recommended)
echo 🔧 Creating Python virtual environment...
python -m venv venv
call venv\Scripts\activate.bat

REM Upgrade pip
echo 📦 Upgrading pip...
pip install --upgrade pip

REM Install requirements
echo 📚 Installing Python AI dependencies...
pip install -r requirements.txt

echo 🎉 Python AI setup complete!
echo.
echo To activate the virtual environment in the future, run:
echo   venv\Scripts\activate.bat
echo.
echo To test the local AI, run:
echo   python python-ai\local_ai.py --text "Hello world" --task summarize

pause