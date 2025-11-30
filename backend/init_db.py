
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))
from backend.models.base import init_db
init_db()
print('Database initialized successfully')
