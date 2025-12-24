# Justice Agent

A Claude Agent SDK application for UK civil law case assistance, integrated with the Justice Companion case management system.

## Overview

Justice Agent is an AI-powered legal assistant specializing in UK civil law. It helps users:

- Understand civil court procedures (Small Claims, Fast Track, Multi-Track)
- Calculate legal deadlines based on Civil Procedure Rules
- Search UK legislation and regulations
- Manage cases through the Justice Companion system
- Track evidence and court deadlines

**DISCLAIMER:** This agent provides general legal information only. It does not constitute legal advice. Always consult a qualified legal professional for specific legal matters.

## Features

- **Case Management Tools**: Search, view, and update cases in Justice Companion
- **Legal Research**: Search UK legislation and explain procedures
- **Deadline Calculator**: Calculate CPR-compliant deadlines
- **Interactive Sessions**: Continuous conversation with context retention
- **Audit Logging**: All tool usage is logged for compliance
- **Security Hooks**: Validates and blocks potentially harmful operations

## Requirements

- Python 3.10 or higher
- Anthropic API key ([Get one here](https://console.anthropic.com/))
- Justice Companion backend (optional, for case management features)

## Installation

### Quick Setup

```bash
# Navigate to the project directory
cd justice-agent

# Run the setup script
chmod +x setup.sh
./setup.sh
```

### Manual Setup

1. **Create a virtual environment:**
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies:**
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

3. **Configure environment:**
   ```bash
   cp .env.example .env
   ```

4. **Edit `.env` and add your API key:**
   ```
   ANTHROPIC_API_KEY=your_api_key_here
   ```

## Usage

### Interactive Mode (Recommended)

Start an interactive session where the agent remembers conversation context:

```bash
python main.py -i
# or
python main.py --interactive
```

Commands within interactive mode:
- Type your question and press Enter
- `new` - Start a fresh session (clears context)
- `exit` - End the session

### Single Query Mode

Ask a one-off question:

```bash
python main.py "What is the limitation period for contract claims?"
python main.py "How do I start a small claims court case?"
python main.py "Calculate the deadline for filing a defence if claim was served on 2024-01-15"
```

### Help

```bash
python main.py --help
```

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | Yes | - | Your Anthropic API key |
| `JUSTICE_COMPANION_API_URL` | No | `http://localhost:8000` | Backend API URL |
| `JUSTICE_COMPANION_TOKEN` | No | - | JWT token for authenticated requests |
| `CLAUDE_MODEL` | No | `claude-sonnet-4-5-20250514` | Claude model to use |
| `DEBUG` | No | `false` | Enable debug logging |
| `LOG_LEVEL` | No | `INFO` | Logging level (DEBUG, INFO, WARNING, ERROR) |

### Available Tools

#### Case Management (`mcp__cases__*`)

| Tool | Description |
|------|-------------|
| `get_case_details` | Retrieve detailed information about a specific case |
| `search_cases` | Search for cases matching a query |
| `get_case_deadlines` | Get all deadlines for a case |
| `get_case_evidence` | List evidence items attached to a case |
| `add_case_note` | Add a note to a case |

#### Legal Research (`mcp__legal__*`)

| Tool | Description |
|------|-------------|
| `search_uk_legislation` | Search UK civil law legislation |
| `get_court_procedures` | Get court procedure information by claim value |
| `calculate_deadline` | Calculate legal deadlines based on CPR rules |

## Examples

### Example 1: Understanding Limitation Periods

```
You: What are the limitation periods for different types of civil claims?

Justice Agent: Under the Limitation Act 1980, the key limitation periods are:
- Contract claims: 6 years from breach
- Tort claims: 6 years from damage occurring
- Personal injury: 3 years from injury or knowledge
- Defamation: 1 year from publication
- Land disputes: 12 years
...
```

### Example 2: Court Track Allocation

```
You: I want to claim £15,000 for breach of contract. Which court track?

Justice Agent: Based on a claim value of £15,000, your case would be allocated to
the Fast Track. Here's what that means:
- Trial length: Maximum 1 day
- Standard directions apply
- Fixed costs regime
...
```

### Example 3: Deadline Calculation

```
You: If a claim was served on 15 January 2024, when must the defence be filed?

Justice Agent: Based on CPR Part 15:
- Acknowledgment deadline: 29 January 2024 (14 days)
- Defence deadline: 12 February 2024 (28 days from service)
...
```

## Project Structure

```
justice-agent/
├── main.py              # Main agent entry point
├── requirements.txt     # Python dependencies
├── setup.sh             # Setup script
├── .env.example         # Environment template
├── .gitignore           # Git ignore rules
├── README.md            # This file
├── tasks.json           # Project tracking
├── tools/
│   ├── __init__.py      # Tools module exports
│   ├── case_tools.py    # Case management MCP tools
│   └── legal_tools.py   # Legal research MCP tools
└── tests/
    ├── __init__.py
    ├── test_case_tools.py
    └── test_legal_tools.py
```

## Testing

Run the test suite:

```bash
# Install test dependencies
pip install pytest pytest-asyncio

# Run all tests
pytest tests/ -v

# Run with coverage
pip install pytest-cov
pytest tests/ --cov=tools --cov-report=html
```

## Integration with Justice Companion

To use case management features, ensure the Justice Companion backend is running:

```bash
# From Justice Companion root directory
cd ..
PYTHONPATH=. uvicorn backend.main:app --host 0.0.0.0 --port 8000
```

Then configure the agent to connect:

```bash
# In .env
JUSTICE_COMPANION_API_URL=http://localhost:8000
JUSTICE_COMPANION_TOKEN=your_jwt_token  # Optional, for authenticated requests
```

## Troubleshooting

### "ANTHROPIC_API_KEY environment variable is required"

Ensure you've created a `.env` file with your API key:
```bash
cp .env.example .env
# Edit .env and add your key
```

### "Request timed out" errors

The Justice Companion backend may not be running. Start it or use the agent without case management features.

### Import errors

Ensure you've activated the virtual environment:
```bash
source venv/bin/activate
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `pytest tests/ -v`
5. Submit a pull request

## License

This project is part of Justice Companion. See the main repository for license information.

## Support

- Report issues at the Justice Companion repository
- For API key issues, visit [Anthropic Console](https://console.anthropic.com/)

## Acknowledgments

- Built with [Claude Agent SDK](https://pypi.org/project/claude-agent-sdk/)
- UK civil law information based on publicly available legislation
- Not affiliated with any government or legal body
