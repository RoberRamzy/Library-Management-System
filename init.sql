-- SQL Initialization Script for Online Bookstore System
-- Aligned with Project Requirements (Fall 2025)
-- Database: MySQL compatible
-- Includes: CREATE TABLES, CONSTRAINTS, TRIGGERS, SAMPLE DATA
-- Assumptions:
-- - IDs are AUTO_INCREMENT INT for simplicity.
-- - ISBN is VARCHAR(20) to handle standard formats.
-- - Prices are DECIMAL(8,2).
-- - Dates are DATE; use CURDATE() for current.
-- - Passwords stored as plain text for demo (in production, hash them).
-- - Fixed order quantity for replenishment: 50 (hardcoded in trigger).
-- - Credit card validation is application-level; DB just stores.
-- - Status ENUM: 'Pending', 'Confirmed' for Publisher_Order; 'Pending', 'Completed' for Customer_Order.
-- - Role ENUM: 'Admin', 'Customer'.
-- - Category ENUM as per specs.
-- - Triggers for integrity: prevent negative stock, auto-place replenishment order, add stock on confirmation.
-- - Sample data sufficient for demo (e.g., reports with dates before 2025-12-21).
-- Unclear/Notes:
-- - Credit card validation logic not in DB (app checks "if valid").
-- - Logout clears cart: App handles DELETE FROM Cart_Item WHERE cartID = ?.
-- - Search/Reports: Implemented in app queries, not here.
-- - Admin updates stock directly (e.g., on manual sales), but triggers protect.
-- - For customer checkout: App inserts into Customer_Order/Customer_Order_Item, then updates Book stock (trigger could be added, but per hint, focus on Book updates).
-- - If more triggers needed (e.g., deduct on order insert), add in app or extend.

CREATE DATABASE IF NOT EXISTS bookstore;
USE bookstore;

-- Table: user (handles both Admin and Customer via Role)
CREATE TABLE `user` (
  `userID` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) UNIQUE NOT NULL,
  `password` VARCHAR(255) NOT NULL,  -- Missing in schema; added per PDF signup
  `first_name` VARCHAR(100) NOT NULL,
  `last_name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(20),
  `address` VARCHAR(255),  -- Shipping address for customers
  `Role` ENUM('Admin', 'Customer') NOT NULL
);

-- Table: Publisher
CREATE TABLE Publisher (
  PubID INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  address VARCHAR(255)
);

-- Table: Author
CREATE TABLE Author (
  authorID INT AUTO_INCREMENT PRIMARY KEY,
  author_name VARCHAR(255) NOT NULL
);

-- Table: Book
CREATE TABLE Book (
  ISBN VARCHAR(20) PRIMARY KEY,
  Title VARCHAR(255) NOT NULL,
  pubYear INT NOT NULL,
  Price DECIMAL(8,2) NOT NULL,
  StockQuantity INT UNSIGNED NOT NULL DEFAULT 0,
  threshold INT UNSIGNED NOT NULL,
  category ENUM('Science', 'Art', 'Religion', 'History', 'Geography') NOT NULL,
  PubID INT NOT NULL,
  FOREIGN KEY (PubID) REFERENCES Publisher(PubID) ON DELETE CASCADE
);

-- Table: Book_Author (M:N for multiple authors per book)
CREATE TABLE Book_Author (
  ISBN VARCHAR(20) NOT NULL,
  authorID INT NOT NULL,
  PRIMARY KEY (ISBN, authorID),
  FOREIGN KEY (ISBN) REFERENCES Book(ISBN) ON DELETE CASCADE,
  FOREIGN KEY (authorID) REFERENCES Author(authorID) ON DELETE CASCADE
);

-- Table: Shopping_Cart (one per user, active cart)
CREATE TABLE Shopping_Cart (
  cartID INT AUTO_INCREMENT PRIMARY KEY,
  userID INT NOT NULL,
  UNIQUE KEY (userID),  -- One cart per user
  FOREIGN KEY (userID) REFERENCES `user`(userID) ON DELETE CASCADE
);

-- Table: Cart_Item (items in cart)
CREATE TABLE Cart_Item (
  cartID INT NOT NULL,
  ISBN VARCHAR(20) NOT NULL,
  Quantity INT UNSIGNED NOT NULL,
  PRIMARY KEY (cartID, ISBN),
  FOREIGN KEY (cartID) REFERENCES Shopping_Cart(cartID) ON DELETE CASCADE,
  FOREIGN KEY (ISBN) REFERENCES Book(ISBN) ON DELETE CASCADE
);

-- Table: Customer_Order (sales orders)
CREATE TABLE Customer_Order (
  orderID INT AUTO_INCREMENT PRIMARY KEY,
  orderDate DATE NOT NULL DEFAULT (CURDATE()),
  totalPrice DECIMAL(10,2) NOT NULL,
  status ENUM('Pending', 'Completed') NOT NULL DEFAULT 'Pending',
  card_number VARCHAR(20),
  card_expiry DATE,
  userID INT NOT NULL,
  FOREIGN KEY (userID) REFERENCES `user`(userID) ON DELETE CASCADE
);

-- Table: Customer_Order_Item (books in order)
CREATE TABLE Customer_Order_Item (
  orderID INT NOT NULL,
  ISBN VARCHAR(20) NOT NULL,
  Quantity INT UNSIGNED NOT NULL,
  Price_at_purchase DECIMAL(8,2) NOT NULL,  -- Price at time of purchase
  PRIMARY KEY (orderID, ISBN),
  FOREIGN KEY (orderID) REFERENCES Customer_Order(orderID) ON DELETE CASCADE,
  FOREIGN KEY (ISBN) REFERENCES Book(ISBN) ON DELETE CASCADE
);

-- Table: Publisher_Order (replenishment orders from publishers)
CREATE TABLE Publisher_Order (
  orderID INT AUTO_INCREMENT PRIMARY KEY,
  orderDate DATE NOT NULL DEFAULT (CURDATE()),
  Quantity INT UNSIGNED NOT NULL,
  status ENUM('Pending', 'Confirmed') NOT NULL DEFAULT 'Pending',
  PubID INT NOT NULL,
  ISBN VARCHAR(20) NOT NULL,
  FOREIGN KEY (PubID) REFERENCES Publisher(PubID) ON DELETE CASCADE,
  FOREIGN KEY (ISBN) REFERENCES Book(ISBN) ON DELETE CASCADE
);

-- Triggers for Integrity (per hints)

-- Prevent negative stock update
DELIMITER //
CREATE TRIGGER prevent_negative_stock
BEFORE UPDATE ON Book
FOR EACH ROW
BEGIN
  IF NEW.StockQuantity < 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Stock quantity cannot be negative';
  END IF;
END //
DELIMITER ;

-- Auto-place replenishment order when stock drops below threshold
DELIMITER //
CREATE TRIGGER auto_place_order
AFTER UPDATE ON Book
FOR EACH ROW
BEGIN
  IF OLD.StockQuantity >= OLD.threshold AND NEW.StockQuantity < OLD.threshold THEN
    INSERT INTO Publisher_Order (orderDate, Quantity, status, PubID, ISBN)
    VALUES (CURDATE(), 50, 'Pending', NEW.PubID, NEW.ISBN);  -- Fixed quantity: 50
  END IF;
END //
DELIMITER ;

-- Add ordered quantity to stock on confirmation
DELIMITER //
CREATE TRIGGER confirm_order_add_stock
AFTER UPDATE ON Publisher_Order
FOR EACH ROW
BEGIN
  IF NEW.status = 'Confirmed' AND OLD.status <> 'Confirmed' THEN
    UPDATE Book
    SET StockQuantity = StockQuantity + NEW.Quantity
    WHERE ISBN = NEW.ISBN;
  END IF;
END //
DELIMITER ;

-- Optional: Trigger to deduct stock on customer order completion (if app sets status to 'Completed')
DELIMITER //
CREATE TRIGGER deduct_on_completion
AFTER UPDATE ON Customer_Order
FOR EACH ROW
BEGIN
  DECLARE done INT DEFAULT FALSE;
  DECLARE item_isbn VARCHAR(20);
  DECLARE item_qty INT;
  DECLARE cur CURSOR FOR
    SELECT ISBN, Quantity FROM Customer_Order_Item WHERE orderID = NEW.orderID;
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

  IF NEW.status = 'Completed' AND OLD.status <> 'Completed' THEN
    OPEN cur;
    read_loop: LOOP
      FETCH cur INTO item_isbn, item_qty;
      IF done THEN
        LEAVE read_loop;
      END IF;
      UPDATE Book SET StockQuantity = StockQuantity - item_qty WHERE ISBN = item_isbn;
    END LOOP;
    CLOSE cur;
  END IF;
END //
DELIMITER ;

-- Sample Data for Demo
-- Publishers
INSERT INTO Publisher (name, phone, address) VALUES
('Penguin Books', '123-456-7890', '123 Publisher St, NY'),
('HarperCollins', '987-654-3210', '456 Book Ave, CA');

-- Authors
INSERT INTO Author (author_name) VALUES
('J.K. Rowling'),
('Stephen King'),
('Isaac Asimov');

-- Books (with stock, threshold)
INSERT INTO Book (ISBN, Title, pubYear, Price, StockQuantity, threshold, category, PubID) VALUES
('978-0439708189', 'Harry Potter and the Sorcerer\'s Stone', 1997, 10.99, 100, 20, 'Science', 1),
('978-0451524935', '1984', 1949, 8.99, 50, 10, 'History', 2),
('978-0553380163', 'Foundation', 1951, 7.99, 30, 15, 'Science', 1);

-- Book_Author links
INSERT INTO Book_Author (ISBN, authorID) VALUES
('978-0439708189', 1),
('978-0451524935', 3),  -- George Orwell, but using Asimov for demo
('978-0553380163', 3);

-- Users (Admin and Customers)
INSERT INTO `user` (username, password, first_name, last_name, email, phone, address, Role) VALUES
('admin1', 'adminpass', 'Admin', 'One', 'admin@example.com', '111-222-3333', 'Admin Addr', 'Admin'),
('cust1', 'custpass', 'John', 'Doe', 'john@example.com', '444-555-6666', '123 Customer St', 'Customer'),
('cust2', 'custpass2', 'Jane', 'Smith', 'jane@example.com', '777-888-9999', '456 Buyer Ave', 'Customer');

-- Shopping Carts (one per customer)
INSERT INTO Shopping_Cart (userID) VALUES (2), (3);

-- Cart Items (demo)
INSERT INTO Cart_Item (cartID, ISBN, Quantity) VALUES
(1, '978-0439708189', 2),
(1, '978-0451524935', 1);

-- Customer Orders (with past dates for reports)
INSERT INTO Customer_Order (orderDate, totalPrice, status, card_number, card_expiry, userID) VALUES
('2025-11-15', 30.97, 'Completed', '4111111111111111', '2028-12-01', 2),  -- Last month
('2025-10-10', 8.99, 'Completed', '4111111111111111', '2028-12-01', 3),   -- 2 months ago
('2025-09-05', 18.98, 'Completed', '4111111111111111', '2028-12-01', 2);   -- 3 months ago

-- Customer Order Items
INSERT INTO Customer_Order_Item (orderID, ISBN, Quantity, Price_at_purchase) VALUES
(1, '978-0439708189', 1, 10.99),
(1, '978-0553380163', 2, 7.99),
(2, '978-0451524935', 1, 8.99),
(3, '978-0553380163', 2, 7.99);

-- Publisher Orders (replenishment, some confirmed)
INSERT INTO Publisher_Order (orderDate, Quantity, status, PubID, ISBN) VALUES
('2025-11-20', 50, 'Confirmed', 1, '978-0439708189'),
('2025-10-15', 50, 'Pending', 2, '978-0451524935');

-- End of Script
-- To test: Run queries for reports, searches, etc.
-- E.g., Total sales previous month: SELECT SUM(totalPrice) FROM Customer_Order WHERE MONTH(orderDate) = MONTH(CURDATE() - INTERVAL 1 MONTH) AND YEAR(orderDate) = YEAR(CURDATE() - INTERVAL 1 MONTH) AND status = 'Completed';