import os
import sys


def pytest_sessionstart(session):
    # Ensure project root (containing cadlib) is on sys.path for imports
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir))
    if root not in sys.path:
        sys.path.insert(0, root)


