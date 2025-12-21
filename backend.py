import mysql.connector
from fastapi import FastAPI

app = FastAPI()

# Database Connection Settings
db_config = {
    "host": "127.0.0.1", 
    "user": "root",
    "password": "root",
    "database": "bookstore",
    "port": 3306 
}

def get_db_connection():
    return mysql.connector.connect(**db_config)

@app.get("/books")
def get_books():
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT * FROM Book")
        results = cursor.fetchall()
        cursor.close()
        return results
    except Exception as e:
        return {"error": "Could not fetch books", "details": str(e)}
    finally:
        if conn and conn.is_connected():
            conn.close()