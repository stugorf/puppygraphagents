# Development Guide

This guide explains how to run the Temporal Knowledge Graph application in both development and production modes using Docker.

## Quick Start

### Development Mode (Hot Reloading)
```bash
./dev.sh dev
```

### Production Mode (Optimized Build)
```bash
./dev.sh prod
```

### Stop All Containers
```bash
./dev.sh stop
```

### Clean Up Everything
```bash
./dev.sh clean
```

## Development vs Production Modes

### Development Mode (`./dev.sh dev`)
- **Hot Reloading**: Changes to source code are automatically reflected without rebuilding
- **Source Code Mounting**: Client and server code is mounted as volumes
- **Fast Iteration**: No need to rebuild Docker images for code changes
- **Debugging**: Full source maps and development tools available
- **File Watching**: Automatic restart on file changes

**When to use**: During active development, testing new features, debugging

### Production Mode (`./dev.sh prod`)
- **Optimized Build**: Code is compiled and optimized for production
- **Smaller Images**: Only production dependencies included
- **Better Performance**: Optimized for runtime performance
- **Security**: Non-root user, minimal attack surface
- **Stable**: No automatic restarts, consistent behavior

**When to use**: For final testing, deployment, performance testing

## Prerequisites

1. **Docker**: Make sure Docker is installed and running
2. **Environment Variables**: Create a `.env` file (copied from `env.example` if needed)
3. **Ports**: Ensure ports 5000, 5432, 7687, 8081, and 8182 are available

## Environment Setup

### 1. Environment Variables
The application requires several environment variables. Copy `env.example` to `.env` and fill in the values:

```bash
cp env.example .env
```

Required variables:
- `PUPPYGRAPH_USERNAME`: Username for PuppyGraph
- `PUPPYGRAPH_PASSWORD`: Password for PuppyGraph
- `PUPPYGRAPH_SCHEMA_PATH`: Path to graph schema
- `OPEN_ROUTER_KEY`: API key for OpenRouter (for AI features)
- `OPEN_ROUTER_API_BASE`: Base URL for OpenRouter API
- `SESSION_SECRET`: Secret for session management

### 2. Database Schema
The application will automatically initialize the database schema on first run.

## Development Workflow

### 1. Start Development Mode
```bash
./dev.sh dev
```

This will:
- Start PostgreSQL database
- Start PuppyGraph service
- Start the application with hot reloading
- Mount source code as volumes

### 2. Make Changes
- Edit files in `client/`, `server/`, or `shared/`
- Changes are automatically detected and applied
- No need to rebuild containers

### 3. View Logs
```bash
# View all logs
docker-compose -f docker-compose.dev.yml logs -f

# View specific service logs
docker-compose -f docker-compose.dev.yml logs -f app
docker-compose -f docker-compose.dev.yml logs -f postgres
docker-compose -f docker-compose.dev.yml logs -f puppygraph
```

### 4. Test Changes
- Application: http://localhost:5000
- PuppyGraph UI: http://localhost:8081
- Database: localhost:5432

### 5. Stop Development
```bash
./dev.sh stop
```

## Production Workflow

### 1. Start Production Mode
```bash
./dev.sh prod
```

This will:
- Build optimized Docker images
- Start all services with production configuration
- Apply security best practices

### 2. Test Production Build
- Verify all features work correctly
- Test performance characteristics
- Validate security settings

### 3. Deploy
- Use the same Docker images for deployment
- Configure environment variables for target environment
- Set up proper monitoring and logging

## Available Scripts

### Development Scripts
```bash
./dev.sh dev      # Start development mode
./dev.sh prod     # Start production mode
./dev.sh stop     # Stop all containers
./dev.sh clean    # Clean up everything
./dev.sh status   # Show container status
./dev.sh help     # Show help
```

### NPM Scripts (inside container)
```bash
npm run dev       # Start development server
npm run build     # Build client for production
npm run start     # Start production server
npm run check     # TypeScript type checking
npm run db:push   # Push database schema changes
```

## Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Check what's using the port
lsof -i :5000
lsof -i :5432
lsof -i :8081

# Kill the process or use different ports
```

#### 2. Docker Not Running
```bash
# Start Docker Desktop or Docker daemon
# On macOS: Open Docker Desktop
# On Linux: sudo systemctl start docker
```

#### 3. Permission Issues
```bash
# Make sure the script is executable
chmod +x dev.sh

# Check Docker permissions
docker ps
```

#### 4. Database Connection Issues
```bash
# Check if PostgreSQL is running
docker-compose -f docker-compose.dev.yml logs postgres

# Restart database
docker-compose -f docker-compose.dev.yml restart postgres
```

#### 5. PuppyGraph Connection Issues
```bash
# Check if PuppyGraph is running
docker-compose -f docker-compose.dev.yml logs puppygraph

# Restart PuppyGraph
docker-compose -f docker-compose.dev.yml restart puppygraph
```

### Debugging

#### 1. View Container Logs
```bash
# All services
docker-compose -f docker-compose.dev.yml logs -f

# Specific service
docker-compose -f docker-compose.dev.yml logs -f app
```

#### 2. Access Container Shell
```bash
# Access app container
docker-compose -f docker-compose.dev.yml exec app sh

# Access database
docker-compose -f docker-compose.dev.yml exec postgres psql -U postgres -d temporal_graph
```

#### 3. Check Container Status
```bash
# Show running containers
docker-compose -f docker-compose.dev.yml ps

# Show all containers (including stopped)
docker-compose -f docker-compose.dev.yml ps -a
```

## File Structure

```
├── client/                 # Frontend React application
├── server/                 # Backend Express server
├── shared/                 # Shared TypeScript types
├── docker-compose.yml      # Production Docker Compose
├── docker-compose.dev.yml  # Development Docker Compose
├── Dockerfile              # Production Dockerfile
├── Dockerfile.dev          # Development Dockerfile
├── dev.sh                  # Development management script
└── DEVELOPMENT.md          # This file
```

## Best Practices

### Development
1. **Use Development Mode**: Always use `./dev.sh dev` for development
2. **Check Logs**: Monitor logs for errors and warnings
3. **Test Changes**: Verify changes work in both dev and prod modes
4. **Clean Up**: Use `./dev.sh clean` periodically to free up space

### Production
1. **Test First**: Always test in production mode before deploying
2. **Environment Variables**: Ensure all required env vars are set
3. **Security**: Review security settings and access controls
4. **Monitoring**: Set up proper monitoring and alerting

## Performance Tips

### Development
- Use development mode for faster iteration
- Monitor memory usage with `docker stats`
- Clean up unused containers regularly

### Production
- Use production mode for better performance
- Optimize Docker images for size
- Configure proper resource limits
- Use multi-stage builds for smaller images

## Security Considerations

### Development
- Source code is mounted as volumes (read-only for assets)
- Non-root user in containers
- Network isolation between services

### Production
- No source code mounting
- Optimized images with minimal dependencies
- Non-root user execution
- Proper secret management
- Network security policies

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review container logs for error messages
3. Verify environment variables are set correctly
4. Ensure all required ports are available
5. Check Docker and Docker Compose versions

For additional help, refer to the main README.md or create an issue in the project repository.
