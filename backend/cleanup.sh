# Step 1: Remove broken venv
cd /Users/lohithlakshman/ControlSync/control-mapper/backend
rm -rf venv

# Step 2: Create fresh venv
python3 -m venv venv

# Step 3: Activate — this is the critical step
source venv/bin/activate
