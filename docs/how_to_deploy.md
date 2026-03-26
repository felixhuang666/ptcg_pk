# How to Deploy Monster Battle

This guide explains how to deploy the Monster Battle game server. The application is built as a Python package (wheel) containing a FastAPI backend that also serves the compiled React frontend static files.

## Prerequisites

- Python 3.12 or higher
- Node.js (v18+) for building the frontend (if building from source)
- Nginx (optional, for reverse proxying to the application port)

## Method 1: Using the Makefile (Recommended for Development/Simple Deployment)

The project includes a `Makefile` that automates the setup, build, and run processes.

1. **Setup the Environment:**
   Run the following command to create a Python virtual environment (`venv/`), install Node.js dependencies, install Python requirements, and create a `.env` file from `.env.example`.
   ```bash
   make setup
   ```

2. **Configure Environment Variables:**
   Edit the `.env` file located in the root directory and add your Google OAuth credentials and the desired application port.
   ```env
   GOOGLE_CLIENT_ID="your-google-client-id"
   GOOGLE_CLIENT_SECRET="your-google-client-secret"
   APP_BACKEND_PORT=5000
   ```

3. **Build the Application:**
   This command builds the Vite/React frontend and then packages both the frontend and the FastAPI backend into a Python wheel (`.whl`) file inside the `dist/` directory.
   ```bash
   make build
   ```

4. **Start the Server:**
   You can start the server in the background using `uvicorn`:
   ```bash
   make bg-start
   ```
   The application will run on `http://0.0.0.0:5000` (or the port specified in your `.env` file). Logs are written to `uvicorn.log`.

   To stop the server:
   ```bash
   make stop
   ```

5. **Install as a Systemd Service (Linux):**
   For a more robust deployment on Linux, you can install the application as a `systemd` service so it runs automatically on startup and restarts on failure.
   ```bash
   make install-service
   ```
   *You can manage the service using `make start`, `make stop`, `make restart`, `make status`, and `make logs`.*

---

## Method 2: Installing and Running from the Wheel (Manual Deployment)

If you have already built the project and just want to deploy the resulting wheel file to a production server:

1. **Build the Wheel (on your build machine):**
   ```bash
   make setup
   make build
   ```
   This generates a `.whl` file in the `dist/` directory (e.g., `dist/monster_battle_backend-1.0.0-py3-none-any.whl`).

2. **Transfer Files:**
   Copy the `.whl` file and your `.env` file to your production server.

3. **Install the Wheel (on your production server):**
   Create a virtual environment and install the wheel file using `pip`.
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install monster_battle_backend-1.0.0-py3-none-any.whl
   ```
   *Note: This will install the `backend` package and place the `dist/` directory containing the frontend files into your Python environment's data directory.*

4. **Launch the Application:**
   Run the FastAPI application using Uvicorn. Ensure you run this from a directory containing the `users/` folder (or where you want it created) and your `.env` file so it can load the configuration.
   ```bash
   uvicorn backend.main:app --host 0.0.0.0 --port 5000
   ```

## Nginx Reverse Proxy (Optional but Recommended)

In production, it's common to place an Nginx reverse proxy in front of the Uvicorn application to handle SSL/TLS and serve the app on port 80/443.

Example Nginx configuration:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Important: Configuration for Socket.IO WebSockets
    location /socket.io/ {
        proxy_pass http://127.0.0.1:5000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
