
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))
from fastapi import FastAPI

app = FastAPI()

@app.get('/test/logs')
async def get_logs():
    log_path = Path('backend/logs/backend.log')
    if not log_path.exists():
        return {'error': 'Log file not found'}
    
    with open(log_path, 'r') as f:
        lines = f.readlines()[-20:]  # Get last 20 lines
    return {'logs': lines}

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='0.0.0.0', port=8001)
