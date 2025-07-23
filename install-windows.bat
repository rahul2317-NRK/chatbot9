@echo off
echo Installing Blue Pixel AI Chatbot on Windows...
echo.

echo Step 1: Upgrading pip and installing build tools...
python -m pip install --upgrade pip setuptools wheel

echo.
echo Step 2: Installing core dependencies...
pip install -r requirements-windows.txt

echo.
echo Step 3: Installing optional packages (if needed)...
echo Note: NumPy and Pandas are optional for enhanced functionality
echo You can install them later with: pip install numpy pandas --only-binary=all

echo.
echo Step 4: Verifying installation...
python -c "import fastapi; print('FastAPI installed successfully')"
python -c "import openai; print('OpenAI installed successfully')"
python -c "import boto3; print('Boto3 installed successfully')"

echo.
echo Installation complete!
echo.
echo Next steps:
echo 1. Copy .env.example to .env and add your API keys
echo 2. Run the application with: python run.py
echo.
pause