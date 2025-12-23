import mysql.connector
from fastapi import FastAPI

app = FastAPI()

@app.get("/")
def read_root():
    try:
        conn = mysql.connector.connect(
            host="127.0.0.1",
            user="root",
            password="root",
            database="bookstore",
            port=3306,
            auth_plugin="mysql_native_password"
        )
        return {"status": "Connected to MySQL!", "version": conn.get_server_info()}
    except Exception as e:
        return {"status": "Error", "message": str(e)}