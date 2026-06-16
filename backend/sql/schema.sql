IF OBJECT_ID('dbo.users', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.users (
    id INT IDENTITY(1,1) PRIMARY KEY,
    email NVARCHAR(255) NOT NULL,
    password_hash NVARCHAR(255) NOT NULL,
    first_name NVARCHAR(100) NOT NULL,
    last_name NVARCHAR(100) NOT NULL,
    role NVARCHAR(20) NOT NULL CONSTRAINT DF_users_role DEFAULT 'customer',
    created_at DATETIME2(0) NOT NULL CONSTRAINT DF_users_created_at DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(0) NOT NULL CONSTRAINT DF_users_updated_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_users_email UNIQUE (email),
    CONSTRAINT CK_users_role CHECK (role IN ('customer', 'admin'))
  )
END;

IF OBJECT_ID('dbo.user_profiles', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.user_profiles (
    user_id INT PRIMARY KEY,
    phone_number NVARCHAR(20) NULL,
    reward_points INT NOT NULL CONSTRAINT DF_user_profiles_reward_points DEFAULT 0,
    tier_status NVARCHAR(20) NOT NULL CONSTRAINT DF_user_profiles_tier_status DEFAULT 'Member',
    CONSTRAINT CK_user_profiles_tier_status CHECK (tier_status IN ('Member', 'Silver', 'Gold', 'Elite')),
    CONSTRAINT FK_user_profiles_user FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE CASCADE
  )
END;

IF OBJECT_ID('dbo.addresses', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.addresses (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NOT NULL,
    address_line_1 NVARCHAR(255) NOT NULL,
    address_line_2 NVARCHAR(255) NULL,
    city NVARCHAR(100) NOT NULL,
    state NVARCHAR(100) NOT NULL,
    postal_code NVARCHAR(20) NOT NULL,
    country NVARCHAR(100) NOT NULL CONSTRAINT DF_addresses_country DEFAULT 'US',
    is_default BIT NOT NULL CONSTRAINT DF_addresses_is_default DEFAULT 0,
    CONSTRAINT FK_addresses_user FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE CASCADE
  )
END;

IF OBJECT_ID('dbo.categories', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.categories (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL,
    slug NVARCHAR(100) NOT NULL,
    description NVARCHAR(MAX) NULL,
    parent_id INT NULL,
    CONSTRAINT UQ_categories_slug UNIQUE (slug),
    CONSTRAINT FK_categories_parent FOREIGN KEY (parent_id) REFERENCES dbo.categories(id) ON DELETE NO ACTION
  )
END;

IF OBJECT_ID('dbo.products', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.products (
    id INT IDENTITY(1,1) PRIMARY KEY,
    category_id INT NULL,
    name NVARCHAR(255) NOT NULL,
    slug NVARCHAR(255) NOT NULL,
    description NVARCHAR(MAX) NOT NULL,
    materials_care NVARCHAR(MAX) NULL,
    base_price DECIMAL(10, 2) NOT NULL,
    is_featured BIT NOT NULL CONSTRAINT DF_products_is_featured DEFAULT 0,
    created_at DATETIME2(0) NOT NULL CONSTRAINT DF_products_created_at DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(0) NOT NULL CONSTRAINT DF_products_updated_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_products_slug UNIQUE (slug),
    CONSTRAINT FK_products_category FOREIGN KEY (category_id) REFERENCES dbo.categories(id) ON DELETE SET NULL
  )
END;

IF OBJECT_ID('dbo.product_variants', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.product_variants (
    id INT IDENTITY(1,1) PRIMARY KEY,
    product_id INT NOT NULL,
    sku NVARCHAR(100) NOT NULL,
    size NVARCHAR(50) NULL,
    color NVARCHAR(50) NULL,
    color_hex NVARCHAR(10) NULL,
    price_modifier DECIMAL(10, 2) NOT NULL CONSTRAINT DF_product_variants_price_modifier DEFAULT 0.00,
    stock_quantity INT NOT NULL CONSTRAINT DF_product_variants_stock_quantity DEFAULT 0,
    CONSTRAINT UQ_product_variants_sku UNIQUE (sku),
    CONSTRAINT FK_product_variants_product FOREIGN KEY (product_id) REFERENCES dbo.products(id) ON DELETE CASCADE
  )
END;

IF OBJECT_ID('dbo.product_images', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.product_images (
    id INT IDENTITY(1,1) PRIMARY KEY,
    product_id INT NOT NULL,
    variant_id INT NULL,
    image_url NVARCHAR(255) NOT NULL,
    is_primary BIT NOT NULL CONSTRAINT DF_product_images_is_primary DEFAULT 0,
    display_order INT NOT NULL CONSTRAINT DF_product_images_display_order DEFAULT 0,
    CONSTRAINT FK_product_images_product FOREIGN KEY (product_id) REFERENCES dbo.products(id) ON DELETE CASCADE,
    CONSTRAINT FK_product_images_variant FOREIGN KEY (variant_id) REFERENCES dbo.product_variants(id) ON DELETE NO ACTION
  )
END;

IF OBJECT_ID('dbo.carts', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.carts (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NULL,
    session_id NVARCHAR(255) NULL,
    created_at DATETIME2(0) NOT NULL CONSTRAINT DF_carts_created_at DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(0) NOT NULL CONSTRAINT DF_carts_updated_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT FK_carts_user FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE CASCADE
  )
END;

IF OBJECT_ID('dbo.cart_items', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.cart_items (
    id INT IDENTITY(1,1) PRIMARY KEY,
    cart_id INT NOT NULL,
    variant_id INT NOT NULL,
    quantity INT NOT NULL CONSTRAINT DF_cart_items_quantity DEFAULT 1,
    CONSTRAINT FK_cart_items_cart FOREIGN KEY (cart_id) REFERENCES dbo.carts(id) ON DELETE CASCADE,
    CONSTRAINT FK_cart_items_variant FOREIGN KEY (variant_id) REFERENCES dbo.product_variants(id) ON DELETE CASCADE
  )
END;

IF OBJECT_ID('dbo.orders', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.orders (
    id INT IDENTITY(1,1) PRIMARY KEY,
    order_number NVARCHAR(50) NOT NULL,
    user_id INT NULL,
    shipping_address_id INT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    tax DECIMAL(10, 2) NOT NULL,
    shipping_cost DECIMAL(10, 2) NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    status NVARCHAR(20) NOT NULL CONSTRAINT DF_orders_status DEFAULT 'Pending',
    tracking_number NVARCHAR(100) NULL,
    created_at DATETIME2(0) NOT NULL CONSTRAINT DF_orders_created_at DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(0) NOT NULL CONSTRAINT DF_orders_updated_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT UQ_orders_order_number UNIQUE (order_number),
    CONSTRAINT CK_orders_status CHECK (status IN ('Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled')),
    CONSTRAINT FK_orders_user FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE SET NULL,
    CONSTRAINT FK_orders_address FOREIGN KEY (shipping_address_id) REFERENCES dbo.addresses(id) ON DELETE NO ACTION
  )
END;

IF OBJECT_ID('dbo.order_items', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.order_items (
    id INT IDENTITY(1,1) PRIMARY KEY,
    order_id INT NOT NULL,
    variant_id INT NOT NULL,
    product_name NVARCHAR(255) NOT NULL,
    sku NVARCHAR(100) NOT NULL,
    quantity INT NOT NULL,
    price_at_purchase DECIMAL(10, 2) NOT NULL,
    CONSTRAINT FK_order_items_order FOREIGN KEY (order_id) REFERENCES dbo.orders(id) ON DELETE CASCADE,
    CONSTRAINT FK_order_items_variant FOREIGN KEY (variant_id) REFERENCES dbo.product_variants(id)
  )
END;

IF OBJECT_ID('dbo.reviews', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.reviews (
    id INT IDENTITY(1,1) PRIMARY KEY,
    product_id INT NOT NULL,
    user_id INT NOT NULL,
    rating INT NOT NULL,
    title NVARCHAR(255) NULL,
    comment NVARCHAR(MAX) NULL,
    is_verified_buyer BIT NOT NULL CONSTRAINT DF_reviews_is_verified_buyer DEFAULT 0,
    created_at DATETIME2(0) NOT NULL CONSTRAINT DF_reviews_created_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT CK_reviews_rating CHECK (rating >= 1 AND rating <= 5),
    CONSTRAINT FK_reviews_product FOREIGN KEY (product_id) REFERENCES dbo.products(id) ON DELETE CASCADE,
    CONSTRAINT FK_reviews_user FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE CASCADE
  )
END;

IF OBJECT_ID('dbo.contact_messages', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.contact_messages (
    id INT IDENTITY(1,1) PRIMARY KEY,
    user_id INT NULL,
    full_name NVARCHAR(150) NOT NULL,
    email NVARCHAR(255) NOT NULL,
    subject NVARCHAR(255) NOT NULL,
    message NVARCHAR(MAX) NOT NULL,
    status NVARCHAR(20) NOT NULL CONSTRAINT DF_contact_messages_status DEFAULT 'new',
    admin_note NVARCHAR(MAX) NULL,
    created_at DATETIME2(0) NOT NULL CONSTRAINT DF_contact_messages_created_at DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2(0) NOT NULL CONSTRAINT DF_contact_messages_updated_at DEFAULT SYSUTCDATETIME(),
    CONSTRAINT CK_contact_messages_status CHECK (status IN ('new', 'read', 'resolved')),
    CONSTRAINT FK_contact_messages_user FOREIGN KEY (user_id) REFERENCES dbo.users(id) ON DELETE SET NULL
  )
END;

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'idx_product_slug'
    AND object_id = OBJECT_ID('dbo.products')
)
BEGIN
  CREATE INDEX idx_product_slug ON dbo.products (slug)
END;

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'idx_category_slug'
    AND object_id = OBJECT_ID('dbo.categories')
)
BEGIN
  CREATE INDEX idx_category_slug ON dbo.categories (slug)
END;

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'idx_order_number'
    AND object_id = OBJECT_ID('dbo.orders')
)
BEGIN
  CREATE INDEX idx_order_number ON dbo.orders (order_number)
END;

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'idx_user_email'
    AND object_id = OBJECT_ID('dbo.users')
)
BEGIN
  CREATE INDEX idx_user_email ON dbo.users (email)
END;

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'idx_contact_messages_status'
    AND object_id = OBJECT_ID('dbo.contact_messages')
)
BEGIN
  CREATE INDEX idx_contact_messages_status ON dbo.contact_messages (status)
END;

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE name = 'idx_contact_messages_created_at'
    AND object_id = OBJECT_ID('dbo.contact_messages')
)
BEGIN
  CREATE INDEX idx_contact_messages_created_at ON dbo.contact_messages (created_at)
END;
