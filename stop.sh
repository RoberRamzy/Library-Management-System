#!/bin/bash

echo "🛑 Stopping Library Management System Services..."
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Stop backend
if [ -f backend.pid ]; then
    PID=$(cat backend.pid)
    if ps -p $PID > /dev/null 2>&1; then
        kill $PID 2>/dev/null
        echo -e "${GREEN}✅ Backend stopped (PID: $PID)${NC}"
    else
        echo -e "${YELLOW}⚠️  Backend process not found${NC}"
    fi
    rm -f backend.pid
else
    echo -e "${YELLOW}⚠️  Backend PID file not found${NC}"
    # Try to kill by port
    if lsof -ti :8000 &>/dev/null; then
        kill $(lsof -ti :8000) 2>/dev/null
        echo -e "${GREEN}✅ Stopped process on port 8000${NC}"
    fi
fi

# Stop frontend
if [ -f frontend.pid ]; then
    PID=$(cat frontend.pid)
    if ps -p $PID > /dev/null 2>&1; then
        kill $PID 2>/dev/null
        echo -e "${GREEN}✅ Frontend stopped (PID: $PID)${NC}"
    else
        echo -e "${YELLOW}⚠️  Frontend process not found${NC}"
    fi
    rm -f frontend.pid
else
    echo -e "${YELLOW}⚠️  Frontend PID file not found${NC}"
    # Try to kill by port
    if lsof -ti :5173 &>/dev/null; then
        kill $(lsof -ti :5173) 2>/dev/null
        echo -e "${GREEN}✅ Stopped process on port 5173${NC}"
    fi
fi

# Stop database
echo ""
read -p "Stop database container? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if docker ps | grep -q bookstore_db; then
        echo ""
        read -p "Remove containers? Data will be preserved. (y/n) " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            docker-compose down 2>/dev/null || docker compose down 2>/dev/null
            echo -e "${GREEN}✅ Database container stopped and removed (data preserved)${NC}"
        else
            docker-compose stop 2>/dev/null || docker compose stop 2>/dev/null
            echo -e "${GREEN}✅ Database container stopped (data preserved)${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Database container is not running${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Database container kept running${NC}"
fi

echo ""
echo "✨ All services stopped!"

