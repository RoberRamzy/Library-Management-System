#!/bin/bash

set -e  # Exit on error

echo "🚀 Library Management System - Setup Script"
echo "============================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored messages
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "ℹ️  $1"
}

# Check prerequisites
echo "📋 Checking prerequisites..."
echo ""

# Check Docker
if command -v docker &> /dev/null; then
    print_success "Docker is installed"
    # Check if user can access Docker
    if docker ps &>/dev/null; then
        print_success "Docker daemon is accessible"
    else
        print_error "Cannot access Docker daemon. Permission denied."
        echo ""
        echo "To fix this, run one of the following:"
        echo "  1. Add your user to the docker group (recommended):"
        echo "     sudo usermod -aG docker $USER"
        echo "     newgrp docker  # or log out and log back in"
        echo ""
        echo "  2. Or run this script with sudo (not recommended):"
        echo "     sudo ./setup.sh"
        echo ""
        exit 1
    fi
else
    print_error "Docker is not installed. Please install Docker first."
    exit 1
fi

# Check Docker Compose
if command -v docker-compose &> /dev/null || docker compose version &> /dev/null; then
    print_success "Docker Compose is installed"
else
    print_error "Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Check Python
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
    print_success "Python is installed ($PYTHON_VERSION)"
else
    print_error "Python 3 is not installed. Please install Python 3.8+ first."
    exit 1
fi

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_success "Node.js is installed ($NODE_VERSION)"
else
    print_error "Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    print_success "npm is installed ($NPM_VERSION)"
else
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

echo ""
echo "🗄️  Setting up Database..."
echo ""

# Stop existing containers if any
if docker ps -a | grep -q bookstore_db; then
    print_info "Stopping existing database container..."
    docker-compose down 2>/dev/null || docker compose down 2>/dev/null
fi

# Start database
print_info "Starting MySQL database..."
if docker-compose up -d 2>/dev/null || docker compose up -d 2>/dev/null; then
    print_success "Database container started"
else
    # Check if it's a permission error
    if docker ps &>/dev/null; then
        print_error "Failed to start database container"
        print_info "Check if port 3306 is already in use: lsof -i :3306"
        exit 1
    else
        print_error "Cannot access Docker daemon. Permission denied."
        echo ""
        echo "To fix this, run:"
        echo "  sudo usermod -aG docker $USER"
        echo "  newgrp docker  # or log out and log back in"
        echo ""
        echo "Then run this script again."
        exit 1
    fi
fi

# Wait for MySQL to be ready
print_info "Waiting for MySQL to be ready (this may take 15-30 seconds)..."
for i in {1..30}; do
    if docker exec bookstore_db mysql -uroot -proot -e "SELECT 1;" &>/dev/null; then
        print_success "MySQL is ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        print_error "MySQL failed to start after 30 seconds"
        print_info "Check logs with: docker-compose logs db"
        exit 1
    fi
    sleep 1
    echo -n "."
done
echo ""

# Verify database
if docker exec bookstore_db mysql -uroot -proot -e "USE bookstore; SHOW TABLES;" &>/dev/null; then
    print_success "Database 'bookstore' is initialized"
else
    print_warning "Database may not be fully initialized yet. Waiting a bit more..."
    sleep 5
    if docker exec bookstore_db mysql -uroot -proot -e "USE bookstore; SHOW TABLES;" &>/dev/null; then
        print_success "Database 'bookstore' is initialized"
    else
        print_error "Database initialization failed"
        print_info "Check logs with: docker-compose logs db"
        exit 1
    fi
fi

echo ""
echo "🐍 Setting up Python Backend..."
echo ""

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    print_info "Creating Python virtual environment..."
    python3 -m venv venv
    print_success "Virtual environment created"
else
    print_info "Virtual environment already exists"
fi

# Activate virtual environment
print_info "Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
print_info "Upgrading pip..."
pip install --quiet --upgrade pip

# Install Python dependencies
if [ -f "requirements.txt" ]; then
    print_info "Installing Python dependencies from requirements.txt..."
    pip install --quiet -r requirements.txt
    print_success "Python dependencies installed"
else
    print_warning "requirements.txt not found, installing dependencies manually..."
    pip install --quiet fastapi uvicorn mysql-connector-python "pydantic[email]"
    print_success "Python dependencies installed"
fi

# Deactivate virtual environment
deactivate

echo ""
echo "📦 Setting up Frontend..."
echo ""

# Navigate to frontend directory
cd frontend

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    print_info "Installing npm dependencies (this may take a few minutes)..."
    npm install
    print_success "Frontend dependencies installed"
else
    print_info "Frontend dependencies already installed"
    print_info "Running npm install to ensure everything is up to date..."
    npm install
    print_success "Frontend dependencies updated"
fi

cd ..

echo ""
echo "✨ Setup Complete!"
echo ""
echo "============================================"
echo "📝 Next Steps:"
echo "============================================"
echo ""
echo "To start the application, you need to run 3 commands in separate terminals:"
echo ""
echo "1. Start Backend:"
echo "   source venv/bin/activate"
echo "   uvicorn backend:app --reload --port 8000"
echo ""
echo "2. Start Frontend:"
echo "   cd frontend"
echo "   npm run dev"
echo ""
echo "3. The database is already running via Docker"
echo ""
echo "Then visit:"
echo "  - Frontend: http://localhost:5173"
echo "  - Backend API Docs: http://localhost:8000/docs"
echo ""
echo "============================================"
echo ""
read -p "Would you like to start the backend and frontend now? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    print_info "Starting services..."
    echo ""
    
    # Check if backend is already running
    if lsof -i :8000 &>/dev/null || netstat -an 2>/dev/null | grep :8000 | grep LISTEN &>/dev/null; then
        print_warning "Port 8000 is already in use. Backend may already be running."
    else
        print_info "Starting backend server in background..."
        source venv/bin/activate
        nohup uvicorn backend:app --reload --port 8000 > backend.log 2>&1 &
        BACKEND_PID=$!
        echo $BACKEND_PID > backend.pid
        print_success "Backend started (PID: $BACKEND_PID, logs: backend.log)"
        
        # Wait a bit for backend to start
        sleep 3
        
        # Check if backend started successfully
        if curl -s http://localhost:8000/docs &>/dev/null; then
            print_success "Backend is responding at http://localhost:8000"
        else
            print_warning "Backend may still be starting. Check logs: tail -f backend.log"
        fi
    fi
    
    # Check if frontend is already running
    if lsof -i :5173 &>/dev/null || netstat -an 2>/dev/null | grep :5173 | grep LISTEN &>/dev/null; then
        print_warning "Port 5173 is already in use. Frontend may already be running."
    else
        print_info "Starting frontend server in background..."
        cd frontend
        nohup npm run dev > ../frontend.log 2>&1 &
        FRONTEND_PID=$!
        echo $FRONTEND_PID > ../frontend.pid
        cd ..
        print_success "Frontend started (PID: $FRONTEND_PID, logs: frontend.log)"
        
        # Wait a bit for frontend to start
        sleep 3
        print_info "Frontend should be available at http://localhost:5173"
    fi
    
    echo ""
    echo "============================================"
    print_success "All services started!"
    echo "============================================"
    echo ""
    echo "🌐 Access the application:"
    echo "   Frontend: http://localhost:5173"
    echo "   Backend API: http://localhost:8000/docs"
    echo ""
    echo "📋 Service PIDs (saved in backend.pid and frontend.pid):"
    [ -f backend.pid ] && echo "   Backend PID: $(cat backend.pid)"
    [ -f frontend.pid ] && echo "   Frontend PID: $(cat frontend.pid)"
    echo ""
    echo "📝 View logs:"
    echo "   Backend: tail -f backend.log"
    echo "   Frontend: tail -f frontend.log"
    echo ""
    echo "🛑 To stop services:"
    echo "   ./stop.sh  (if available) or:"
    echo "   kill \$(cat backend.pid)  # Stop backend"
    echo "   kill \$(cat frontend.pid)  # Stop frontend"
    echo "   docker-compose down  # Stop database"
    echo ""
else
    echo ""
    print_info "Setup complete. Start services manually using the commands above."
fi

