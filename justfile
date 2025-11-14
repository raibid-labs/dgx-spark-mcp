# DGX Spark MCP Server - Development Commands
# https://just.systems/

# Default recipe to display help information
default:
    @just --list

# Display detailed help information
help:
    @echo "DGX Spark MCP Server - Development Commands"
    @echo ""
    @echo "Quick Start:"
    @echo "  just setup                  - First-time setup for development"
    @echo "  just dev                    - Start development server with hot reload"
    @echo "  just test                   - Run tests"
    @echo "  just build                  - Build the project"
    @echo ""
    @echo "MCP Configuration:"
    @echo "  just generate-mcp-config    - Show MCP config for Claude Desktop"
    @echo "  just save-mcp-config        - Save MCP config to mcp-config.json"
    @echo "  just install-mcp-config     - Auto-install config (macOS/Linux)"
    @echo "  just mcp-status             - Show MCP server status"
    @echo ""
    @echo "Common Workflows:"
    @echo "  just pre-commit             - Run all pre-commit checks"
    @echo "  just pre-push               - Run all pre-push checks"
    @echo "  just link                   - Link package globally for testing"
    @echo ""
    @echo "See 'just --list' for all available commands"
    @echo ""
    @echo "Documentation: https://github.com/raibid-labs/dgx-spark-mcp"

# ============================================================================
# Build Commands
# ============================================================================

# Build the project (compile TypeScript)
build:
    @echo "Building TypeScript..."
    npm run build
    @echo "Build complete!"

# Clean build artifacts
clean:
    @echo "Cleaning build artifacts..."
    npm run clean
    rm -rf coverage/
    rm -rf .nyc_output/
    rm -rf *.log
    @echo "Clean complete!"

# Clean and rebuild
rebuild: clean build

# Build documentation index
docs-build: build
    @echo "Building documentation index..."
    npm run docs:build
    @echo "Documentation index built!"

# ============================================================================
# Test Commands
# ============================================================================

# Run all tests
test:
    @echo "Running tests..."
    npm test

# Run tests in watch mode
test-watch:
    @echo "Running tests in watch mode..."
    npm run test:watch

# Run tests with coverage
test-coverage:
    @echo "Running tests with coverage..."
    npm run test:coverage
    @echo "Coverage report generated in coverage/"

# Run integration tests
test-integration:
    @echo "Running integration tests..."
    npm run test:integration

# Run tests with mocked hardware
test-mock:
    @echo "Running tests with mocked hardware..."
    MOCK_HARDWARE=true npm test

# Run performance benchmarks
test-benchmark:
    @echo "Running performance benchmarks..."
    npm run test:benchmark

# ============================================================================
# Development Server
# ============================================================================

# Run development server with hot reload
dev:
    @echo "Starting development server..."
    npm run dev

# Run production server
start: build
    @echo "Starting production server..."
    npm start

# ============================================================================
# Code Quality
# ============================================================================

# Run linter
lint:
    @echo "Running linter..."
    npm run lint

# Fix linting issues
lint-fix:
    @echo "Fixing linting issues..."
    npm run lint:fix

# Format code
format:
    @echo "Formatting code..."
    npm run format

# Check code formatting
format-check:
    @echo "Checking code formatting..."
    npm run format:check

# Run type checking
typecheck:
    @echo "Running type checker..."
    npm run typecheck

# Run all code quality checks
check: lint format-check typecheck
    @echo "All checks passed!"

# ============================================================================
# Docker Commands
# ============================================================================

# Build Docker image
docker-build:
    @echo "Building Docker image..."
    docker build -t dgx-spark-mcp:latest .
    @echo "Docker image built!"

# Run Docker container
docker-run:
    @echo "Running Docker container..."
    docker run --rm -it \
        --name dgx-spark-mcp \
        -v $(pwd)/config:/app/config:ro \
        -v $(pwd)/logs:/app/logs \
        dgx-spark-mcp:latest

# Run Docker container with GPU support
docker-run-gpu:
    @echo "Running Docker container with GPU support..."
    docker run --rm -it \
        --name dgx-spark-mcp \
        --gpus all \
        -v $(pwd)/config:/app/config:ro \
        -v $(pwd)/logs:/app/logs \
        dgx-spark-mcp:latest

# Stop Docker container
docker-stop:
    @echo "Stopping Docker container..."
    docker stop dgx-spark-mcp

# Remove Docker image
docker-clean:
    @echo "Removing Docker image..."
    docker rmi dgx-spark-mcp:latest

# Run Docker shell
docker-shell:
    @echo "Starting Docker shell..."
    docker run --rm -it \
        --entrypoint /bin/bash \
        dgx-spark-mcp:latest

# ============================================================================
# Deployment Commands
# ============================================================================

# Install systemd service
install: build
    @echo "Installing systemd service..."
    sudo ./scripts/install.sh
    @echo "Installation complete!"

# Update to latest version
update:
    @echo "Updating to latest version..."
    ./scripts/update.sh
    @echo "Update complete!"

# Rollback to previous version
rollback:
    @echo "Rolling back to previous version..."
    ./scripts/rollback.sh
    @echo "Rollback complete!"

# Start systemd service
service-start:
    @echo "Starting systemd service..."
    sudo systemctl start dgx-spark-mcp
    sudo systemctl status dgx-spark-mcp

# Stop systemd service
service-stop:
    @echo "Stopping systemd service..."
    sudo systemctl stop dgx-spark-mcp

# Restart systemd service
service-restart:
    @echo "Restarting systemd service..."
    sudo systemctl restart dgx-spark-mcp
    sudo systemctl status dgx-spark-mcp

# View service status
service-status:
    @echo "Service status:"
    sudo systemctl status dgx-spark-mcp

# View service logs
service-logs:
    @echo "Service logs:"
    sudo journalctl -u dgx-spark-mcp -f

# Enable service on boot
service-enable:
    @echo "Enabling service on boot..."
    sudo systemctl enable dgx-spark-mcp

# Disable service on boot
service-disable:
    @echo "Disabling service on boot..."
    sudo systemctl disable dgx-spark-mcp

# ============================================================================
# Monitoring Commands
# ============================================================================

# Check health endpoint
health:
    @echo "Checking health endpoint..."
    curl -s http://localhost:3000/health | jq .

# Check metrics endpoint
metrics:
    @echo "Fetching Prometheus metrics..."
    curl -s http://localhost:3000/metrics

# View logs
logs:
    @echo "Tailing logs..."
    tail -f logs/dgx-mcp-combined.log

# View error logs
logs-error:
    @echo "Tailing error logs..."
    tail -f logs/dgx-mcp-error.log

# ============================================================================
# MCP Configuration Commands
# ============================================================================

# Generate MCP configuration for Claude Desktop/Code
generate-mcp-config:
    @echo "Generating MCP configuration..."
    @echo ""
    @echo "Add this to your Claude Desktop config:"
    @echo ""
    @echo '{'
    @echo '  "mcpServers": {'
    @echo '    "dgx-spark": {'
    @echo '      "command": "node",'
    @echo '      "args": ["{{justfile_directory()}}/dist/index.js"]'
    @echo '    }'
    @echo '  }'
    @echo '}'
    @echo ""
    @echo "Configuration file locations:"
    @echo "  macOS:   ~/Library/Application Support/Claude/claude_desktop_config.json"
    @echo "  Linux:   ~/.config/Claude/claude_desktop_config.json"
    @echo "  Windows: %APPDATA%\\Claude\\claude_desktop_config.json"
    @echo ""

# Generate and save MCP config to local file
save-mcp-config:
    @echo "Saving MCP configuration to mcp-config.json..."
    @echo '{' > mcp-config.json
    @echo '  "mcpServers": {' >> mcp-config.json
    @echo '    "dgx-spark": {' >> mcp-config.json
    @echo '      "command": "node",' >> mcp-config.json
    @echo '      "args": ["{{justfile_directory()}}/dist/index.js"]' >> mcp-config.json
    @echo '    }' >> mcp-config.json
    @echo '  }' >> mcp-config.json
    @echo '}' >> mcp-config.json
    @echo "✓ Configuration saved to mcp-config.json"
    @echo ""
    @echo "To use this configuration:"
    @echo "  1. Copy the contents of mcp-config.json"
    @echo "  2. Merge it into your Claude Desktop config file"
    @echo ""

# Install MCP config to Claude Desktop (macOS/Linux)
install-mcp-config: build
    #!/usr/bin/env bash
    set -euo pipefail

    # Detect OS and set config path
    if [[ "$OSTYPE" == "darwin"* ]]; then
        CONFIG_DIR="$HOME/Library/Application Support/Claude"
        CONFIG_FILE="$CONFIG_DIR/claude_desktop_config.json"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        CONFIG_DIR="$HOME/.config/Claude"
        CONFIG_FILE="$CONFIG_DIR/claude_desktop_config.json"
    else
        echo "❌ Unsupported OS: $OSTYPE"
        echo "Please manually add configuration to your Claude Desktop config"
        exit 1
    fi

    # Create config directory if it doesn't exist
    mkdir -p "$CONFIG_DIR"

    # Generate the server config
    SERVER_CONFIG=$(cat <<EOF
    "dgx-spark": {
      "command": "node",
      "args": ["{{justfile_directory()}}/dist/index.js"]
    }
    EOF
    )

    # Check if config file exists
    if [ -f "$CONFIG_FILE" ]; then
        echo "⚠️  Config file already exists at: $CONFIG_FILE"
        echo ""
        echo "Please manually add this to your mcpServers section:"
        echo ""
        echo "$SERVER_CONFIG"
        echo ""
    else
        echo "Creating new config file at: $CONFIG_FILE"
        cat > "$CONFIG_FILE" <<EOF
    {
      "mcpServers": {
        $SERVER_CONFIG
      }
    }
    EOF
        echo "✓ Configuration installed successfully!"
        echo ""
        echo "Restart Claude Desktop to use the DGX Spark MCP server"
    fi

# Show current MCP configuration status
mcp-status:
    @echo "MCP Server Status:"
    @echo ""
    @echo "  Project: {{justfile_directory()}}"
    @echo "  Binary:  {{justfile_directory()}}/dist/index.js"
    @if [ -f "{{justfile_directory()}}/dist/index.js" ]; then \
        echo "  Status:  ✓ Built and ready"; \
    else \
        echo "  Status:  ✗ Not built (run 'just build')"; \
    fi
    @echo ""
    @echo "To configure Claude Desktop, run:"
    @echo "  just generate-mcp-config    # Show config to copy"
    @echo "  just save-mcp-config        # Save config to file"
    @echo "  just install-mcp-config     # Auto-install (macOS/Linux)"
    @echo ""

# ============================================================================
# Setup and Installation Commands
# ============================================================================

# First-time setup for development
setup:
    @echo "Setting up development environment..."
    @echo "Installing dependencies..."
    npm install
    @echo "Building project..."
    npm run build
    @echo "Running basic tests to verify setup..."
    -MOCK_HARDWARE=true npm test -- --passWithNoTests --testPathPattern=config 2>&1 | tail -20 || true
    @echo ""
    @echo "✓ Setup complete!"
    @echo ""
    @echo "Next steps:"
    @echo "  - Run 'just dev' to start development server"
    @echo "  - Run 'just test' to run all tests"
    @echo "  - Run 'just --list' to see all available commands"

# Link package globally for local testing
link: build
    @echo "Linking package globally..."
    npm link
    @echo "Package linked! You can now use 'dgx-spark-mcp' command globally."

# Unlink global package
unlink:
    @echo "Unlinking package..."
    npm unlink -g dgx-spark-mcp
    @echo "Package unlinked!"

# Prepare package for publishing
prepare-publish: clean check test-coverage build
    @echo "Package is ready for publishing!"
    @echo "Run 'npm publish' to publish to npm registry."

# ============================================================================
# Utility Commands
# ============================================================================

# Validate configuration
validate-config: build
    @echo "Validating configuration..."
    npm run validate-config
    @echo "Configuration is valid!"

# Search documentation
docs-search query:
    @echo "Searching documentation for: {{query}}"
    npm run docs:search -- "{{query}}"

# Generate hardware report
hardware-report:
    @echo "Generating hardware report..."
    node test-hardware.mjs

# Test Spark intelligence
test-spark:
    @echo "Testing Spark intelligence..."
    node test-intelligence.js

# Install dependencies
deps:
    @echo "Installing dependencies..."
    npm install

# Update dependencies
deps-update:
    @echo "Updating dependencies..."
    npm update

# Check for outdated dependencies
deps-outdated:
    @echo "Checking for outdated dependencies..."
    npm outdated

# Audit dependencies for vulnerabilities
deps-audit:
    @echo "Auditing dependencies..."
    npm audit

# Fix dependency vulnerabilities
deps-audit-fix:
    @echo "Fixing dependency vulnerabilities..."
    npm audit fix

# ============================================================================
# Release Commands
# ============================================================================

# Create a new release (version bump)
release-patch:
    @echo "Creating patch release..."
    npm version patch
    git push --follow-tags

# Create a new minor release
release-minor:
    @echo "Creating minor release..."
    npm version minor
    git push --follow-tags

# Create a new major release
release-major:
    @echo "Creating major release..."
    npm version major
    git push --follow-tags

# ============================================================================
# CI/CD Commands
# ============================================================================

# Run CI pipeline locally (requires act)
ci-test:
    @echo "Running CI tests locally..."
    act -j test

# Run build workflow locally
ci-build:
    @echo "Running CI build locally..."
    act -j build

# Verify all workflows
ci-verify:
    @echo "Verifying GitHub Actions workflows..."
    act --list

# ============================================================================
# Complete Workflow Commands
# ============================================================================

# Full pre-commit check
pre-commit: check test build
    @echo "Pre-commit checks complete!"

# Full pre-push check
pre-push: check test-coverage build docker-build
    @echo "Pre-push checks complete!"

# Full release preparation
pre-release: clean check test-coverage build docker-build validate-config
    @echo "Pre-release checks complete!"
