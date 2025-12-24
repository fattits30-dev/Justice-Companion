#!/bin/bash
# Justice Agent Setup Script
# Sets up the Python environment and dependencies

set -e

echo "=================================="
echo "Justice Agent - Setup"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Python version
echo -e "\n${YELLOW}Checking Python version...${NC}"
PYTHON_VERSION=$(python3 --version 2>&1 | cut -d' ' -f2 | cut -d'.' -f1,2)
REQUIRED_VERSION="3.10"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$PYTHON_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    echo -e "${RED}Error: Python $REQUIRED_VERSION or higher is required. Found: $PYTHON_VERSION${NC}"
    exit 1
fi
echo -e "${GREEN}Python $PYTHON_VERSION detected${NC}"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo -e "\n${YELLOW}Creating virtual environment...${NC}"
    python3 -m venv venv
    echo -e "${GREEN}Virtual environment created${NC}"
else
    echo -e "\n${GREEN}Virtual environment already exists${NC}"
fi

# Activate virtual environment
echo -e "\n${YELLOW}Activating virtual environment...${NC}"
source venv/bin/activate

# Upgrade pip
echo -e "\n${YELLOW}Upgrading pip...${NC}"
pip install --upgrade pip --quiet

# Install dependencies
echo -e "\n${YELLOW}Installing dependencies...${NC}"
pip install -r requirements.txt --quiet

# Install test dependencies
echo -e "\n${YELLOW}Installing test dependencies...${NC}"
pip install pytest pytest-asyncio pytest-cov --quiet

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    echo -e "\n${YELLOW}Creating .env file from template...${NC}"
    cp .env.example .env
    echo -e "${GREEN}.env file created${NC}"
    echo -e "${YELLOW}IMPORTANT: Edit .env and add your ANTHROPIC_API_KEY${NC}"
else
    echo -e "\n${GREEN}.env file already exists${NC}"
fi

# Verify installation
echo -e "\n${YELLOW}Verifying installation...${NC}"
python3 -c "from claude_agent_sdk import ClaudeSDKClient; print('Claude Agent SDK: OK')"
python3 -c "from tools.case_tools import case_management_server; print('Case tools: OK')"
python3 -c "from tools.legal_tools import legal_research_server; print('Legal tools: OK')"

echo -e "\n=================================="
echo -e "${GREEN}Setup Complete!${NC}"
echo "=================================="
echo ""
echo "Next steps:"
echo "  1. Edit .env and add your ANTHROPIC_API_KEY"
echo "  2. Activate the environment: source venv/bin/activate"
echo "  3. Run the agent: python main.py -i"
echo ""
echo "For help: python main.py --help"
