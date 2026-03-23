"""
Hugging Face Spaces entry point.
For FastAPI Space type, HF expects an `app` variable in app.py.
"""

from main import app  # noqa: F401

# Hugging Face Spaces (FastAPI type) auto-discovers `app` from this module.
# No Gradio needed — this is a pure API space.
