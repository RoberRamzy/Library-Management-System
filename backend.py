from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import List, Optional
import mysql.connector
from datetime import date, datetime

app = FastAPI(title="Bookstore System - Alexandria University")

# Allow CORS for local frontend development (adjust origins for production)
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Database Connection ---
db_config = {
    "host": "127.0.0.1",
    "user": "root",
    "password": "root",
    "database": "bookstore",
    "port": 3306,
    "auth_plugin": "mysql_native_password"  # Use native password authentication
}

def get_db():
    try:
        conn = mysql.connector.connect(**db_config)
    except mysql.connector.Error as e:
        raise HTTPException(status_code=503, detail=f"Database connection error: {e}")
    try:
        yield conn
    finally:
        conn.close()

# --- Pydantic Schemas ---
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
    authorIDs: List[int] = []  # List of author IDs

class BookUpdate(BaseModel):
    Title: Optional[str] = None
    pubYear: Optional[int] = None
    Price: Optional[float] = None
    StockQuantity: Optional[int] = None
    threshold: Optional[int] = None
    category: Optional[str] = None
    PubID: Optional[int] = None
    authorIDs: Optional[List[int]] = None  # Update authors if provided

class PublisherOrderCreate(BaseModel):
    ISBN: str
    PubID: int
    Quantity: int

class AuthorCreate(BaseModel):
    author_name: str

class CartItemIn(BaseModel):
    ISBN: str
    Quantity: int

class CheckoutIn(BaseModel):
    userID: int
    card_number: str
    card_expiry: str  # Format YYYY-MM-DD

# ==========================================
# 1. USER MANAGEMENT & AUTH
# ==========================================

@app.post("/customer/signup")
def signup(data: CustomerSignup, conn=Depends(get_db)):
    """
    New customers can sign up by providing necessary info.
    [cite_start]REQ: [cite: 65]
    """
    cursor = conn.cursor()
    try:
        # Insert user with 'Customer' role
        query = """INSERT INTO user (username, password, first_name, last_name, email, phone, address, Role) 
                   VALUES (%s, %s, %s, %s, %s, %s, %s, 'Customer')"""
        cursor.execute(query, (data.username, data.password, data.first_name, 
                               data.last_name, data.email, data.phone, data.address))
        
        user_id = cursor.lastrowid
        
        # Initialize a Shopping Cart for the new user immediately
        # [cite_start]REQ: [cite: 70]
        cursor.execute("INSERT INTO Shopping_Cart (userID) VALUES (%s)", (user_id,))
        
        conn.commit()
        return {"message": "Account created successfully", "userID": user_id}
    except mysql.connector.Error as err:
        conn.rollback()
        raise HTTPException(status_code=400, detail=f"Signup failed: {err}")

@app.post("/login")
def login(data: UserLogin, conn=Depends(get_db)):
    """
    Only previously registered users can log in.
    [cite_start]REQ: [cite: 64]
    """
    cursor = conn.cursor(dictionary=True)
    query = "SELECT userID, username, Role FROM user WHERE username = %s AND password = %s"
    cursor.execute(query, (data.username, data.password))
    user = cursor.fetchone()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    return {"status": "Logged in", "user": user}

@app.put("/customer/profile/{userID}")
def update_profile(userID: int, data: ProfileUpdate, conn=Depends(get_db)):
    """
    A registered customer can edit personal info including password.
    [cite_start]REQ: [cite: 67]
    """
    cursor = conn.cursor()
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

@app.post("/customer/logout/{userID}")
def logout(userID: int, conn=Depends(get_db)):
    """
    Logout of the system.
    [cite_start]REQ: Doing this will remove all the items in the current cart. [cite: 86, 87]
    """
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT cartID FROM Shopping_Cart WHERE userID = %s", (userID,))
        cart = cursor.fetchone()
        if cart:
            cursor.execute("DELETE FROM Cart_Item WHERE cartID = %s", (cart[0],))
            conn.commit()
        return {"message": "Logged out and cart cleared"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# ==========================================
# 2. BOOK OPERATIONS (SEARCH & ADMIN)
# ==========================================

@app.get("/books/search")
def search_books(title: Optional[str] = None, category: Optional[str] = None, isbn: Optional[str] = None, author: Optional[str] = None, userID: Optional[int] = None, conn=Depends(get_db)):
    """
    Search for books by ISBN, title, category, author, or publisher.
    If userID is provided, returns available stock (actual stock minus items in user's cart).
    """
    cursor = conn.cursor(dictionary=True)
    query = """
        SELECT DISTINCT b.* 
        FROM Book b
        LEFT JOIN Book_Author ba ON b.ISBN = ba.ISBN
        LEFT JOIN Author a ON ba.authorID = a.authorID
        WHERE 1=1
    """
    params = []
    if title:
        query += " AND b.Title LIKE %s"
        params.append(f"%{title}%")
    if category:
        query += " AND b.category = %s"
        params.append(category)
    if isbn:
        query += " AND b.ISBN = %s"
        params.append(isbn)
    if author:
        query += " AND a.author_name LIKE %s"
        params.append(f"%{author}%")
    
    cursor.execute(query, tuple(params))
    books = cursor.fetchall()
    
    # Get authors for each book
    for book in books:
        cursor.execute("""
            SELECT a.authorID, a.author_name 
            FROM Book_Author ba
            JOIN Author a ON ba.authorID = a.authorID
            WHERE ba.ISBN = %s
        """, (book['ISBN'],))
        authors = cursor.fetchall()
        book['authors'] = authors
    
    # If userID provided, calculate available stock (stock - items in user's cart)
    if userID:
        for book in books:
            cursor.execute("""
                SELECT ci.Quantity 
                FROM Cart_Item ci
                JOIN Shopping_Cart sc ON ci.cartID = sc.cartID
                WHERE sc.userID = %s AND ci.ISBN = %s
            """, (userID, book['ISBN']))
            cart_item = cursor.fetchone()
            if cart_item:
                book['AvailableStock'] = max(0, book['StockQuantity'] - cart_item['Quantity'])
            else:
                book['AvailableStock'] = book['StockQuantity']
    
    return books

@app.post("/admin/books")
def add_book(book: BookCreate, conn=Depends(get_db)):
    """
    Add a new book (Admin Only).
    Validates all properties including threshold and authors.
    """
    cursor = conn.cursor()
    try:
        # Validate category
        valid_categories = ['Science', 'Art', 'Religion', 'History', 'Geography']
        if book.category not in valid_categories:
            raise HTTPException(status_code=400, detail=f"Invalid category. Must be one of: {', '.join(valid_categories)}")
        
        # Validate PubID exists
        cursor.execute("SELECT PubID FROM Publisher WHERE PubID = %s", (book.PubID,))
        if not cursor.fetchone():
            raise HTTPException(status_code=400, detail="Publisher ID not found")
        
        # Validate authors exist
        if book.authorIDs:
            placeholders = ','.join(['%s'] * len(book.authorIDs))
            cursor.execute(f"SELECT authorID FROM Author WHERE authorID IN ({placeholders})", tuple(book.authorIDs))
            found_authors = cursor.fetchall()
            if len(found_authors) != len(book.authorIDs):
                raise HTTPException(status_code=400, detail="One or more author IDs not found")
        
        # Validate non-negative values
        if book.Price < 0:
            raise HTTPException(status_code=400, detail="Price cannot be negative")
        if book.StockQuantity < 0:
            raise HTTPException(status_code=400, detail="Stock quantity cannot be negative")
        if book.threshold < 0:
            raise HTTPException(status_code=400, detail="Threshold cannot be negative")
        
        # Insert book
        query = """INSERT INTO Book (ISBN, Title, pubYear, Price, StockQuantity, threshold, category, PubID) 
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s)"""
        cursor.execute(query, (book.ISBN, book.Title, book.pubYear, book.Price, 
                               book.StockQuantity, book.threshold, book.category, book.PubID))
        
        # Insert authors
        if book.authorIDs:
            for author_id in book.authorIDs:
                cursor.execute("INSERT INTO Book_Author (ISBN, authorID) VALUES (%s, %s)", 
                             (book.ISBN, author_id))
        
        conn.commit()
        return {"message": "Book added successfully"}
    except HTTPException:
        conn.rollback()
        raise
    except mysql.connector.Error as err:
        conn.rollback()
        raise HTTPException(status_code=400, detail=f"Book creation failed: {str(err)}")

@app.get("/admin/books/{isbn}")
def get_book(isbn: str, conn=Depends(get_db)):
    """
    Get book details by ISBN (Admin Only).
    Includes authors, publisher info.
    """
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM Book WHERE ISBN = %s", (isbn,))
    book = cursor.fetchone()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    # Get authors
    cursor.execute("""
        SELECT a.authorID, a.author_name 
        FROM Book_Author ba
        JOIN Author a ON ba.authorID = a.authorID
        WHERE ba.ISBN = %s
    """, (isbn,))
    book['authors'] = cursor.fetchall()
    
    # Get publisher info
    cursor.execute("SELECT name, phone, address FROM Publisher WHERE PubID = %s", (book['PubID'],))
    publisher = cursor.fetchone()
    if publisher:
        book['publisher'] = publisher
    
    return book

@app.get("/books/{isbn}")
def get_book_details(isbn: str, conn=Depends(get_db)):
    """
    Get book details by ISBN (Public).
    Includes authors, publisher info.
    """
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM Book WHERE ISBN = %s", (isbn,))
    book = cursor.fetchone()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    # Get authors
    cursor.execute("""
        SELECT a.authorID, a.author_name 
        FROM Book_Author ba
        JOIN Author a ON ba.authorID = a.authorID
        WHERE ba.ISBN = %s
    """, (isbn,))
    book['authors'] = cursor.fetchall()
    
    # Get publisher info
    cursor.execute("SELECT name, phone, address FROM Publisher WHERE PubID = %s", (book['PubID'],))
    publisher = cursor.fetchone()
    if publisher:
        book['publisher'] = publisher
    
    return book

@app.put("/admin/books/{isbn}")
def update_book(isbn: str, book_update: BookUpdate, conn=Depends(get_db)):
    """
    Update an existing book (Admin Only).
    Can update title, price, stock quantity, threshold, category, publisher.
    Stock quantity cannot be negative (enforced by trigger).
    """
    cursor = conn.cursor()
    try:
        # Check if book exists
        cursor.execute("SELECT StockQuantity FROM Book WHERE ISBN = %s", (isbn,))
        existing = cursor.fetchone()
        if not existing:
            raise HTTPException(status_code=404, detail="Book not found")
        
        # Build update query dynamically
        updates = []
        params = []
        
        update_fields = book_update.dict(exclude_none=True)
        if not update_fields:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        # Validate category if provided
        if 'category' in update_fields:
            valid_categories = ['Science', 'Art', 'Religion', 'History', 'Geography']
            if update_fields['category'] not in valid_categories:
                raise HTTPException(status_code=400, detail=f"Invalid category. Must be one of: {', '.join(valid_categories)}")
        
        # Validate PubID if provided
        if 'PubID' in update_fields:
            cursor.execute("SELECT PubID FROM Publisher WHERE PubID = %s", (update_fields['PubID'],))
            if not cursor.fetchone():
                raise HTTPException(status_code=400, detail="Publisher ID not found")
        
        # Validate non-negative values
        if 'Price' in update_fields and update_fields['Price'] < 0:
            raise HTTPException(status_code=400, detail="Price cannot be negative")
        if 'StockQuantity' in update_fields and update_fields['StockQuantity'] < 0:
            raise HTTPException(status_code=400, detail="Stock quantity cannot be negative (trigger will also enforce this)")
        if 'threshold' in update_fields and update_fields['threshold'] < 0:
            raise HTTPException(status_code=400, detail="Threshold cannot be negative")
        
        # Handle author updates separately
        author_ids = update_fields.pop('authorIDs', None)
        
        # Build update query
        if update_fields:
            for field, value in update_fields.items():
                updates.append(f"{field} = %s")
                params.append(value)
            
            params.append(isbn)
            query = f"UPDATE Book SET {', '.join(updates)} WHERE ISBN = %s"
            cursor.execute(query, tuple(params))
        
        # Update authors if provided
        if author_ids is not None:
            # Validate authors exist
            if author_ids:
                placeholders = ','.join(['%s'] * len(author_ids))
                cursor.execute(f"SELECT authorID FROM Author WHERE authorID IN ({placeholders})", tuple(author_ids))
                found_authors = cursor.fetchall()
                if len(found_authors) != len(author_ids):
                    raise HTTPException(status_code=400, detail="One or more author IDs not found")
            
            # Delete existing author relationships
            cursor.execute("DELETE FROM Book_Author WHERE ISBN = %s", (isbn,))
            
            # Insert new author relationships
            if author_ids:
                for author_id in author_ids:
                    cursor.execute("INSERT INTO Book_Author (ISBN, authorID) VALUES (%s, %s)", 
                                 (isbn, author_id))
        
        conn.commit()
        
        return {"message": "Book updated successfully"}
    except HTTPException:
        conn.rollback()
        raise
    except mysql.connector.Error as err:
        conn.rollback()
        # Check if error is from trigger (negative stock)
        if "negative" in str(err).lower():
            raise HTTPException(status_code=400, detail="Stock quantity cannot be negative")
        raise HTTPException(status_code=400, detail=f"Book update failed: {str(err)}")

@app.get("/admin/publishers")
def list_publishers(conn=Depends(get_db)):
    """
    List all publishers (Admin Only).
    """
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT PubID, name, phone, address FROM Publisher ORDER BY PubID")
    return cursor.fetchall()

@app.get("/admin/authors")
def list_authors(conn=Depends(get_db)):
    """
    List all authors (Admin Only).
    """
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT authorID, author_name FROM Author ORDER BY author_name")
    return cursor.fetchall()

@app.post("/admin/authors")
def create_author(author: AuthorCreate, conn=Depends(get_db)):
    """
    Create a new author (Admin Only).
    """
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO Author (author_name) VALUES (%s)", (author.author_name,))
        author_id = cursor.lastrowid
        conn.commit()
        return {"message": "Author created successfully", "authorID": author_id, "author_name": author.author_name}
    except mysql.connector.Error as err:
        conn.rollback()
        raise HTTPException(status_code=400, detail=f"Author creation failed: {str(err)}")

@app.get("/admin/publisher-orders")
def list_publisher_orders(conn=Depends(get_db)):
    """
    List all publisher orders (Admin Only).
    """
    cursor = conn.cursor(dictionary=True)
    query = """
        SELECT po.orderID, po.orderDate, po.Quantity, po.status,
               b.ISBN, b.Title, b.threshold, b.StockQuantity,
               p.PubID, p.name as publisher_name
        FROM Publisher_Order po
        JOIN Book b ON po.ISBN = b.ISBN
        JOIN Publisher p ON po.PubID = p.PubID
        ORDER BY po.orderDate DESC, po.orderID DESC
    """
    cursor.execute(query)
    return cursor.fetchall()

@app.post("/admin/publisher-orders")
def create_publisher_order(order: PublisherOrderCreate, conn=Depends(get_db)):
    """
    Manually place a publisher order (Admin Only).
    Creates an order with constant quantity (default 50) or specified quantity.
    """
    cursor = conn.cursor()
    try:
        # Validate book exists
        cursor.execute("SELECT PubID, threshold FROM Book WHERE ISBN = %s", (order.ISBN,))
        book = cursor.fetchone()
        if not book:
            raise HTTPException(status_code=404, detail="Book not found")
        
        # Validate publisher matches book's publisher
        if book[0] != order.PubID:
            raise HTTPException(status_code=400, detail="Publisher ID does not match the book's publisher")
        
        # Validate quantity
        if order.Quantity <= 0:
            raise HTTPException(status_code=400, detail="Order quantity must be positive")
        
        # Create order
        query = """INSERT INTO Publisher_Order (orderDate, Quantity, status, PubID, ISBN) 
                   VALUES (CURDATE(), %s, 'Pending', %s, %s)"""
        cursor.execute(query, (order.Quantity, order.PubID, order.ISBN))
        order_id = cursor.lastrowid
        conn.commit()
        
        return {"message": "Publisher order created successfully", "orderID": order_id}
    except HTTPException:
        conn.rollback()
        raise
    except mysql.connector.Error as err:
        conn.rollback()
        raise HTTPException(status_code=400, detail=f"Order creation failed: {str(err)}")

# ==========================================
# 3. SHOPPING CART MANAGEMENT
# ==========================================

@app.post("/cart/add")
def add_to_cart(userID: int, item: CartItemIn, conn=Depends(get_db)):
    """
    Add books to a shopping cart.
    [cite_start]REQ: [cite: 70, 71]
    Validates stock availability and returns updated stock quantity.
    """
    cursor = conn.cursor(dictionary=True)
    try:
        # Check current stock availability
        cursor.execute("SELECT StockQuantity FROM Book WHERE ISBN = %s", (item.ISBN,))
        book = cursor.fetchone()
        if not book:
            raise HTTPException(status_code=404, detail="Book not found")
        
        current_stock = book['StockQuantity']
        if current_stock < item.Quantity:
            raise HTTPException(status_code=400, detail=f"Not enough stock. Only {current_stock} available.")
        
        # Get user's cartID
        cursor.execute("SELECT cartID FROM Shopping_Cart WHERE userID = %s", (userID,))
        cart = cursor.fetchone()
        if not cart:
            raise HTTPException(status_code=404, detail="Cart not found for this user")
        cart_id = cart['cartID']

        # Check if book already in cart (Update Quantity) or New (Insert)
        cursor.execute("SELECT Quantity FROM Cart_Item WHERE cartID = %s AND ISBN = %s", (cart_id, item.ISBN))
        existing = cursor.fetchone()
        
        if existing:
            existing_qty = existing['Quantity'] if isinstance(existing, dict) else existing[0]
            new_qty = existing_qty + item.Quantity
            # Check if adding this quantity would exceed available stock
            if new_qty > current_stock:
                raise HTTPException(status_code=400, detail=f"Cannot add more items. Only {current_stock} available.")
            cursor.execute("UPDATE Cart_Item SET Quantity = %s WHERE cartID = %s AND ISBN = %s", 
                           (new_qty, cart_id, item.ISBN))
        else:
            cursor.execute("INSERT INTO Cart_Item (cartID, ISBN, Quantity) VALUES (%s, %s, %s)", 
                           (cart_id, item.ISBN, item.Quantity))
        
        # Calculate available stock after adding to cart (for UI display)
        # Available stock = actual stock - quantity now in cart
        cart_qty_after = existing['Quantity'] + item.Quantity if existing else item.Quantity
        available_stock = max(0, current_stock - cart_qty_after)
        
        conn.commit()
        return {
            "message": "Item added to cart",
            "currentStock": current_stock,  # Actual stock in database
            "availableStock": available_stock  # Available stock (actual - in cart)
        }
    except HTTPException:
        conn.rollback()
        raise
    except mysql.connector.Error as err:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(err))

@app.get("/cart/{userID}")
def view_cart(userID: int, conn=Depends(get_db)):
    """
    View items in the cart and total prices.
    [cite_start]REQ: [cite: 72, 73]
    """
    cursor = conn.cursor(dictionary=True)
    query = """
        SELECT b.Title, b.ISBN, ci.Quantity, b.Price, (ci.Quantity * b.Price) as TotalItemPrice 
        FROM Cart_Item ci
        JOIN Book b ON ci.ISBN = b.ISBN
        JOIN Shopping_Cart sc ON ci.cartID = sc.cartID
        WHERE sc.userID = %s
    """
    cursor.execute(query, (userID,))
    items = cursor.fetchall()
    
    grand_total = sum(i['TotalItemPrice'] for i in items)
    return {"items": items, "cart_total": grand_total}

@app.delete("/cart/remove")
def remove_from_cart(userID: int, isbn: str, conn=Depends(get_db)):
    """
    Remove items from the cart.
    [cite_start]REQ: [cite: 74]
    """
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT cartID FROM Shopping_Cart WHERE userID = %s", (userID,))
        cart = cursor.fetchone()
        if cart:
            cursor.execute("DELETE FROM Cart_Item WHERE cartID = %s AND ISBN = %s", (cart[0], isbn))
            conn.commit()
        return {"message": "Item removed from cart"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))

# ==========================================
# 4. ORDER PROCESSING (CHECKOUT & CONFIRMATION)
# ==========================================

@app.post("/customer/checkout")
def checkout(data: CheckoutIn, conn=Depends(get_db)):
    """
    Check out a shopping cart.
    [cite_start]REQ: Provide credit card[cite: 81].
    [cite_start]REQ: Validates, creates order, deducts stock, clears cart[cite: 82, 83, 87].
    NOTE: Stock deduction is handled by the SQL Trigger 'deduct_on_completion' which fires on UPDATE.
    """
    cursor = conn.cursor(dictionary=True)
    try:
        # 1. Get Cart Items
        cursor.execute("""
            SELECT ci.*, b.Price, b.Title, b.StockQuantity 
            FROM Cart_Item ci 
            JOIN Book b ON ci.ISBN = b.ISBN 
            JOIN Shopping_Cart sc ON ci.cartID = sc.cartID 
            WHERE sc.userID = %s
        """, (data.userID,))
        items = cursor.fetchall()
        
        if not items:
            raise HTTPException(status_code=400, detail="Cart is empty")

        # Optional: Pre-check stock (though DB trigger also prevents negative)
        for item in items:
            if item['Quantity'] > item['StockQuantity']:
                 raise HTTPException(status_code=400, detail=f"Not enough stock for {item['Title']}")

        total_price = sum(item['Quantity'] * item['Price'] for item in items)

        # 2. Insert Order as 'Pending' first (Required for Trigger Logic)
        cursor.execute("""
            INSERT INTO Customer_Order (orderDate, totalPrice, status, card_number, card_expiry, userID) 
            VALUES (CURDATE(), %s, 'Pending', %s, %s, %s)
        """, (total_price, data.card_number, data.card_expiry, data.userID))
        order_id = cursor.lastrowid

        # 3. Transfer items to Order_Item table
        for item in items:
            cursor.execute("""
                INSERT INTO Customer_Order_Item (orderID, ISBN, Quantity, Price_at_purchase) 
                VALUES (%s, %s, %s, %s)
            """, (order_id, item['ISBN'], item['Quantity'], item['Price']))

        # 4. TRIGGER EVENT: Update status to 'Completed'
        # This specific UPDATE action fires the 'deduct_on_completion' trigger in MySQL
        # [cite_start]which performs the actual stock deduction [cite: 83]
        cursor.execute("UPDATE Customer_Order SET status = 'Completed' WHERE orderID = %s", (order_id,))

        # [cite_start]5. Clear Cart (Logout or Checkout clears cart) [cite: 87]
        cursor.execute("DELETE FROM Cart_Item WHERE cartID = %s", (items[0]['cartID'],))
        
        conn.commit()
        return {"message": "Checkout successful", "orderID": order_id}
    except Exception as e:
        conn.rollback()
        # If trigger fails (e.g. negative stock), this catch block handles it
        raise HTTPException(status_code=400, detail=f"Transaction failed: {str(e)}")

@app.put("/admin/confirm-order/{orderID}")
def confirm_publisher_order(orderID: int, conn=Depends(get_db)):
    """
    Confirm a publisher order (Admin Only).
    Upon confirmation, the trigger 'confirm_order_add_stock' automatically adds the ordered quantity to the book's stock.
    """
    cursor = conn.cursor(dictionary=True)
    try:
        # Check if order exists
        cursor.execute("SELECT status, ISBN, Quantity FROM Publisher_Order WHERE orderID = %s", (orderID,))
        order = cursor.fetchone()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        if order['status'] == 'Confirmed':
            raise HTTPException(status_code=400, detail="Order is already confirmed")
        
        # Update status to Confirmed (trigger will add stock)
        cursor.execute("UPDATE Publisher_Order SET status = 'Confirmed' WHERE orderID = %s", (orderID,))
        conn.commit()
        
        return {"message": "Order confirmed. Stock updated via trigger."}
    except HTTPException:
        conn.rollback()
        raise
    except mysql.connector.Error as err:
        conn.rollback()
        raise HTTPException(status_code=400, detail=f"Order confirmation failed: {str(err)}")

@app.get("/customer/orders/{userID}")
def view_past_orders(userID: int, conn=Depends(get_db)):
    """
    View past orders in detail.
    [cite_start]REQ: [cite: 84, 85]
    """
    cursor = conn.cursor(dictionary=True)
    query = """
        SELECT co.orderID, co.orderDate, co.totalPrice, co.status,
               GROUP_CONCAT(CONCAT(b.Title, ' (x', coi.Quantity, ')') SEPARATOR ', ') as items
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

# ==========================================
# 5. SYSTEM REPORTS (ADMIN ONLY)
# ==========================================

@app.get("/admin/reports/sales-prev-month")
def report_prev_month_sales(conn=Depends(get_db)):
    """
    Report (a): The total sales for books in the previous month.
    [cite_start]REQ: [cite: 57]
    """
    cursor = conn.cursor(dictionary=True)
    query = """
        SELECT SUM(totalPrice) as TotalSalesPrevMonth 
        FROM Customer_Order 
        WHERE MONTH(orderDate) = MONTH(CURDATE() - INTERVAL 1 MONTH) 
        AND YEAR(orderDate) = YEAR(CURDATE() - INTERVAL 1 MONTH)
        AND status = 'Completed'
    """
    cursor.execute(query)
    return cursor.fetchone()

@app.get("/admin/reports/sales-daily")
def report_daily_sales(date_input: str, conn=Depends(get_db)):
    """
    Report (b): The total sales for books on a certain day.
    [cite_start]REQ: [cite: 58, 59]
    """
    cursor = conn.cursor(dictionary=True)
    query = "SELECT SUM(totalPrice) as DailyTotal FROM Customer_Order WHERE orderDate = %s AND status = 'Completed'"
    cursor.execute(query, (date_input,))
    return cursor.fetchone()

@app.get("/admin/reports/top-customers")
def report_top_customers(conn=Depends(get_db)):
    """
    Report (c): Top 5 Customers (For the Last 3 Months).
    [cite_start]REQ: [cite: 60]
    """
    cursor = conn.cursor(dictionary=True)
    query = """
        SELECT u.username, SUM(co.totalPrice) as TotalSpent 
        FROM Customer_Order co 
        JOIN user u ON co.userID = u.userID 
        WHERE co.orderDate >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
        AND co.status = 'Completed'
        GROUP BY u.userID 
        ORDER BY TotalSpent DESC 
        LIMIT 5
    """
    cursor.execute(query)
    return cursor.fetchall()

@app.get("/admin/reports/top-selling-books")
def report_top_selling_books(conn=Depends(get_db)):
    """
    Report (d): Top 10 Selling Books (For the Last 3 Months).
    [cite_start]REQ: [cite: 61]
    """
    cursor = conn.cursor(dictionary=True)
    query = """
        SELECT b.Title, SUM(coi.Quantity) as TotalCopiesSold
        FROM Customer_Order_Item coi
        JOIN Customer_Order co ON coi.orderID = co.orderID
        JOIN Book b ON coi.ISBN = b.ISBN
        WHERE co.orderDate >= DATE_SUB(CURDATE(), INTERVAL 3 MONTH)
        AND co.status = 'Completed'
        GROUP BY b.ISBN
        ORDER BY TotalCopiesSold DESC
        LIMIT 10
    """
    cursor.execute(query)
    return cursor.fetchall()

@app.get("/admin/reports/book-replenishments")
def report_book_replenishments(isbn: str, conn=Depends(get_db)):
    """
    Report (e): Total Number of Times a Specific Book Has Been Ordered (Replenishment).
    [cite_start]REQ: [cite: 62]
    """
    cursor = conn.cursor(dictionary=True)
    query = """
        SELECT b.Title, COUNT(*) as ReplenishmentOrderCount, SUM(po.Quantity) as TotalRestocked
        FROM Publisher_Order po
        JOIN Book b ON po.ISBN = b.ISBN
        WHERE po.ISBN = %s
        GROUP BY po.ISBN
    """
    cursor.execute(query, (isbn,))
    return cursor.fetchone()

# ==========================================
# 6. ADMIN USER MANAGEMENT
# ==========================================

@app.get("/admin/users")
def list_all_users(conn=Depends(get_db)):
    """
    List all users (Admin Only).
    Returns userID, username, first_name, last_name, email, Role.
    """
    cursor = conn.cursor(dictionary=True)
    query = "SELECT userID, username, first_name, last_name, email, Role FROM user ORDER BY userID"
    cursor.execute(query)
    return cursor.fetchall()

@app.put("/admin/users/{userID}/promote")
def promote_user_to_admin(userID: int, conn=Depends(get_db)):
    """
    Promote a Customer user to Admin role (Admin Only).
    """
    cursor = conn.cursor()
    try:
        # Check if user exists and is a Customer
        cursor.execute("SELECT Role FROM user WHERE userID = %s", (userID,))
        user = cursor.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        if user[0] == 'Admin':
            raise HTTPException(status_code=400, detail="User is already an Admin")
        if user[0] != 'Customer':
            raise HTTPException(status_code=400, detail="Can only promote Customer users")
        
        # Update role to Admin
        cursor.execute("UPDATE user SET Role = 'Admin' WHERE userID = %s", (userID,))
        conn.commit()
        return {"message": f"User {userID} has been promoted to Admin"}
    except mysql.connector.Error as err:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(err))