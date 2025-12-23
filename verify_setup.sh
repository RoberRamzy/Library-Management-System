#!/bin/bash

echo "🔍 Verifying Library Management System Setup..."
echo ""

# Check if database is running
echo "1. Checking MySQL Database..."
if docker ps | grep -q bookstore_db; then
    echo "   ✅ Database container is running"
else
    echo "   ❌ Database container is NOT running"
    echo "   Run: docker-compose up -d"
    exit 1
fi

# Check database connection
echo ""
echo "2. Testing Database Connection..."
if docker exec bookstore_db mysql -uroot -proot -e "USE bookstore; SELECT 1;" &>/dev/null; then
    echo "   ✅ Database connection successful"
else
    echo "   ❌ Cannot connect to database"
    exit 1
fi

# Check if backend port is in use
echo ""
echo "3. Checking Backend Server (Port 8000)..."
if lsof -i :8000 &>/dev/null || netstat -an | grep :8000 | grep LISTEN &>/dev/null; then
    echo "   ✅ Port 8000 is in use (backend may be running)"
else
    echo "   ⚠️  Port 8000 is not in use"
    echo "   Start backend with: uvicorn backend:app --reload --port 8000"
fi

# Test backend endpoint
echo ""
echo "4. Testing Backend API..."
if curl -s http://localhost:8000/docs &>/dev/null; then
    echo "   ✅ Backend API is accessible at http://localhost:8000"
else
    echo "   ❌ Backend API is NOT accessible"
    echo "   Make sure backend is running: uvicorn backend:app --reload --port 8000"
fi

# Check if frontend port is in use
echo ""
echo "5. Checking Frontend Server (Port 5173)..."
if lsof -i :5173 &>/dev/null || netstat -an | grep :5173 | grep LISTEN &>/dev/null; then
    echo "   ✅ Port 5173 is in use (frontend may be running)"
else
    echo "   ⚠️  Port 5173 is not in use"
    echo "   Start frontend with: cd frontend && npm run dev"
fi

echo ""
echo "✨ Setup verification complete!"

