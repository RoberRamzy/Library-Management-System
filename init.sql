CREATE DATABASE IF NOT EXISTS bookstore;
USE bookstore;

-- Table: user (handles both Admin and Customer via Role)
CREATE TABLE `user` (
  `userID` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(50) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `first_name` VARCHAR(100) NOT NULL,
  `last_name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `phone` VARCHAR(20),
  `address` VARCHAR(255),
  `Role` ENUM('Admin', 'Customer') NOT NULL,
  -- Define constraints at the bottom for clarity
  CONSTRAINT UNIQUE_username UNIQUE (username),
  CONSTRAINT UNIQUE_email UNIQUE (email)
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
SET FOREIGN_KEY_CHECKS = 0;

-- 1. CLEANUP (Ensures no duplicate primary keys)
TRUNCATE TABLE Book_Author;
TRUNCATE TABLE Customer_Order_Item;
TRUNCATE TABLE Customer_Order;
TRUNCATE TABLE Cart_Item;
TRUNCATE TABLE Shopping_Cart;
TRUNCATE TABLE Book;
TRUNCATE TABLE Author;
TRUNCATE TABLE Publisher;
TRUNCATE TABLE user;

-- 2. PUBLISHERS
INSERT INTO Publisher (PubID, name, phone, address) VALUES
(1, 'Penguin Books', '123-456-7890', '123 Publisher St, NY'),
(2, 'HarperCollins', '987-654-3210', '456 Book Ave, CA'),
(3, 'MIT Press', '555-010-9999', 'Cambridge, MA'),
(4, 'Springer Nature', '555-020-8888', 'Berlin, Germany'),
(5, 'Dover Publications', '555-030-7777', 'Mineola, NY');

-- 3. AUTHORS
INSERT INTO Author (authorID, author_name) VALUES
(1, 'Franz Kafka'),
(2, 'Fyodor Dostoevsky'),
(3, 'Gilbert Strang'),
(4, 'Richard Feynman'),
(5, 'Bjarne Stroustrup'),
(6, 'Herbert Goldstein'),
(7, 'Yunus Cengel'),
(8, 'Benjamin C. Kuo'),
(9, 'J.K. Rowling');

-- 4. BOOKS (Aligned with your ENUM: Science, Art, Religion, History, Geography)
INSERT INTO Book (ISBN, Title, pubYear, Price, StockQuantity, threshold, category, PubID) VALUES
-- Dostoevsky & Kafka (Art)
('978-01', 'The Metamorphosis', 1915, 12.50, 40, 10, 'Art', 1),
('978-02', 'Crime and Punishment', 1866, 15.99, 35, 5, 'Art', 1),
('978-03', 'The Brothers Karamazov', 1880, 18.00, 20, 5, 'Art', 5),
('978-04', 'Notes from Underground', 1864, 10.50, 25, 5, 'Art', 1),
('978-05', 'The Gambler', 1866, 11.00, 30, 5, 'Art', 1),
('978-HP1', 'HP and the Sorcerers Stone', 1997, 10.99, 100, 20, 'History', 1),
('978-HP2', 'HP and the Chamber of Secrets', 1998, 12.99, 100, 20, 'History', 2),
('978-HP3', 'HP and the Prisoner of Azkaban', 1999, 12.99, 80, 20, 'History', 2),
-- Engineering (Science)
('978-E1', 'Linear Algebra', 2016, 85.00, 60, 15, 'Science', 3),
('978-E2', 'Six Easy Pieces', 1994, 14.50, 100, 20, 'Science', 2),
('978-E3', 'Thermodynamics', 2014, 120.00, 25, 5, 'Science', 4),
('978-E4', 'Automatic Control Systems', 2009, 110.00, 15, 5, 'Science', 4);

-- 5. BOOK_AUTHOR LINKS
INSERT INTO Book_Author (ISBN, authorID) VALUES
('978-01', 1), ('978-02', 2), ('978-03', 2), ('978-04', 2), ('978-05', 2),
('978-HP1', 9), ('978-HP2', 9), ('978-HP3', 9),
('978-E1', 3), ('978-E2', 4), ('978-E3', 7), ('978-E4', 8);

-- 6. USERS
INSERT INTO `user` (userID, username, password, first_name, last_name, email, phone, address, Role) VALUES
(1, 'admin1', 'adminpass', 'Admin', 'One', 'admin@example.com', '111-222-3333', 'Alexandria', 'Admin'),
(2, 'eng_student', 'pass123', 'Omar', 'Kamal', 'omar@alexu.edu.eg', '010-1234', 'Alexandria', 'Customer'),
(3, 'lit_fan', 'pass123', 'Sarah', 'Smith', 'sarah@example.com', '444-555', 'London', 'Customer');

-- 7. SHOPPING CARTS
INSERT INTO Shopping_Cart (cartID, userID) VALUES (1, 2), (2, 3);

-- 8. CUSTOMER ORDERS (Staggered dates for your reports)
INSERT INTO Customer_Order (orderID, orderDate, totalPrice, status, card_number, card_expiry, userID) VALUES
(1, '2025-11-15', 205.00, 'Completed', '4111222233334444', '2028-12-01', 2),
(2, '2025-12-10', 45.98, 'Completed', '5555666677778888', '2027-06-01', 3),
(3, '2025-12-20', 120.00, 'Completed', '4111222233334444', '2028-12-01', 2);

-- 9. ORDER ITEMS
INSERT INTO Customer_Order_Item (orderID, ISBN, Quantity, Price_at_purchase) VALUES
(1, '978-E3', 1, 120.00), (1, '978-E1', 1, 85.00),
(2, '978-01', 1, 12.50), (2, '978-HP1', 3, 10.99),
(3, '978-E3', 1, 120.00);
SET FOREIGN_KEY_CHECKS = 1;