# Step 1: Upgrade pip
cd /Users/lohithlakshman/ControlSync/control-mapper/backend
pip install --upgrade pip

# Step 2: Install all dependencies
pip install -r requirements.txt

# Step 3: Install Playwright browser (one-time)
playwright install chromium

# Step 4: Start server
uvicorn main:app --reload --port 8000