# Temporal Knowledge Graph Application - Service Management
# https://github.com/casey/just

# Set default shell
set shell := ["bash", "-cu"]

# Variables
export NODE_ENV := "development"
export DEV_PORT := "5000"

# Default recipe - show help
default:
    @echo "Temporal Knowledge Graph Application"
    @echo "Available commands:"
    @just --list

# Start the application (both frontend and backend)
start:
    @echo "🚀 Starting Temporal Knowledge Graph application..."
    @echo "📦 Starting Docker services..."
    docker-compose up -d postgres puppygraph
    @echo "⏳ Waiting for services to be ready..."
    @sleep 10
    @echo "🌱 Starting application server in background..."
    @if [ -f .env ]; then \
        set -a && source .env && set +a && nohup npm run dev > app.log 2>&1 & \
        echo "✅ Application started in background (PID: $$!)"; \
        echo "📋 Logs are being written to app.log"; \
        echo "🌐 Frontend: http://localhost:{{ DEV_PORT }}"; \
        echo "🏥 Health check: http://localhost:{{ DEV_PORT }}/api/health"; \
        echo "📊 Run 'just status' to check if running"; \
        echo "📋 Run 'just logs' to view logs"; \
    else \
        echo "⚠️  .env file not found, using system environment variables"; \
        nohup npm run dev > app.log 2>&1 & \
        echo "✅ Application started in background (PID: $$!)"; \
        echo "📋 Logs are being written to app.log"; \
        echo "🌐 Frontend: http://localhost:{{ DEV_PORT }}"; \
        echo "🏥 Health check: http://localhost:{{ DEV_PORT }}/api/health"; \
        echo "📊 Run 'just status' to check if running"; \
        echo "📋 Run 'just logs' to view logs"; \
    fi

# Stop the application by killing processes on the development port
stop:
    @echo "🛑 Stopping application processes..."
    -pkill -f "npm run dev" || true
    -pkill -f "tsx server/index.ts" || true
    -lsof -ti:{{ DEV_PORT }} | xargs -r kill -9 || true
    @echo "🐳 Stopping Docker services..."
    docker-compose down
    @echo "✅ Application stopped"

# Restart the application
restart: stop start

# Rebuild and restart Docker services (useful for environment variable changes)
rebuild:
    @echo "🔄 Rebuilding Docker services with new environment variables..."
    @echo "🛑 Stopping current services..."
    docker-compose down
    @echo "🔨 Rebuilding and starting services..."
    docker-compose up --build -d
    @echo "⏳ Waiting for services to be ready..."
    @sleep 10
    @echo "✅ Services rebuilt and restarted"
    @echo "🌐 Frontend: http://localhost:{{ DEV_PORT }}"
    @echo "🏥 Health check: http://localhost:{{ DEV_PORT }}/api/health"

# Seed the database with initial financial data
seed:
    @echo "🌱 Seeding database with financial data..."
    @echo "📦 Ensuring Docker services are running..."
    docker-compose up -d postgres
    @echo "⏳ Waiting for database to be ready..."
    @sleep 5
    @echo "🔄 Pushing database schema..."
    @if [ -f .env ]; then \
        set -a && source .env && set +a && npx drizzle-kit push; \
    else \
        npx drizzle-kit push; \
    fi
    @echo "🌱 Seeding database..."
    @if [ -f .env ]; then \
        set -a && source .env && set +a && node scripts/seed-database.js; \
    else \
        node scripts/seed-database.js; \
    fi
    @echo "✅ Database seeded successfully"

# Reset database (drop all data) and reseed
reset: 
    @echo "⚠️  Resetting database - this will delete all data!"
    @echo "Press Ctrl+C within 5 seconds to cancel..."
    @sleep 5
    node scripts/reset-database.js
    @just seed

# Setup project dependencies
setup:
    @echo "📦 Installing dependencies..."
    npm install
    @echo "✅ Dependencies installed"

# Run database migrations/push schema
migrate:
    @echo "🔄 Syncing database schema..."
    npx drizzle-kit push
    @echo "✅ Database schema updated"

# Initialize project for new developers
init: setup migrate seed
    @echo "🎉 Project initialized successfully!"
    @echo "Run 'just start' to begin development"

# Show application status
status:
    @echo "📊 Application Status:"
    @if lsof -i:{{ DEV_PORT }} > /dev/null 2>&1; then \
        echo "✅ Application is running on port {{ DEV_PORT }}"; \
        echo "🌐 Frontend: http://localhost:{{ DEV_PORT }}"; \
    else \
        echo "❌ Application is not running"; \
    fi

# Show logs from the background application
logs:
    @echo "📋 Recent application logs:"
    @if [ -f "app.log" ]; then \
        echo "📄 Last 20 lines from app.log:"; \
        tail -20 app.log; \
    else \
        echo "❌ No log file found (app.log)"; \
    fi
    @if pgrep -f "npm run dev" > /dev/null; then \
        echo "✅ Application is running with PID: $(pgrep -f 'npm run dev')"; \
    else \
        echo "❌ No running application process found"; \
    fi

# Follow logs in real-time
follow-logs:
    @echo "📋 Following application logs (Ctrl+C to stop):"
    @if [ -f "app.log" ]; then \
        tail -f app.log; \
    else \
        echo "❌ No log file found (app.log)"; \
    fi

# Clean build artifacts and node_modules
clean:
    @echo "🧹 Cleaning project..."
    rm -rf node_modules
    rm -rf dist
    rm -rf .next
    rm -rf .vite
    rm -f app.log
    @echo "✅ Project cleaned"

# Development helpers
dev-setup: setup
    @echo "🛠️  Setting up development environment..."
    @if ! command -v just > /dev/null; then \
        echo "⚠️  'just' command runner not found. Install it from: https://github.com/casey/just"; \
    fi
    @echo "✅ Development environment ready"

# Quick health check
health:
    @echo "🏥 Health Check:"
    @if curl -s http://localhost:{{ DEV_PORT }}/api/health > /dev/null 2>&1; then \
        echo "✅ API is responding"; \
    else \
        echo "❌ API is not responding"; \
    fi
    @if [ -f "package.json" ]; then \
        echo "✅ package.json exists"; \
    else \
        echo "❌ package.json missing"; \
    fi