CREATE DATABASE IF NOT EXISTS printhub CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE printhub;

CREATE TABLE users (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, full_name VARCHAR(120) NOT NULL, username VARCHAR(60) NOT NULL UNIQUE,
 email VARCHAR(160) NOT NULL UNIQUE, password_hash VARCHAR(255) NOT NULL, phone VARCHAR(30), address TEXT,
 role ENUM('admin','customer') NOT NULL DEFAULT 'customer', status ENUM('Active','Suspended','Archived') DEFAULT 'Active',
 profile_picture VARCHAR(255), must_change_password BOOLEAN DEFAULT FALSE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, deleted_at TIMESTAMP NULL,
 INDEX idx_user_role_status(role,status)
);
CREATE TABLE customer_profiles (id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,user_id INT UNSIGNED NOT NULL UNIQUE,notes TEXT,FOREIGN KEY(user_id) REFERENCES users(id));
CREATE TABLE print_services (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, service_code VARCHAR(30) UNIQUE, name VARCHAR(100) NOT NULL, description TEXT,
 category VARCHAR(60) NOT NULL, base_price DECIMAL(10,2) DEFAULT 0, calculation_type VARCHAR(40) DEFAULT 'Per page',
 completion_minutes INT DEFAULT 60, is_available BOOLEAN DEFAULT TRUE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, archived_at TIMESTAMP NULL
);
CREATE TABLE service_prices (id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,service_id INT UNSIGNED NOT NULL,label VARCHAR(80),price DECIMAL(10,2),FOREIGN KEY(service_id) REFERENCES print_services(id));
CREATE TABLE print_orders (
 id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY, order_number VARCHAR(30) NOT NULL UNIQUE, customer_id INT UNSIGNED NULL,
 walk_in_name VARCHAR(120), walk_in_phone VARCHAR(30), document_title VARCHAR(180), paper_size VARCHAR(30), paper_type VARCHAR(50),
 print_color ENUM('Black and White','Colored') DEFAULT 'Black and White', print_sides ENUM('Single-sided','Double-sided') DEFAULT 'Single-sided',
 orientation ENUM('Portrait','Landscape') DEFAULT 'Portrait', pages INT UNSIGNED DEFAULT 1, copies INT UNSIGNED DEFAULT 1,
 binding_option VARCHAR(60) DEFAULT 'None', finishing_option VARCHAR(100) DEFAULT 'None', instructions TEXT,
 fulfillment_method ENUM('Shop Pickup','Delivery') DEFAULT 'Shop Pickup', pickup_at DATETIME NULL, delivery_address TEXT,
 payment_method VARCHAR(40), estimated_price DECIMAL(10,2) DEFAULT 0, final_price DECIMAL(10,2) NULL,
 discount DECIMAL(10,2) DEFAULT 0, additional_charge DECIMAL(10,2) DEFAULT 0, balance DECIMAL(10,2) DEFAULT 0,
 priority ENUM('Normal','Rush') DEFAULT 'Normal', status ENUM('Pending','Under Review','Waiting for Payment','Approved','In Queue','Printing','Ready for Pickup','Out for Delivery','Completed','Rejected','Cancelled') DEFAULT 'Pending',
 assigned_staff VARCHAR(120), admin_notes TEXT, customer_notes TEXT, rejection_reason TEXT,
 created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 FOREIGN KEY(customer_id) REFERENCES users(id), INDEX idx_order_status(status), INDEX idx_order_customer(customer_id), INDEX idx_order_created(created_at)
);
CREATE TABLE print_order_items (id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,order_id INT UNSIGNED NOT NULL,service_id INT UNSIGNED,description VARCHAR(255),quantity DECIMAL(10,2) DEFAULT 1,unit_price DECIMAL(10,2),subtotal DECIMAL(10,2),FOREIGN KEY(order_id) REFERENCES print_orders(id) ON DELETE CASCADE,FOREIGN KEY(service_id) REFERENCES print_services(id));
CREATE TABLE print_order_files (id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,order_id INT UNSIGNED NOT NULL,user_id INT UNSIGNED NOT NULL,original_name VARCHAR(255),stored_name VARCHAR(255) UNIQUE,mime_type VARCHAR(100),file_size BIGINT UNSIGNED,file_kind ENUM('document','payment_proof','receipt') DEFAULT 'document',created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(order_id) REFERENCES print_orders(id) ON DELETE CASCADE,FOREIGN KEY(user_id) REFERENCES users(id));
CREATE TABLE payments (id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,payment_number VARCHAR(30) UNIQUE,order_id INT UNSIGNED NOT NULL,amount_due DECIMAL(10,2),amount_paid DECIMAL(10,2),remaining_balance DECIMAL(10,2),method VARCHAR(40),reference_number VARCHAR(100),proof_file_id INT UNSIGNED,status ENUM('Unpaid','Partially Paid','Paid','Payment Under Review','Refunded') DEFAULT 'Unpaid',payment_date DATETIME,verified_by INT UNSIGNED,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(order_id) REFERENCES print_orders(id),FOREIGN KEY(verified_by) REFERENCES users(id));
CREATE TABLE inventory_items (id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,item_code VARCHAR(30) UNIQUE,name VARCHAR(120) NOT NULL,category VARCHAR(60),brand VARCHAR(80),unit VARCHAR(30),current_quantity DECIMAL(12,2) DEFAULT 0,minimum_stock_level DECIMAL(12,2) DEFAULT 0,cost_per_unit DECIMAL(10,2) DEFAULT 0,supplier VARCHAR(120),storage_location VARCHAR(120),last_restock_date DATE,expiration_date DATE NULL,status ENUM('In Stock','Low Stock','Out of Stock','Archived') DEFAULT 'In Stock',notes TEXT,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP);
CREATE TABLE inventory_movements (id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,inventory_item_id INT UNSIGNED NOT NULL,movement_type ENUM('Restock','Usage','Adjustment','Damaged','Wasted','Returned') NOT NULL,quantity DECIMAL(12,2) NOT NULL,previous_quantity DECIMAL(12,2),updated_quantity DECIMAL(12,2),related_order_id INT UNSIGNED,notes TEXT,created_by INT UNSIGNED,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(inventory_item_id) REFERENCES inventory_items(id),FOREIGN KEY(related_order_id) REFERENCES print_orders(id),FOREIGN KEY(created_by) REFERENCES users(id));
CREATE TABLE expenses (id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,category VARCHAR(80),description VARCHAR(255),amount DECIMAL(10,2),expense_date DATE,receipt_file VARCHAR(255),created_by INT UNSIGNED,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(created_by) REFERENCES users(id));
CREATE TABLE notifications (id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,user_id INT UNSIGNED NOT NULL,title VARCHAR(120),message TEXT,type VARCHAR(40) DEFAULT 'info',is_read BOOLEAN DEFAULT FALSE,created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,INDEX idx_notification_user(user_id,is_read));
CREATE TABLE activity_logs (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,user_id INT UNSIGNED,action VARCHAR(160),related_type VARCHAR(60),related_id INT UNSIGNED,ip_address VARCHAR(45),created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(user_id) REFERENCES users(id));
CREATE TABLE shop_settings (id TINYINT UNSIGNED PRIMARY KEY DEFAULT 1,shop_name VARCHAR(120) DEFAULT 'PrintHub',shop_logo VARCHAR(255),address TEXT,phone VARCHAR(30),email VARCHAR(160),business_hours VARCHAR(255),pickup_schedule VARCHAR(255),accepted_file_types VARCHAR(255) DEFAULT 'pdf,doc,docx,ppt,pptx,jpg,jpeg,png',max_upload_mb INT DEFAULT 20,currency VARCHAR(10) DEFAULT 'PHP',tax_percentage DECIMAL(5,2) DEFAULT 0,delivery_fee DECIMAL(10,2) DEFAULT 80,terms TEXT,receipt_footer VARCHAR(255),updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP);

-- Password for both sample accounts: Password123! (change the admin password after first login)
-- The bcrypt hash below is replaced by server/scripts/seed-passwords.js if your bcrypt version differs.
INSERT INTO users(full_name,username,email,password_hash,role,must_change_password) VALUES
('PrintHub Administrator','admin','admin@printhub.local','$2b$12$w86Lvl4CdmcQDFNOl3CKtOtIB/cExFjX9bVhX1JPy2QxcFdofvUWK','admin',TRUE),
('Maria Santos','maria','maria@example.com','$2b$12$w86Lvl4CdmcQDFNOl3CKtOtIB/cExFjX9bVhX1JPy2QxcFdofvUWK','customer',FALSE);
INSERT INTO print_services(service_code,name,description,category,base_price,calculation_type,completion_minutes) VALUES
('BW','Black-and-white printing','Clear document printing','Document',2.00,'Per page',30),('COLOR','Colored printing','Full-color document printing','Document',8.00,'Per page',45),('PHOTO','Photo printing','High-quality photo paper','Photo',25.00,'Per sheet',60),('LAM','Lamination','Protect documents with film','Finishing',30.00,'Per sheet',20),('SPIRAL','Spiral binding','Spiral bind documents','Binding',45.00,'Per item',30),('RUSH','Rush printing','Priority queue fee','Other',50.00,'Fixed',10);
INSERT INTO inventory_items(item_code,name,category,brand,unit,current_quantity,minimum_stock_level,cost_per_unit,supplier,storage_location,status) VALUES
('INV-A4','A4 Bond Paper','Paper','PaperOne','Ream',12,5,245,'Office Supply Co.','Shelf A','In Stock'),('INV-BLK','Black Ink','Ink','Epson','Bottle',3,3,420,'Print Supply PH','Cabinet 1','Low Stock'),('INV-CYN','Cyan Ink','Ink','Epson','Bottle',5,2,420,'Print Supply PH','Cabinet 1','In Stock'),('INV-LAM','Laminating Film','Finishing','Generic','Pack',2,3,180,'Office Supply Co.','Shelf B','Low Stock');
INSERT INTO shop_settings(id,shop_name,address,phone,email,business_hours,delivery_fee,terms,receipt_footer) VALUES(1,'PrintHub','Santa Rosa, Nueva Ecija','0912 345 6789','hello@printhub.local','Monday-Saturday, 8:00 AM-6:00 PM',80,'Uploaded files must be legal and safe to print.','Thank you for choosing PrintHub!');
