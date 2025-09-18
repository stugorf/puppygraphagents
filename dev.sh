#!/bin/bash

# Development and Production Docker Management Script
# Usage: ./dev.sh [dev|prod|stop|clean]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
}

# Function to check if .env file exists
check_env() {
    if [ ! -f .env ]; then
        print_warning ".env file not found. Creating from env.example..."
        if [ -f env.example ]; then
            cp env.example .env
            print_success "Created .env file from env.example"
        else
            print_error "env.example file not found. Please create a .env file manually."
            exit 1
        fi
    fi
}

# Function to start development mode
start_dev() {
    print_status "Starting development mode with hot reloading..."
    check_docker
    check_env
    
    # Stop any existing containers
    print_status "Stopping existing containers..."
    docker-compose -f docker-compose.dev.yml down 2>/dev/null || true
    
    # Start development containers
    print_status "Starting development containers..."
    docker-compose -f docker-compose.dev.yml up --build -d
    
    print_success "Development mode started!"
    print_status "Application will be available at: http://localhost:5000"
    print_status "PuppyGraph UI will be available at: http://localhost:8081"
    print_status "PostgreSQL will be available at: localhost:5432"
    print_status ""
    print_status "To view logs: docker-compose -f docker-compose.dev.yml logs -f app"
    print_status "To stop: ./dev.sh stop"
}

# Function to start production mode
start_prod() {
    print_status "Starting production mode..."
    check_docker
    check_env
    
    # Stop any existing containers
    print_status "Stopping existing containers..."
    docker-compose down 2>/dev/null || true
    
    # Start production containers
    print_status "Building and starting production containers..."
    docker-compose up --build -d
    
    print_success "Production mode started!"
    print_status "Application will be available at: http://localhost:5000"
    print_status "PuppyGraph UI will be available at: http://localhost:8081"
    print_status "PostgreSQL will be available at: localhost:5432"
    print_status ""
    print_status "To view logs: docker-compose logs -f app"
    print_status "To stop: ./dev.sh stop"
}

# Function to stop containers
stop_containers() {
    print_status "Stopping all containers..."
    
    # Stop development containers
    docker-compose -f docker-compose.dev.yml down 2>/dev/null || true
    
    # Stop production containers
    docker-compose down 2>/dev/null || true
    
    print_success "All containers stopped!"
}

# Function to clean up containers and volumes
clean_up() {
    print_status "Cleaning up containers, networks, and volumes..."
    
    # Stop and remove containers
    stop_containers
    
    # Remove development containers and volumes
    docker-compose -f docker-compose.dev.yml down -v --remove-orphans 2>/dev/null || true
    
    # Remove production containers and volumes
    docker-compose down -v --remove-orphans 2>/dev/null || true
    
    # Remove unused images
    print_status "Removing unused Docker images..."
    docker image prune -f
    
    print_success "Cleanup completed!"
}

# Function to show status
show_status() {
    print_status "Container Status:"
    echo ""
    
    # Check development containers
    if docker-compose -f docker-compose.dev.yml ps | grep -q "Up"; then
        print_success "Development mode is running"
        docker-compose -f docker-compose.dev.yml ps
    else
        print_warning "Development mode is not running"
    fi
    
    echo ""
    
    # Check production containers
    if docker-compose ps | grep -q "Up"; then
        print_success "Production mode is running"
        docker-compose ps
    else
        print_warning "Production mode is not running"
    fi
}

# Function to show help
show_help() {
    echo "Temporal Knowledge Graph - Docker Management Script"
    echo ""
    echo "Usage: ./dev.sh [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  dev     Start development mode with hot reloading"
    echo "  prod    Start production mode (rebuilds containers)"
    echo "  stop    Stop all running containers"
    echo "  clean   Stop containers and clean up volumes/images"
    echo "  status  Show status of all containers"
    echo "  help    Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./dev.sh dev     # Start development mode"
    echo "  ./dev.sh prod    # Start production mode"
    echo "  ./dev.sh stop    # Stop all containers"
    echo "  ./dev.sh clean   # Clean up everything"
    echo "  ./dev.sh status  # Show container status"
}

# Main script logic
case "${1:-help}" in
    dev)
        start_dev
        ;;
    prod)
        start_prod
        ;;
    stop)
        stop_containers
        ;;
    clean)
        clean_up
        ;;
    status)
        show_status
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        print_error "Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac
