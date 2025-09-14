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
    npm run dev

# Stop the application by killing processes on the development port
stop:
    @echo "🛑 Stopping application processes..."
    -pkill -f "npm run dev" || true
    -pkill -f "tsx server/index.ts" || true
    -lsof -ti:{{ DEV_PORT }} | xargs -r kill -9 || true
    @echo "✅ Application stopped"

# Restart the application
restart: stop start

# Seed the database with initial financial data
seed:
    @echo "🌱 Seeding database with financial data..."
    node scripts/seed-database.js
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

# Show logs (if running via systemd or pm2 - for future containerization)
logs:
    @echo "📋 Recent application logs:"
    @if pgrep -f "npm run dev" > /dev/null; then \
        echo "Application is running with PID: $(pgrep -f 'npm run dev')"; \
    else \
        echo "No running application process found"; \
    fi

# Clean build artifacts and node_modules
clean:
    @echo "🧹 Cleaning project..."
    rm -rf node_modules
    rm -rf dist
    rm -rf .next
    rm -rf .vite
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