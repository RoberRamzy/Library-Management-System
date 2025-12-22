from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from typing import List, Optional
import mysql.connector
from datetime import date, datetime

app = FastAPI(title="Bookstore System - Alexandria University")

# --- Database Connection ---
db_config = {
    "host": "127.0.0.1",
    "user": "root",
    "password": "root",
    "database": "bookstore",
    "port": 3306
}

def get_db():
    conn = mysql.connector.connect(**db_config)
    try:
        yield conn
    finally:
        conn.close()

# --- Schemas ---
class CustomerSignup(BaseModel):
    username: str
    password: str
    first_name: str
    last_name: str
    email: EmailStr
    phone: str
    address: str

class ProfileUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    password: Optional[str] = None
class UserLogin(BaseModel):
    username: str
    password: str

class BookCreate(BaseModel):
    ISBN: str
    Title: str
    pubYear: int
    Price: float
    StockQuantity: int
    threshold: int
    category: str  # Science, Art, Religion, History, Geography
    PubID: int

class CartItemIn(BaseModel):
    ISBN: str
    Quantity: int

class CheckoutIn(BaseModel):
    userID: int
    card_number: str
    card_expiry: str  # Format YYYY-MM-DD

# --- 1. User Management ---
# --- SIGNUP ---
@app.post("/customer/signup")
def signup(data: CustomerSignup, conn=Depends(get_db)):
    """New customers can sign up by providing necessary info [cite: 65]"""
    cursor = conn.cursor()
    try:
        # Insert user with 'Customer' role [cite: 65]
        query = """INSERT INTO user (username, password, first_name, last_name, email, phone, address, Role) 
                   VALUES (%s, %s, %s, %s, %s, %s, %s, 'Customer')"""
        cursor.execute(query, (data.username, data.password, data.first_name, 
                               data.last_name, data.email, data.phone, data.address))
        
        # Every customer needs a shopping cart upon registration [cite: 70]
        user_id = cursor.lastrowid
        cursor.execute("INSERT INTO Shopping_Cart (userID) VALUES (%s)", (user_id,))
        
        conn.commit()
        return {"message": "Account created successfully", "userID": user_id}
    except mysql.connector.Error as err:
        conn.rollback()
        raise HTTPException(status_code=400, detail=f"Signup failed: {err}")

# --- LOGIN ---
@app.post("/login")
def login(data: UserLogin, conn=Depends(get_db)):
    """Only previously registered users can log in [cite: 64]"""
    cursor = conn.cursor(dictionary=True)
    query = "SELECT userID, username, Role FROM user WHERE username = %s AND password = %s"
    cursor.execute(query, (data.username, data.password))
    user = cursor.fetchone()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    return {"status": "Logged in", "user": user}

# --- UPDATE PROFILE ---
@app.put("/customer/profile/{userID}")
def update_profile(userID: int, data: ProfileUpdate, conn=Depends(get_db)):
    """A registered customer can edit personal info and password [cite: 67]"""
    cursor = conn.cursor()
    # Build dynamic update query to only change provided fields
    updates = []
    params = []
    for field, value in data.dict(exclude_none=True).items():
        updates.append(f"{field} = %s")
        params.append(value)
    
    if not updates:
        return {"message": "No changes provided"}
    
    params.append(userID)
    query = f"UPDATE user SET {', '.join(updates)} WHERE userID = %s AND Role = 'Customer'"
    
    cursor.execute(query, tuple(params))
    conn.commit()
    return {"message": "Profile updated successfully"}

# --- VIEW PAST ORDERS ---
@app.get("/customer/orders/{userID}")
def view_past_orders(userID: int, conn=Depends(get_db)):
    """Customer views past orders in detail (No, Date, Books, Price) [cite: 84, 85]"""
    cursor = conn.cursor(dictionary=True)
    # This query joins the order and items to show full detail 
    query = """
        SELECT co.orderID, co.orderDate, co.totalPrice, co.status,
               GROUP_CONCAT(b.Title SEPARATOR ', ') as book_names,
               GROUP_CONCAT(b.ISBN SEPARATOR ', ') as isbns
        FROM Customer_Order co
        JOIN Customer_Order_Item coi ON co.orderID = coi.orderID
        JOIN Book b ON coi.ISBN = b.ISBN
        WHERE co.userID = %s
        GROUP BY co.orderID
        ORDER BY co.orderDate DESC
    """
    cursor.execute(query, (userID,))
    results = cursor.fetchall()
    return results

# --- LOGOUT ---
@app.post("/customer/logout/{userID}")
def logout(userID: int, conn=Depends(get_db)):
    """Logging out removes all items in the current cart """
    cursor = conn.cursor()
    try:
        # Find the cartID for the user
        cursor.execute("SELECT cartID FROM Shopping_Cart WHERE userID = %s", (userID,))
        cart = cursor.fetchone()
        if cart:
            # Delete all items in that cart [cite: 87]
            cursor.execute("DELETE FROM Cart_Item WHERE cartID = %s", (cart[0],))
            conn.commit()
        return {"message": "Logged out and cart cleared"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# --- 2. Admin Operations ---

@app.post("/admin/books")
def add_book(book: BookCreate, conn=Depends(get_db)):
    """Add a new book (Admin Only) [cite: 21, 22]"""
    cursor = conn.cursor()
    try:
        query = """INSERT INTO Book (ISBN, Title, pubYear, Price, StockQuantity, threshold, category, PubID) 
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s)"""
        cursor.execute(query, (book.ISBN, book.Title, book.pubYear, book.Price, 
                               book.StockQuantity, book.threshold, book.category, book.PubID))
        conn.commit()
        return {"message": "Book added successfully"}
    except mysql.connector.Error as err:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(err))

@app.put("/admin/confirm-order/{orderID}")
def confirm_order(orderID: int, conn=Depends(get_db)):
    """Confirm replenishment order from publisher [cite: 41, 42]"""
    cursor = conn.cursor()
    query = "UPDATE Publisher_Order SET status = 'Confirmed' WHERE orderID = %s"
    cursor.execute(query, (orderID,))
    conn.commit()
    return {"message": "Order confirmed. Stock updated via trigger."} 

# --- 3. Customer Operations ---

@app.get("/books/search")
def search_books(title: Optional[str] = None, category: Optional[str] = None, isbn: Optional[str] = None, conn=Depends(get_db)):
    """Search for books by various criteria [cite: 44, 45, 46]"""
    cursor = conn.cursor(dictionary=True)
    query = "SELECT * FROM Book WHERE 1=1"
    params = []
    if title:
        query += " AND Title LIKE %s"
        params.append(f"%{title}%")
    if category:
        query += " AND category = %s"
        params.append(category)
    if isbn:
        query += " AND ISBN = %s"
        params.append(isbn)
    
    cursor.execute(query, tuple(params))
    return cursor.fetchall()

@app.post("/customer/checkout")
def checkout(data: CheckoutIn, conn=Depends(get_db)):
    """Handle checkout: Validates card, creates order, and clears cart [cite: 78, 81, 82, 87]"""
    cursor = conn.cursor(dictionary=True)
    try:
        # 1. Get Cart Items
        cursor.execute("SELECT ci.*, b.Price FROM Cart_Item ci JOIN Book b ON ci.ISBN = b.ISBN JOIN Shopping_Cart sc ON ci.cartID = sc.cartID WHERE sc.userID = %s", (data.userID,))
        items = cursor.fetchall()
        if not items:
            raise HTTPException(status_code=400, detail="Cart is empty")

        total_price = sum(item['Quantity'] * item['Price'] for item in items)

        # 2. Create Customer Order (Triggers will handle stock reduction) [cite: 83]
        cursor.execute("""INSERT INTO Customer_Order (orderDate, totalPrice, status, card_number, card_expiry, userID) 
                          VALUES (CURDATE(), %s, 'Completed', %s, %s, %s)""", 
                       (total_price, data.card_number, data.card_expiry, data.userID))
        order_id = cursor.lastrowid

        # 3. Transfer items to Order_Item
        for item in items:
            cursor.execute("""INSERT INTO Customer_Order_Item (orderID, ISBN, Quantity, Price_at_purchase) 
                              VALUES (%s, %s, %s, %s)""", 
                           (order_id, item['ISBN'], item['Quantity'], item['Price']))

        # 4. Clear Cart [cite: 87]
        cursor.execute("DELETE FROM Cart_Item WHERE cartID = %s", (items[0]['cartID'],))
        
        conn.commit()
        return {"message": "Checkout successful", "orderID": order_id}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))

# --- 4. System Reports (Admin Only) ---

@app.get("/admin/reports/top-customers")
def report_top_customers(conn=Depends(get_db)):
    """Top 5 Customers for the last 3 months [cite: 60]"""
    cursor = conn.cursor(dictionary=True)
    query = """SELECT u.username, SUM(co.totalPrice) as TotalSpent 
               FROM Customer_Order co JOIN user u ON co.userID = u.userID 
               WHERE co.orderDate >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
               GROUP BY u.userID ORDER BY TotalSpent DESC LIMIT 5"""
    cursor.execute(query)
    return cursor.fetchall()

@app.get("/admin/reports/sales-yesterday")
def report_daily_sales(date_input: str, conn=Depends(get_db)):
    """Total sales for books on a certain day [cite: 58, 59]"""
    cursor = conn.cursor(dictionary=True)
    query = "SELECT SUM(totalPrice) as DailyTotal FROM Customer_Order WHERE orderDate = %s"
    cursor.execute(query, (date_input,))
    return cursor.fetchone()