SERVICE_NAME=ptcg_pk
SERVICE_FILE=$(SERVICE_NAME).service
SYSTEMD_DIR=/etc/systemd/system
PWD := $(shell pwd)
USER := $(shell whoami)
NPM_PATH := $(shell which npm || echo /usr/bin/npm)

.PHONY: all build install uninstall start stop status restart logs clean

all: build

build:
	npm install
	npm run build

$(SERVICE_FILE):
	@echo "[Unit]" > $(SERVICE_FILE)
	@echo "Description=PTCG PK Game Server" >> $(SERVICE_FILE)
	@echo "After=network.target" >> $(SERVICE_FILE)
	@echo "" >> $(SERVICE_FILE)
	@echo "[Service]" >> $(SERVICE_FILE)
	@echo "Type=simple" >> $(SERVICE_FILE)
	@echo "User=$(USER)" >> $(SERVICE_FILE)
	@echo "WorkingDirectory=$(PWD)" >> $(SERVICE_FILE)
	@echo "Environment=NODE_ENV=production" >> $(SERVICE_FILE)
	@echo "ExecStart=$(NPM_PATH) run dev" >> $(SERVICE_FILE)
	@echo "Restart=on-failure" >> $(SERVICE_FILE)
	@echo "" >> $(SERVICE_FILE)
	@echo "[Install]" >> $(SERVICE_FILE)
	@echo "WantedBy=multi-user.target" >> $(SERVICE_FILE)

install: $(SERVICE_FILE) build
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

start:
	sudo systemctl start $(SERVICE_NAME)

stop:
	sudo systemctl stop $(SERVICE_NAME)

status:
	sudo systemctl status $(SERVICE_NAME)

restart:
	sudo systemctl restart $(SERVICE_NAME)

logs:
	sudo journalctl -u $(SERVICE_NAME) -f

clean:
	rm -f $(SERVICE_FILE)
