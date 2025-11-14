#!/usr/bin/env bash

# DGX Spark MCP Server - Setup Script
# This script helps set up the development environment

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

check_command() {
    if command -v "$1" &> /dev/null; then
        print_success "$1 is installed"
        return 0
    else
        print_error "$1 is not installed"
        return 1
    fi
}

# Banner
echo ""
echo "╔════════════════════════════════════════╗"
echo "║   DGX Spark MCP Server Setup          ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Check prerequisites
print_info "Checking prerequisites..."
echo ""

PREREQS_MET=true

# Check Node.js
if check_command "node"; then
    NODE_VERSION=$(node --version)
    print_info "  Node.js version: $NODE_VERSION"

    # Check if version >= 18
    NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d'.' -f1 | sed 's/v//')
    if [ "$NODE_MAJOR" -lt 18 ]; then
        print_warning "  Node.js 18.0.0 or higher is recommended"
    fi
else
    PREREQS_MET=false
    print_error "  Please install Node.js 18.0.0 or higher"
fi

# Check npm
if check_command "npm"; then
    NPM_VERSION=$(npm --version)
    print_info "  npm version: $NPM_VERSION"
else
    PREREQS_MET=false
    print_error "  npm is required but not installed"
fi

# Check git
if check_command "git"; then
    GIT_VERSION=$(git --version | awk '{print $3}')
    print_info "  git version: $GIT_VERSION"
else
    print_warning "  git not found (recommended for version control)"
fi

# Check nvidia-smi (optional)
echo ""
if check_command "nvidia-smi"; then
    print_info "  GPU support detected"
    print_info "  You can run tests with real hardware"
else
    print_warning "  nvidia-smi not found"
    print_info "  Mock hardware will be used for development"
    print_info "  Set MOCK_HARDWARE=true to suppress warnings"
fi

# Check just (optional)
echo ""
if check_command "just"; then
    JUST_VERSION=$(just --version | awk '{print $2}')
    print_info "  just version: $JUST_VERSION"
    print_info "  You can use 'just' for development tasks"
else
    print_warning "  just not found (optional but recommended)"
    print_info "  Install with: cargo install just or brew install just"
fi

echo ""
if [ "$PREREQS_MET" = false ]; then
    print_error "Some prerequisites are missing. Please install them and run this script again."
    exit 1
fi

print_success "All required prerequisites are met!"
echo ""

# Ask if user wants to proceed with installation
read -p "Do you want to install dependencies? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_info "Setup cancelled."
    exit 0
fi

# Install dependencies
print_info "Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    print_success "Dependencies installed successfully"
else
    print_error "Failed to install dependencies"
    exit 1
fi

echo ""

# Build the project
print_info "Building the project..."
npm run build

if [ $? -eq 0 ]; then
    print_success "Project built successfully"
else
    print_error "Build failed"
    exit 1
fi

echo ""

# Run basic tests
print_info "Running basic tests to verify setup..."
MOCK_HARDWARE=true npm test -- --passWithNoTests --testPathPattern=config 2>&1 | tail -30 || true

print_success "Basic setup verification complete"
print_info "Run 'npm test' to see full test results"

echo ""

# Create necessary directories
print_info "Creating necessary directories..."
mkdir -p logs config

print_success "Directories created"

echo ""
echo "╔════════════════════════════════════════╗"
echo "║   Setup Complete! 🎉                  ║"
echo "╚════════════════════════════════════════╝"
echo ""

print_info "Next steps:"
echo ""
echo "  1. Start development server:"
echo "     ${GREEN}npm run dev${NC} or ${GREEN}just dev${NC}"
echo ""
echo "  2. Run tests:"
echo "     ${GREEN}npm test${NC} or ${GREEN}just test${NC}"
echo ""
echo "  3. Build for production:"
echo "     ${GREEN}npm run build${NC} or ${GREEN}just build${NC}"
echo ""
echo "  4. Link package globally (optional):"
echo "     ${GREEN}npm link${NC} or ${GREEN}just link${NC}"
echo ""

if [ ! -f ".env" ]; then
    print_info "Optional: Create a .env file for custom configuration"
    echo ""
fi

print_info "For more information, see:"
echo "  - ${BLUE}README.md${NC} - Project overview"
echo "  - ${BLUE}CONTRIBUTING.md${NC} - Contribution guidelines"
echo "  - ${BLUE}docs/development.md${NC} - Development guide"
echo ""

print_success "Happy coding!"
echo ""
