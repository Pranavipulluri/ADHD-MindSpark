#!/bin/bash

# MindSpark Python AI Setup Script
echo "🧠 Setting up MindSpark Python AI components..."

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8+ first."
    exit 1
fi

echo "✅ Python 3 found: $(python3 --version)"

# Check if pip is installed
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 is not installed. Please install pip first."
    exit 1
fi

echo "✅ pip3 found: $(pip3 --version)"

# Create virtual environment (optional but recommended)
echo "🔧 Creating Python virtual environment..."
python3 -m venv venv
source venv/bin/activate

# Upgrade pip
echo "📦 Upgrading pip..."
pip install --upgrade pip

# Install requirements
echo "📚 Installing Python AI dependencies..."
pip install -r requirements.txt

echo "🎉 Python AI setup complete!"
echo ""
echo "To activate the virtual environment in the future, run:"
echo "  source venv/bin/activate"
echo ""
echo "To test the local AI, run:"
echo "  python3 python-ai/local_ai.py --text 'Hello world' --task summarize"