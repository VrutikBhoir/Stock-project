"""
Start backend (FastAPI) and frontend (Next.js) servers
NO IDE ERRORS • NO TYPE WARNINGS • CTRL+C SAFE
"""

import subprocess
import sys
import time
from pathlib import Path


def run_command(*, cmd: list[str], cwd: Path, background: bool):
    """
    Run a command.
    Returns subprocess.Popen when background=True
    """
    print(f"Running: {' '.join(cmd)}")

    if background:
        return subprocess.Popen(
            cmd,
            cwd=cwd,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )

    subprocess.run(cmd, cwd=cwd, check=True)
    return None


def main():
    project_root = Path(__file__).parent

    backend_process = None
    frontend_process = None

    print("Starting Stock Price Predictor...")
    print("=" * 50)

    try:
        # -------- BACKEND --------
        backend_cmd = [
            sys.executable,
            "-m",
            "uvicorn",
            "app.main:app",
            "--host",
            "127.0.0.1",
            "--port",
            "8000",
            "--reload",
        ]

        backend_process = run_command(
            cmd=backend_cmd,
            cwd=project_root / "backend",
            background=True,
        )

        time.sleep(3)

        # -------- FRONTEND --------
        frontend_cmd = ["npm", "run", "dev"]

        frontend_process = run_command(
            cmd=frontend_cmd,
            cwd=project_root / "frontend",
            background=True,
        )

        print("=" * 50)
        print("Backend : http://localhost8001")
        print("Frontend: http://localhost:3000")
        print("Docs    : http://localhost8001/docs")
        print("=" * 50)
        print("Press Ctrl+C to stop both servers")

        while True:
            time.sleep(1)

    except KeyboardInterrupt:
        print("\nStopping servers...")

        if backend_process is not None:
            backend_process.terminate()

        if frontend_process is not None:
            frontend_process.terminate()

        print("Servers stopped cleanly ✅")


if __name__ == "__main__":
    main()
