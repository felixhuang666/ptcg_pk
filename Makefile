SERVICE_NAME=monster_battle
SERVICE_FILE=$(SERVICE_NAME).service
SYSTEMD_DIR=/etc/systemd/system
PWD := $(shell pwd)
USER := $(shell whoami)
NPM_PATH := $(shell which npm || echo /usr/bin/npm)

.SILENT:
.PHONY: help all setup build clean install-service uninstall start stop bg-start status restart logs

help:
	@echo "Available commands:"
	@echo "  make help           - Show this help message"
	@echo "  make setup          - Setup python venv, install node modules, and configure .env"
	@echo "  make build          - Build react app and python backend to wheel files"
	@echo "  make clean          - Remove generated build and tmp files"
	@echo "  make install-service- Install, enable, and start the systemd service"
	@echo "  make uninstall      - Stop and uninstall the systemd service"
	@echo "  make start          - Start the service"
	@echo "  make stop           - Stop the service"
	@echo "  make bg-start       - Launch python backend in background"
	@echo "  make restart        - Restart the service"
	@echo "  make status         - Check the service status"
	@echo "  make logs           - Tail the service logs"

all: setup build

setup:
	@echo "Setting up environment..."
	python3 -m venv venv
	$(PWD)/venv/bin/pip install -r requirements.txt || $(PWD)/venv/bin/pip install -e .
	npm install
	if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo ".env file created from .env.example. Please modify it to add your API keys."; \
	fi
	@echo "Setup complete."

build:
	@echo "Building frontend and python backend..."
	npm run build
	$(PWD)/venv/bin/pip install build
	$(PWD)/venv/bin/python -m build
	@echo "Build complete."

clean:
	@echo "Cleaning build artifacts..."
	rm -rf dist build *.egg-info __pycache__ users venv tmp
	rm -f $(SERVICE_FILE)
	@echo "Clean complete."

$(SERVICE_FILE):
	@echo "[Unit]" > $(SERVICE_FILE)
	@echo "Description=Monster Battle Game Server" >> $(SERVICE_FILE)
	@echo "After=network.target" >> $(SERVICE_FILE)
	@echo "" >> $(SERVICE_FILE)
	@echo "[Service]" >> $(SERVICE_FILE)
	@echo "Type=simple" >> $(SERVICE_FILE)
	@echo "User=$(USER)" >> $(SERVICE_FILE)
	@echo "WorkingDirectory=$(PWD)" >> $(SERVICE_FILE)
	@echo "Environment=NODE_ENV=production" >> $(SERVICE_FILE)
	@echo "EnvironmentFile=$(PWD)/.env" >> $(SERVICE_FILE)
	@echo "ExecStart=/bin/sh -c '$(PWD)/venv/bin/uvicorn backend.main:app --host 0.0.0.0 --port \$${APP_BACKEND_PORT:-5000}'" >> $(SERVICE_FILE)
	@echo "Restart=on-failure" >> $(SERVICE_FILE)
	@echo "" >> $(SERVICE_FILE)
	@echo "[Install]" >> $(SERVICE_FILE)
	@echo "WantedBy=multi-user.target" >> $(SERVICE_FILE)

install-service: $(SERVICE_FILE) build
	sudo cp $(SERVICE_FILE) $(SYSTEMD_DIR)/$(SERVICE_FILE)
	sudo systemctl daemon-reload
	sudo systemctl enable $(SERVICE_NAME)
	sudo systemctl start $(SERVICE_NAME)
	@echo "Service $(SERVICE_NAME) installed and started successfully."

uninstall:
	sudo systemctl stop $(SERVICE_NAME) || true
	sudo systemctl disable $(SERVICE_NAME) || true
	sudo rm -f $(SYSTEMD_DIR)/$(SERVICE_FILE)
	sudo systemctl daemon-reload
	@echo "Service $(SERVICE_NAME) uninstalled."

start: stop
	sudo systemctl start $(SERVICE_NAME)

bg-start: stop
	@echo "Starting Uvicorn in background..."
	@export APP_BACKEND_PORT=$$(grep -E "^APP_BACKEND_PORT=" .env | cut -d '=' -f 2); \
	if [ -z "$$APP_BACKEND_PORT" ]; then APP_BACKEND_PORT=5000; fi; \
	nohup $(PWD)/venv/bin/uvicorn backend.main:app --host 0.0.0.0 --port $$APP_BACKEND_PORT > uvicorn.log 2>&1 &
	@echo "Uvicorn started. Logs in uvicorn.log"

stop:
	-lsof -t -i :5000 | xargs -i kill {} 2>/dev/null || true
	-lsof -t -i :3000 | xargs -i kill {} 2>/dev/null || true
	-if [ -f "$(SYSTEMD_DIR)/$(SERVICE_FILE)" ]; then \
		sudo systemctl stop $(SERVICE_NAME) 2>/dev/null || true; \
	fi

status:
	sudo systemctl status $(SERVICE_NAME)

restart:
	sudo systemctl restart $(SERVICE_NAME)

logs:
	sudo journalctl -u $(SERVICE_NAME) -f
