import sys
from pathlib import Path

from mangum import Mangum

# Ensure the project root is importable when this file is run directly.
ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from main import app


handler = Mangum(app)