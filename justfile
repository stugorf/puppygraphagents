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

# Start the application in production mode (all services in Docker)
start:
    @echo "🚀 Starting Temporal Knowledge Graph application (PRODUCTION)..."
    @echo "📦 Starting all Docker services..."
    docker-compose up -d
    @echo "⏳ Waiting for services to be ready..."
    @sleep 15
    @echo "✅ All services started in Docker containers"
    @echo "🌐 Frontend: http://localhost:{{ DEV_PORT }}"
    @echo "🏥 Health check: http://localhost:{{ DEV_PORT }}/api/health"
    @echo "📊 Run 'just status' to check if running"
    @echo "📋 Run 'just logs' to view logs"

# Start the application in development mode (with hot reloading)
start-dev:
    @echo "🚀 Starting Temporal Knowledge Graph application (DEVELOPMENT)..."
    @echo "📦 Starting all Docker services with dev configuration..."
    docker-compose -f docker-compose.dev.yml up -d
    @echo "⏳ Waiting for services to be ready..."
    @sleep 15
    @echo "✅ All services started in Docker containers"
    @echo "🌐 Frontend: http://localhost:{{ DEV_PORT }}"
    @echo "🏥 Health check: http://localhost:{{ DEV_PORT }}/api/health"
    @echo "📊 Run 'just status-dev' to check if running"
    @echo "📋 Run 'just logs-dev' to view logs"

# Stop the application (all Docker services)
stop:
    @echo "🛑 Stopping all Docker services..."
    -docker-compose down || echo "⚠️  Docker not running or no containers to stop"
    @echo "✅ Application stopped"

# Stop the development application
stop-dev:
    @echo "🛑 Stopping all Docker services (dev)..."
    -docker-compose -f docker-compose.dev.yml down || echo "⚠️  Docker not running or no containers to stop"
    @echo "✅ Application stopped"

# Restart the application
restart: stop start

# Restart the development application
restart-dev: stop-dev start-dev

# Rebuild and restart Docker services (useful for environment variable changes)
rebuild:
    @echo "🔄 Rebuilding Docker services with new environment variables (PRODUCTION)..."
    @echo "🛑 Stopping current services..."
    docker-compose down
    @echo "🔨 Rebuilding and starting services..."
    docker-compose up --build -d
    @echo "⏳ Waiting for services to be ready..."
    @sleep 10
    @echo "✅ Services rebuilt and restarted"
    @echo "🌐 Frontend: http://localhost:{{ DEV_PORT }}"
    @echo "🏥 Health check: http://localhost:{{ DEV_PORT }}/api/health"

# Rebuild and restart development Docker services
rebuild-dev:
    @echo "🔄 Rebuilding Docker services with new environment variables (DEVELOPMENT)..."
    @echo "🛑 Stopping current services..."
    docker-compose -f docker-compose.dev.yml down
    @echo "🔨 Rebuilding and starting services..."
    docker-compose -f docker-compose.dev.yml up --build -d
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

# Populate database with enhanced analytics data
populate-analytics:
    @echo "🌱 Populating database with enhanced analytics data..."
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
    @echo "🌱 Populating with enhanced data..."
    @if [ -f .env ]; then \
        set -a && source .env && set +a && node scripts/populate-analytics-data.js; \
    else \
        node scripts/populate-analytics-data.js; \
    fi
    @echo "✅ Enhanced analytics data populated successfully"
    @echo "📊 Analytics dashboard now has rich multi-sector data!"

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
    @echo "Run 'just start-dev' to begin development"

# Show application status
status:
    @echo "📊 Application Status (PRODUCTION):"
    @if docker-compose ps | grep -q "Up"; then \
        echo "✅ Docker services are running:"; \
        docker-compose ps; \
        echo "🌐 Frontend: http://localhost:{{ DEV_PORT }}"; \
    else \
        echo "❌ No Docker services are running"; \
    fi

# Show development application status
status-dev:
    @echo "📊 Application Status (DEVELOPMENT):"
    @if docker-compose -f docker-compose.dev.yml ps | grep -q "Up"; then \
        echo "✅ Docker services are running:"; \
        docker-compose -f docker-compose.dev.yml ps; \
        echo "🌐 Frontend: http://localhost:{{ DEV_PORT }}"; \
    else \
        echo "❌ No Docker services are running"; \
    fi

# Show logs from Docker containers
logs:
    @echo "📋 Recent Docker container logs (PRODUCTION):"
    @if docker-compose ps | grep -q "Up"; then \
        echo "📄 Last 20 lines from all containers:"; \
        docker-compose logs --tail=20; \
    else \
        echo "❌ No running Docker containers found"; \
    fi

# Show logs from development Docker containers
logs-dev:
    @echo "📋 Recent Docker container logs (DEVELOPMENT):"
    @if docker-compose -f docker-compose.dev.yml ps | grep -q "Up"; then \
        echo "📄 Last 20 lines from all containers:"; \
        docker-compose -f docker-compose.dev.yml logs --tail=20; \
    else \
        echo "❌ No running Docker containers found"; \
    fi

# Follow logs in real-time
follow-logs:
    @echo "📋 Following Docker container logs (Ctrl+C to stop) - PRODUCTION:"
    @if docker-compose ps | grep -q "Up"; then \
        docker-compose logs -f; \
    else \
        echo "❌ No running Docker containers found"; \
    fi

# Follow development logs in real-time
follow-logs-dev:
    @echo "📋 Following Docker container logs (Ctrl+C to stop) - DEVELOPMENT:"
    @if docker-compose -f docker-compose.dev.yml ps | grep -q "Up"; then \
        docker-compose -f docker-compose.dev.yml logs -f; \
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
    @echo "🏥 Health Check (PRODUCTION):"
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

# Quick health check for development
health-dev:
    @echo "🏥 Health Check (DEVELOPMENT):"
    @if curl -s http://localhost:{{ DEV_PORT }}/api/health > /dev/null 2>&1; then \
        echo "✅ API is responding"; \
    else \
        echo "❌ API is not responding"; \
    fi
    @if docker-compose -f docker-compose.dev.yml ps | grep -q "Up"; then \
        echo "✅ Docker containers are running"; \
    else \
        echo "❌ Docker containers are not running"; \
    fi