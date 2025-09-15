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

# Start the application (all services in Docker)
start:
    @echo "🚀 Starting Temporal Knowledge Graph application..."
    @echo "📦 Starting all Docker services..."
    docker-compose up -d
    @echo "⏳ Waiting for services to be ready..."
    @sleep 15
    @echo "✅ All services started in Docker containers"
    @echo "🌐 Frontend: http://localhost:{{ DEV_PORT }}"
    @echo "🏥 Health check: http://localhost:{{ DEV_PORT }}/api/health"
    @echo "📊 Run 'just status' to check if running"
    @echo "📋 Run 'just logs' to view logs"

# Stop the application (all Docker services)
stop:
    @echo "🛑 Stopping all Docker services..."
    -docker-compose down || echo "⚠️  Docker not running or no containers to stop"
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
    @if docker-compose ps | grep -q "Up"; then \
        echo "✅ Docker services are running:"; \
        docker-compose ps; \
        echo "🌐 Frontend: http://localhost:{{ DEV_PORT }}"; \
    else \
        echo "❌ No Docker services are running"; \
    fi

# Show logs from Docker containers
logs:
    @echo "📋 Recent Docker container logs:"
    @if docker-compose ps | grep -q "Up"; then \
        echo "📄 Last 20 lines from all containers:"; \
        docker-compose logs --tail=20; \
    else \
        echo "❌ No running Docker containers found"; \
    fi

# Follow logs in real-time
follow-logs:
    @echo "📋 Following Docker container logs (Ctrl+C to stop):"
    @if docker-compose ps | grep -q "Up"; then \
        docker-compose logs -f; \
    else \
        echo "❌ No running Docker containers found"; \
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
    @if docker-compose ps | grep -q "Up"; then \
        echo "✅ Docker containers are running"; \
    else \
        echo "❌ Docker containers are not running"; \
    fi