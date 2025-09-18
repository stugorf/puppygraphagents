#!/bin/bash

# Test script to verify development setup
# Usage: ./test-dev-setup.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[TEST]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[PASS]${NC} $1"
}

print_error() {
    echo -e "${RED}[FAIL]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Test functions
test_docker() {
    print_status "Testing Docker installation..."
    if docker --version > /dev/null 2>&1; then
        print_success "Docker is installed"
    else
        print_error "Docker is not installed or not in PATH"
        return 1
    fi
}

test_docker_compose() {
    print_status "Testing Docker Compose..."
    if docker-compose --version > /dev/null 2>&1; then
        print_success "Docker Compose is available"
    else
        print_error "Docker Compose is not available"
        return 1
    fi
}

test_env_file() {
    print_status "Testing environment file..."
    if [ -f .env ]; then
        print_success ".env file exists"
    elif [ -f env.example ]; then
        print_warning ".env file not found, but env.example exists"
        print_status "Creating .env from env.example..."
        cp env.example .env
        print_success "Created .env file"
    else
        print_error "Neither .env nor env.example found"
        return 1
    fi
}

test_dev_script() {
    print_status "Testing development script..."
    if [ -f dev.sh ] && [ -x dev.sh ]; then
        print_success "dev.sh script exists and is executable"
    else
        print_error "dev.sh script not found or not executable"
        return 1
    fi
}

test_docker_files() {
    print_status "Testing Docker files..."
    
    if [ -f Dockerfile ]; then
        print_success "Production Dockerfile exists"
    else
        print_error "Production Dockerfile not found"
        return 1
    fi
    
    if [ -f Dockerfile.dev ]; then
        print_success "Development Dockerfile exists"
    else
        print_error "Development Dockerfile not found"
        return 1
    fi
    
    if [ -f docker-compose.yml ]; then
        print_success "Production docker-compose.yml exists"
    else
        print_error "Production docker-compose.yml not found"
        return 1
    fi
    
    if [ -f docker-compose.dev.yml ]; then
        print_success "Development docker-compose.dev.yml exists"
    else
        print_error "Development docker-compose.dev.yml not found"
        return 1
    fi
}

test_source_structure() {
    print_status "Testing source code structure..."
    
    local required_dirs=("client" "server" "shared")
    for dir in "${required_dirs[@]}"; do
        if [ -d "$dir" ]; then
            print_success "Directory $dir exists"
        else
            print_error "Directory $dir not found"
            return 1
        fi
    done
}

test_package_json() {
    print_status "Testing package.json..."
    if [ -f package.json ]; then
        print_success "package.json exists"
        
        # Check for required scripts
        if grep -q '"dev"' package.json; then
            print_success "dev script found in package.json"
        else
            print_error "dev script not found in package.json"
            return 1
        fi
    else
        print_error "package.json not found"
        return 1
    fi
}

test_ports_available() {
    print_status "Testing port availability..."
    
    local ports=(5000 5432 7687 8081 8182)
    for port in "${ports[@]}"; do
        if lsof -i :$port > /dev/null 2>&1; then
            print_warning "Port $port is already in use"
        else
            print_success "Port $port is available"
        fi
    done
}

# Main test execution
main() {
    echo "=========================================="
    echo "Temporal Knowledge Graph - Setup Test"
    echo "=========================================="
    echo ""
    
    local tests=(
        "test_docker"
        "test_docker_compose"
        "test_env_file"
        "test_dev_script"
        "test_docker_files"
        "test_source_structure"
        "test_package_json"
        "test_ports_available"
    )
    
    local passed=0
    local total=${#tests[@]}
    
    for test in "${tests[@]}"; do
        if $test; then
            ((passed++))
        else
            echo ""
        fi
    done
    
    echo ""
    echo "=========================================="
    echo "Test Results: $passed/$total tests passed"
    echo "=========================================="
    
    if [ $passed -eq $total ]; then
        print_success "All tests passed! You're ready to start development."
        echo ""
        echo "Next steps:"
        echo "1. Edit .env file with your API keys"
        echo "2. Run: ./dev.sh dev"
        echo "3. Open: http://localhost:5000"
    else
        print_error "Some tests failed. Please fix the issues above."
        exit 1
    fi
}

# Run the tests
main
