.PHONY: all build up down logs dev-server dev-video dev-client clean

# --- Docker Commands ---

# Build and start everything
up:
	docker-compose up --build -d
	@echo "🚀 GopherChat is running!"
	@echo "Server: http://localhost:8080"
	@echo "Video:  http://localhost:4000"

# Stop everything
down:
	docker-compose down

# View logs for all services
logs:
	docker-compose logs -f

# --- Local Development Commands (No Docker for Apps) ---

# Run dependencies only (DBs)
db-up:
	docker-compose up -d mongo redis

# Run Main Server (Local)
run-server:
	cd server && go run .

# Run Video Service (Local)
run-video:
	cd video-service && go run main.go

# Run Client (Local)
run-client:
	cd client && npm run dev

# --- Utility ---

# Clean up Docker artifacts
clean:
	docker-compose down -v
	docker system prune -f

# Run the full stack locally (Requires 3 terminal tabs)
help:
	@echo "Available commands:"
	@echo "  make up          - Run everything in Docker"
	@echo "  make down        - Stop Docker containers"
	@echo "  make db-up       - Start only Mongo & Redis (for local dev)"
	@echo "  make run-server  - Run Go Server locally"
	@echo "  make run-video   - Run Video Service locally"
	@echo "  make run-client  - Run Next.js Client locally"