from setuptools import setup, find_packages
import os

def get_data_files():
    data_files = []
    dist_dir = 'dist'
    if os.path.exists(dist_dir):
        for root, dirs, files in os.walk(dist_dir):
            file_paths = [os.path.join(root, file) for file in files]
            if file_paths:
                data_files.append((root, file_paths))
    return data_files

setup(
    name="monster-battle-backend",
    version="1.0.0",
    description="FastAPI backend for Monster Battle game",
    packages=find_packages(),
    data_files=get_data_files(),
    include_package_data=True,
    python_requires=">=3.12",
    install_requires=[
        "fastapi>=0.111.0",
        "uvicorn>=0.30.0",
        "python-socketio>=5.11.0",
        "python-dotenv>=1.0.1",
        "httpx>=0.27.0",
        "asteval>=1.0.0",
    ],
)
