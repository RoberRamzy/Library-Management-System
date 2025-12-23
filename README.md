# Library Management System

A full-stack Library Management System built with FastAPI (backend) and React (frontend).

## 🏗️ Architecture

- **Backend**: FastAPI (Python) with MySQL database
- **Frontend**: React + Vite
- **Database**: MySQL 8.0 (via Docker)

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Python 3.8+** and pip
- **Node.js 18+** and npm
- **Docker** and Docker Compose (for database)
- **MySQL Client** (optional, for direct database access)

### Docker Permission Setup (Linux)

If you get a "permission denied" error when running Docker commands, add your user to the docker group:

```bash
# Add your user to the docker group
sudo usermod -aG docker $USER

# Apply the changes (choose one):
# Option 1: Log out and log back in
# Option 2: Use newgrp to apply immediately
newgrp docker

# Verify it works
docker ps
```

## 🚀 Quick Start Guide

**In 3 steps:**

```bash
# 1. Start Database
docker-compose up -d

# 2. Start Backend (in a terminal)
source venv/bin/activate  # or: venv\Scripts\activate (Windows)
uvicorn backend:app --reload --port 8000

# 3. Start Frontend (in another terminal)
cd frontend
npm install  # Only first time
npm run dev
```

Then open http://localhost:5173 in your browser!

---

## 📖 Detailed Setup Instructions

### Step 1: Database Setup

The project uses Docker Compose to run MySQL. Start the database:

```bash
# Start MySQL database container
docker-compose up -d

# Verify the database is running
docker ps
```

The database will be available at:
- **Host**: `127.0.0.1` (localhost)
- **Port**: `3306`
- **Database**: `bookstore`
- **Username**: `root`
- **Password**: `root`

The `init.sql` file will automatically run to create the database schema and sample data.

**Important**: The database uses a persistent volume (`mysql_data`) to store data. This means:
- Data persists when you stop/restart the container with `docker-compose stop` or `docker-compose restart`
- Data is **lost** only if you use `docker-compose down -v` (which removes volumes)
- To start fresh, use: `docker-compose down -v && docker-compose up -d`

**Note**: The Docker configuration uses `mysql_native_password` authentication plugin for compatibility with `mysql-connector-python`.

**Note**: If you prefer to use an existing MySQL installation instead of Docker:
1. Create a database named `bookstore`
2. Update the database credentials in `backend.py` (lines 30-37)
3. Ensure MySQL uses `mysql_native_password` authentication or update the connection to support `caching_sha2_password`
4. Run `mysql -u root -p bookstore < init.sql` to initialize the schema

### Step 2: Backend Setup

1. **Create and activate a virtual environment** (recommended):

```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
# On Linux/Mac:
source venv/bin/activate
# On Windows:
# venv\Scripts\activate
```

2. **Install Python dependencies**:

```bash
pip install -r requirements.txt
```

Or install manually:

```bash
pip install fastapi uvicorn mysql-connector-python pydantic[email]
```

3. **Verify database connection** (optional):

```bash
python test.py
```

This should show: `{"status": "Connected to MySQL!", "version": "8.0.x"}`

4. **Start the backend server**:

```bash
# From the project root directory
uvicorn backend:app --reload --port 8000
```

The backend API will be available at: `http://localhost:8000`

You can verify it's running by visiting:
- API Documentation: `http://localhost:8000/docs`
- API Alternative Docs: `http://localhost:8000/redoc`

### Step 3: Frontend Setup

1. **Navigate to the frontend directory**:

```bash
cd frontend
```

2. **Install dependencies**:

```bash
npm install
```

3. **Start the development server**:

```bash
npm run dev
```

The frontend will be available at: `http://localhost:5173`

## 🔧 Configuration

### Backend Database Configuration

If you need to change database credentials, edit `backend.py`:

```python
db_config = {
    "host": "127.0.0.1",
    "user": "root",
    "password": "root",  # Change this if needed
    "database": "bookstore",
    "port": 3306
}
```

### Frontend API Configuration

The frontend connects to the backend at `http://localhost:8000` by default.

To change the API URL, create a `.env` file in the `frontend/` directory:

```bash
VITE_API_URL=http://localhost:8000
```

Or set it when running:

```bash
VITE_API_URL=http://localhost:8000 npm run dev
```

## ✅ Verify Setup

Run the verification script to check if everything is configured correctly:

```bash
./verify_setup.sh
```

Or manually verify:

1. **Database**: `docker ps | grep bookstore_db`
2. **Backend**: `curl http://localhost:8000/docs` (should show HTML)
3. **Frontend**: Open `http://localhost:5173` in browser

## 🐛 Troubleshooting

### NetworkError: Failed to fetch

If you're seeing a "NetworkError when attempting to fetch resource" error, follow these steps:

1. **Is the backend server running?**
   ```bash
   # Check if uvicorn is running
   ps aux | grep uvicorn
   # Or check the port (Linux/Mac)
   lsof -i :8000
   # Or (Linux)
   netstat -tulpn | grep :8000
   # Test if backend is responding
   curl http://localhost:8000/docs
   ```
   
   **Start the backend** (from project root):
   ```bash
   # Make sure you're in the virtual environment
   source venv/bin/activate  # Linux/Mac
   # venv\Scripts\activate   # Windows
   
   # Start the server
   uvicorn backend:app --reload --port 8000
   ```
   
   You should see output like:
   ```
   INFO:     Uvicorn running on http://127.0.0.1:8000
   INFO:     Application startup complete.
   ```

2. **Is the database running?**
   ```bash
   # Check Docker containers
   docker ps | grep bookstore_db
   # Check if MySQL is accessible
   docker exec bookstore_db mysql -uroot -proot -e "USE bookstore; SHOW TABLES;"
   # Or from host (if mysql client installed)
   mysql -h 127.0.0.1 -u root -proot -e "USE bookstore; SHOW TABLES;"
   ```
   
   **Start the database**:
   ```bash
   docker-compose up -d
   ```
   
   Wait a few seconds for MySQL to initialize, then verify:
   ```bash
   docker-compose logs db | tail -20
   ```

3. **Is the backend URL correct?**
   - Open browser Developer Tools (F12) and check the Console tab
   - Look for the exact URL being called (it should be `http://localhost:8000/...`)
   - Verify `frontend/src/App.jsx` has the correct `apiBase` URL:
     ```javascript
     const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'
     export const apiBase = API
     ```
   - Default should be: `http://localhost:8000`
   - Check Network tab in Developer Tools to see if requests are failing

4. **CORS Issues?**
   - The backend has CORS enabled for `http://localhost:5173` and `http://localhost:3000`
   - If using a different port, add it to `backend.py` lines 11-18

5. **Database Connection Error?**
   - Verify MySQL is running: `docker ps`
   - Check database credentials in `backend.py`
   - Test connection: `python test.py`
   - Check database exists: `mysql -h 127.0.0.1 -u root -proot -e "SHOW DATABASES;"`

### Common Error Messages

**"Database connection error: Can't connect to MySQL server"**
- Database container is not running → `docker-compose up -d`
- MySQL is still initializing → Wait 10-15 seconds and try again
- Wrong credentials → Check `backend.py` database configuration

**"Access denied for user 'root'@'localhost'"**
- Wrong password → Verify password in `backend.py` matches `docker-compose.yml`
- Database not initialized → Run `docker-compose down -v && docker-compose up -d`

**"Unknown database 'bookstore'"**
- Database schema not created → Check if `init.sql` was executed
- Solution: `docker-compose down -v && docker-compose up -d` (will recreate everything)

**"Database connection error: Authentication plugin 'caching_sha2_password' is not supported"**
- This happens because MySQL 8.0 uses a new authentication plugin that `mysql-connector-python` doesn't support by default
- **Solution**: Recreate the database with the updated configuration:
  ```bash
  # Stop and remove the existing database AND volumes (WARNING: deletes all data)
  docker-compose down -v
  
  # Start fresh with mysql_native_password authentication
  docker-compose up -d
  
  # Wait 15-30 seconds for MySQL to initialize, then restart your backend
  ```

**Data is lost when restarting container**
- If you use `docker-compose down` (without `-v`), data should persist
- Data is stored in a Docker volume (`mysql_data`) that persists between restarts
- Only `docker-compose down -v` removes the volume and deletes data
- To keep data: Use `docker-compose stop` and `docker-compose start` instead of `down`
- The `docker-compose.yml` and `backend.py` are already configured to use `mysql_native_password`
- If the error persists after recreating the database, verify the backend connection includes `auth_plugin: "mysql_native_password"` in `backend.py`

**Backend shows "Application startup complete" but API calls fail**
- Check browser console for exact error
- Verify backend URL in frontend is correct
- Test backend directly: `curl http://localhost:8000/docs`

### Port Already in Use

If port 8000 is already in use:

```bash
# Find what's using the port (Linux/Mac)
lsof -i :8000
# Or (Linux)
netstat -tulpn | grep :8000

# Kill the process (replace PID with actual process ID)
kill -9 <PID>

# Or run backend on a different port
uvicorn backend:app --reload --port 8001
# Then update frontend/.env with VITE_API_URL=http://localhost:8001
```

### Backend Starts but Shows Database Connection Error

If the backend starts but shows database connection errors:

1. **Verify Docker container is running**:
   ```bash
   docker ps
   ```

2. **Check MySQL logs**:
   ```bash
   docker-compose logs db
   ```

3. **Test database connection manually**:
   ```bash
   docker exec bookstore_db mysql -uroot -proot -e "SHOW DATABASES;"
   ```

4. **Verify database exists**:
   ```bash
   docker exec bookstore_db mysql -uroot -proot -e "USE bookstore; SHOW TABLES;"
   ```

5. **If database doesn't exist, reinitialize**:
   ```bash
   docker-compose down -v  # WARNING: Deletes all data
   docker-compose up -d
   # Wait 10-15 seconds for MySQL to initialize
   ```

### Frontend Shows CORS Error

If you see CORS errors in the browser console:

1. Check that the frontend URL is in the backend CORS origins list (see `backend.py` lines 11-19)
2. Vite defaults to port 5173, which should already be allowed
3. If using a different port, add it to the `origins` list in `backend.py`

## 📚 API Documentation

Once the backend is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🗂️ Project Structure

```
Library-Management-System/
├── backend.py              # FastAPI backend server
├── init.sql                # Database schema and sample data
├── docker-compose.yml      # MySQL database configuration
├── test.py                 # Database connection test
├── venv/                   # Python virtual environment
└── frontend/               # React frontend application
    ├── src/
    │   ├── context/        # Authentication context
    │   ├── pages/          # React page components
    │   ├── App.jsx         # Main app component
    │   └── styles.css      # Global styles
    ├── package.json
    └── README.md
```

## 🔑 Default Credentials

After running `init.sql`, you can use these sample accounts:

- **Admin User**: Check the `init.sql` file for admin credentials
- **Customer User**: Create an account via the Sign Up page

## 📝 Development

### Running in Development Mode

**Backend** (with auto-reload):
```bash
uvicorn backend:app --reload --port 8000
```

**Frontend** (with hot reload):
```bash
cd frontend
npm run dev
```

### Building for Production

**Frontend**:
```bash
cd frontend
npm run build
```

The built files will be in `frontend/dist/`.

## 🛑 Stopping Services

```bash
# Stop backend: Ctrl+C in the terminal running uvicorn

# Stop frontend: Ctrl+C in the terminal running npm run dev

# Stop database (keeps data)
docker-compose stop

# OR Stop and remove containers (keeps data in volume)
docker-compose down

# To completely remove database AND data (WARNING: deletes all data)
docker-compose down -v
```

**Important**: 
- Use `docker-compose stop` to stop containers while preserving data
- Use `docker-compose down` to stop and remove containers, but data is preserved in the volume
- Only use `docker-compose down -v` if you want to delete all data and start fresh

## 📖 Features

- ✅ User authentication (Login/Signup)
- ✅ Book search by title, category, ISBN
- ✅ Shopping cart management
- ✅ Order checkout and processing
- ✅ User profile management
- ✅ Order history
- ✅ Admin reports and analytics

## 🔐 Security Notes

- Database passwords are stored in plain text for demo purposes
- In production, use environment variables for sensitive data
- Implement proper password hashing (bcrypt, etc.)
- Use HTTPS in production
- Implement proper session management with JWT tokens

## ✅ Setup Checklist

Use this checklist to ensure everything is set up correctly:

- [ ] Docker is installed and running
- [ ] Database container is running: `docker ps | grep bookstore_db`
- [ ] Database is accessible: `docker exec bookstore_db mysql -uroot -proot -e "USE bookstore;"`
- [ ] Python virtual environment is activated
- [ ] Backend dependencies installed: `pip list | grep fastapi`
- [ ] Backend server is running: `curl http://localhost:8000/docs` returns HTML
- [ ] Frontend dependencies installed: `cd frontend && npm list react`
- [ ] Frontend server is running: Browser can access `http://localhost:5173`
- [ ] No errors in browser console (F12 → Console tab)
- [ ] No errors in backend terminal output

## 🔗 Useful URLs

When everything is running:

- **Frontend**: http://localhost:5173
- **Backend API Docs (Swagger)**: http://localhost:8000/docs
- **Backend API Docs (ReDoc)**: http://localhost:8000/redoc
- **Backend Health Check**: http://localhost:8000/docs (should load)

## 📄 License

This project is for educational purposes.
