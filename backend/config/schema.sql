CREATE DATABASE IF NOT EXISTS chicken_shop;
USE chicken_shop;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  role ENUM('ADMIN','SALESPERSON') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE customers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL UNIQUE,
  email VARCHAR(120) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE chicken_prices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  price DECIMAL(10,2) NOT NULL CHECK (price > 0),
  effective_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- Single-row table (id = 1)
CREATE TABLE stock (
  id TINYINT PRIMARY KEY DEFAULT 1,
  current_stock DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
  low_stock_threshold DECIMAL(10,2) NOT NULL DEFAULT 10,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
INSERT INTO stock (id, current_stock, low_stock_threshold) VALUES (1, 0, 10);

CREATE TABLE coupons (
  id INT AUTO_INCREMENT PRIMARY KEY,
  coupon_code VARCHAR(30) NOT NULL UNIQUE,
  customer_id INT NOT NULL,
  discount_amount DECIMAL(10,2) NOT NULL CHECK (discount_amount > 0),
  status ENUM('ACTIVE','USED','EXPIRED') NOT NULL DEFAULT 'ACTIVE',
  expiry_date DATE NOT NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  used_at DATETIME NULL,
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_coupon_customer (customer_id),
  INDEX idx_coupon_status (status)
);

CREATE TABLE sales (
  id INT AUTO_INCREMENT PRIMARY KEY,
  salesperson_id INT NOT NULL,
  customer_id INT NOT NULL,
  customer_name VARCHAR(100) NOT NULL,
  customer_phone VARCHAR(20) NOT NULL,
  customer_email VARCHAR(120) NULL,
  item VARCHAR(50) NOT NULL DEFAULT 'Chicken',
  quantity DECIMAL(10,2) NOT NULL CHECK (quantity > 0),
  price_per_unit DECIMAL(10,2) NOT NULL,       -- frozen at time of sale
  subtotal DECIMAL(12,2) NOT NULL,
  coupon_id INT NULL,
  coupon_discount DECIMAL(12,2) NOT NULL DEFAULT 0,
  final_amount DECIMAL(12,2) NOT NULL,
  sale_date DATE NOT NULL,
  sale_time TIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (salesperson_id) REFERENCES users(id),
  FOREIGN KEY (customer_id) REFERENCES customers(id),
  FOREIGN KEY (coupon_id) REFERENCES coupons(id),
  INDEX idx_sales_date (sale_date),
  INDEX idx_sales_person (salesperson_id, sale_date),
  INDEX idx_sales_phone (customer_phone)
);

CREATE TABLE stock_transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type ENUM('STOCK_ADDED','SALE','SALE_EDIT','SALE_REVERSAL') NOT NULL,
  quantity DECIMAL(10,2) NOT NULL,             -- signed: + adds stock, - removes
  reference_id INT NULL,                       -- sale id when applicable
  description VARCHAR(255) NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id),
  INDEX idx_stock_ref (reference_id)
);

CREATE TABLE login_activity (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  username VARCHAR(50) NOT NULL,
  login_date DATE NOT NULL,
  login_time TIME NOT NULL,
  logout_date DATE NULL,
  logout_time TIME NULL,
  ip_address VARCHAR(64) NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_login_user (user_id)
);

CREATE TABLE google_sheet_sync (
  id INT AUTO_INCREMENT PRIMARY KEY,
  sale_id INT NOT NULL UNIQUE,
  status ENUM('SYNCED','PENDING','FAILED') NOT NULL DEFAULT 'PENDING',
  attempt_count INT NOT NULL DEFAULT 0,
  last_attempt DATETIME NULL,
  error_message TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE
);
