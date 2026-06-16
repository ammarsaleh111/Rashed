import { getDatabase } from '../config/db.js';

const DAY_MS = 24 * 60 * 60 * 1000;

const formatMonthLabel = (date) =>
  date.toLocaleString('en-US', {
    month: 'short',
  });

const formatDateLabel = (value) =>
  new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const formatChartKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const percentageDelta = (currentValue, previousValue) => {
  if (previousValue === 0) {
    return currentValue > 0 ? 100 : 0;
  }

  return Number((((currentValue - previousValue) / previousValue) * 100).toFixed(1));
};

const buildSparkline = (currentValue, previousValue) => {
  const peakValue = Math.max(currentValue, previousValue, 1);

  return [
    previousValue * 0.42,
    previousValue * 0.5,
    currentValue * 0.36,
    currentValue * 0.78,
    currentValue * 0.4,
    peakValue,
  ].map((value) => Number(((value / peakValue) * 100).toFixed(1)));
};

const createMonthSeries = (rows) => {
  const today = new Date();
  const monthMap = new Map(
    rows.map((row) => [
      row.bucket,
      {
        label: row.label,
        revenue: Number(row.revenue || 0),
      },
    ]),
  );

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth() - (6 - index), 1);
    const bucket = formatChartKey(date);
    const record = monthMap.get(bucket);

    return {
      label: record?.label || formatMonthLabel(date).toUpperCase(),
      value: record?.revenue || 0,
    };
  });
};

const createDailySeries = (rows, days) => {
  const today = new Date();
  const rowMap = new Map(
    rows.map((row) => [
      row.bucket,
      {
        label: row.label,
        revenue: Number(row.revenue || 0),
      },
    ]),
  );

  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today.getTime() - DAY_MS * (days - index - 1));
    const bucket = date.toISOString().slice(0, 10);
    const record = rowMap.get(bucket);

    return {
      label:
        record?.label ||
        date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
      value: record?.revenue || 0,
    };
  });
};

const normalizeOrderStatus = (status) => {
  const normalized = String(status || '').toLowerCase();

  if (normalized === 'pending') {
    return 'pending';
  }

  if (normalized === 'processing') {
    return 'processing';
  }

  if (normalized === 'shipped') {
    return 'shipped';
  }

  if (normalized === 'delivered') {
    return 'delivered';
  }

  if (normalized === 'cancelled' || normalized === 'canceled') {
    return 'cancelled';
  }

  return 'pending';
};

const ensureContactMessagesTable = async (database) => {
  await database.query(`
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
    END
  `);
};

export const getAdminDashboard = async (_request, response, next) => {
  try {
    const database = getDatabase();
    await ensureContactMessagesTable(database);

    const [
      [currentRevenueRow],
      [previousRevenueRow],
      [currentOrdersRow],
      [previousOrdersRow],
      [currentCustomersRow],
      [previousCustomersRow],
      [currentConversionRow],
      [previousConversionRow],
      [averageOrderValueRow],
      [returnCustomerRateRow],
      [allTimeRevenueRow],
      [allTimeOrdersRow],
      [inventoryStatsRows],
      [customerStatsRows],
      [topCustomerRows],
      [orderStatusRows],
      [messageStatsRows],
      [monthlyRevenueRows],
      [thirtyDayRevenueRows],
      [weeklyRevenueRows],
      [topSellingRows],
      [recentOrderRows],
    ] = await Promise.all([
      database.query(`
        SELECT COALESCE(SUM(total_amount), 0) AS total
        FROM orders
        WHERE created_at >= DATEADD(day, -30, SYSUTCDATETIME())
          AND status <> 'Cancelled'
      `),
      database.query(`
        SELECT COALESCE(SUM(total_amount), 0) AS total
        FROM orders
        WHERE created_at >= DATEADD(day, -60, SYSUTCDATETIME())
          AND created_at < DATEADD(day, -30, SYSUTCDATETIME())
          AND status <> 'Cancelled'
      `),
      database.query(`
        SELECT COUNT(*) AS total
        FROM orders
        WHERE status <> 'Cancelled'
          AND created_at >= DATEADD(day, -30, SYSUTCDATETIME())
      `),
      database.query(`
        SELECT COUNT(*) AS total
        FROM orders
        WHERE status <> 'Cancelled'
          AND created_at >= DATEADD(day, -60, SYSUTCDATETIME())
          AND created_at < DATEADD(day, -30, SYSUTCDATETIME())
      `),
      database.query(`
        SELECT COUNT(*) AS total
        FROM users
        WHERE role = 'customer'
          AND created_at >= DATEADD(day, -30, SYSUTCDATETIME())
      `),
      database.query(`
        SELECT COUNT(*) AS total
        FROM users
        WHERE role = 'customer'
          AND created_at >= DATEADD(day, -60, SYSUTCDATETIME())
          AND created_at < DATEADD(day, -30, SYSUTCDATETIME())
      `),
      database.query(`
        SELECT
          COALESCE(
            (
              SELECT CAST(COUNT(*) AS DECIMAL(10, 2)) FROM orders
              WHERE created_at >= DATEADD(day, -30, SYSUTCDATETIME())
            ) / NULLIF(
              (SELECT CAST(COUNT(*) AS DECIMAL(10, 2)) FROM carts WHERE created_at >= DATEADD(day, -30, SYSUTCDATETIME())),
              0
            ) * 100,
            0
          ) AS total
      `),
      database.query(`
        SELECT
          COALESCE(
            (
              SELECT CAST(COUNT(*) AS DECIMAL(10, 2)) FROM orders
              WHERE created_at >= DATEADD(day, -60, SYSUTCDATETIME())
                AND created_at < DATEADD(day, -30, SYSUTCDATETIME())
            ) / NULLIF(
              (
                SELECT CAST(COUNT(*) AS DECIMAL(10, 2)) FROM carts
                WHERE created_at >= DATEADD(day, -60, SYSUTCDATETIME())
                  AND created_at < DATEADD(day, -30, SYSUTCDATETIME())
              ),
              0
            ) * 100,
            0
          ) AS total
      `),
      database.query(`
        SELECT COALESCE(AVG(total_amount), 0) AS total
        FROM orders
        WHERE created_at >= DATEADD(day, -30, SYSUTCDATETIME())
          AND status <> 'Cancelled'
      `),
      database.query(`
        SELECT
          COALESCE(
            (
              SELECT CAST(COUNT(*) AS DECIMAL(10, 2))
              FROM (
                SELECT user_id
                FROM orders
                WHERE user_id IS NOT NULL
                  AND created_at >= DATEADD(day, -30, SYSUTCDATETIME())
                GROUP BY user_id
                HAVING COUNT(*) > 1
              ) repeat_customers
            ) / NULLIF(
              (
                SELECT CAST(COUNT(DISTINCT user_id) AS DECIMAL(10, 2))
                FROM orders
                WHERE user_id IS NOT NULL
                  AND created_at >= DATEADD(day, -30, SYSUTCDATETIME())
              ),
              0
            ) * 100,
            0
          ) AS total
      `),
      database.query(`
        SELECT COALESCE(SUM(total_amount), 0) AS total
        FROM orders
        WHERE status <> 'Cancelled'
      `),
      database.query(`
        SELECT COUNT(*) AS total
        FROM orders
        WHERE status <> 'Cancelled'
      `),
      database.query(`
        SELECT
          (SELECT COUNT(*) FROM products) AS total_products,
          (SELECT COUNT(*) FROM product_variants) AS total_variants,
          (SELECT COUNT(*) FROM product_variants WHERE stock_quantity <= 5) AS low_stock_variants,
          (SELECT COUNT(*) FROM products WHERE is_featured = 1) AS featured_products
      `),
      database.query(`
        SELECT
          (SELECT COUNT(*) FROM users WHERE role = 'customer') AS total_customers,
          (SELECT COUNT(*) FROM users WHERE role = 'customer' AND created_at >= DATEADD(day, -30, SYSUTCDATETIME())) AS new_customers_30d,
          (
            SELECT COUNT(DISTINCT user_id)
            FROM orders
            WHERE user_id IS NOT NULL
              AND created_at >= DATEADD(day, -30, SYSUTCDATETIME())
          ) AS active_customers_30d
      `),
      database.query(`
        SELECT TOP 5
          CONCAT(u.first_name, ' ', u.last_name) AS customer_name,
          u.email,
          COUNT(o.id) AS total_orders,
          COALESCE(SUM(o.total_amount), 0) AS lifetime_value
        FROM users u
        LEFT JOIN orders o
          ON o.user_id = u.id
          AND o.status <> 'Cancelled'
        WHERE u.role = 'customer'
        GROUP BY u.id, u.first_name, u.last_name, u.email
        ORDER BY lifetime_value DESC, total_orders DESC, customer_name ASC
      `),
      database.query(`
        SELECT status, COUNT(*) AS total
        FROM orders
        GROUP BY status
      `),
      database.query(`
        SELECT
          COUNT(*) AS total_messages,
          COALESCE(SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END), 0) AS new_messages,
          COALESCE(SUM(CASE WHEN status IN ('new', 'read') THEN 1 ELSE 0 END), 0) AS unresolved_messages
        FROM contact_messages
      `),
      database.query(`
        SELECT
          CONVERT(char(7), created_at, 120) AS bucket,
          UPPER(LEFT(DATENAME(month, created_at), 3)) AS label,
          COALESCE(SUM(total_amount), 0) AS revenue
        FROM orders
        WHERE created_at >= DATEADD(month, -6, DATEFROMPARTS(YEAR(SYSUTCDATETIME()), MONTH(SYSUTCDATETIME()), 1))
          AND status <> 'Cancelled'
        GROUP BY CONVERT(char(7), created_at, 120), UPPER(LEFT(DATENAME(month, created_at), 3))
        ORDER BY bucket
      `),
      database.query(`
        SELECT
          CAST(created_at AS date) AS bucket,
          FORMAT(created_at, 'MMM d') AS label,
          COALESCE(SUM(total_amount), 0) AS revenue
        FROM orders
        WHERE created_at >= DATEADD(day, -29, CAST(SYSUTCDATETIME() AS date))
          AND status <> 'Cancelled'
        GROUP BY CAST(created_at AS date), FORMAT(created_at, 'MMM d')
        ORDER BY bucket
      `),
      database.query(`
        SELECT
          CAST(created_at AS date) AS bucket,
          UPPER(LEFT(DATENAME(weekday, created_at), 3)) AS label,
          COALESCE(SUM(total_amount), 0) AS revenue
        FROM orders
        WHERE created_at >= DATEADD(day, -6, CAST(SYSUTCDATETIME() AS date))
          AND status <> 'Cancelled'
        GROUP BY CAST(created_at AS date), UPPER(LEFT(DATENAME(weekday, created_at), 3))
        ORDER BY bucket
      `),
      database.query(`
        SELECT TOP 4
          COALESCE(products.name, order_items.product_name) AS product_name,
          COALESCE(MAX(product_images.image_url), '') AS image_url,
          COALESCE(SUM(order_items.quantity), 0) AS units_sold,
          COALESCE(SUM(order_items.quantity * order_items.price_at_purchase), 0) AS revenue
        FROM order_items
        INNER JOIN orders
          ON orders.id = order_items.order_id
          AND orders.status <> 'Cancelled'
        LEFT JOIN product_variants ON product_variants.id = order_items.variant_id
        LEFT JOIN products ON products.id = product_variants.product_id
        LEFT JOIN product_images
          ON product_images.product_id = products.id
          AND product_images.is_primary = 1
        GROUP BY COALESCE(products.id, order_items.product_name), COALESCE(products.name, order_items.product_name)
        ORDER BY units_sold DESC, revenue DESC
      `),
      database.query(`
        SELECT TOP 24
          order_number,
          COALESCE(CONCAT(users.first_name, ' ', users.last_name), 'Guest Checkout') AS customer_name,
          total_amount,
          status,
          orders.created_at
        FROM orders
        LEFT JOIN users ON users.id = orders.user_id
        ORDER BY orders.created_at DESC
      `),
    ]);

    const currentRevenue = Number(currentRevenueRow?.[0]?.total || 0);
    const previousRevenue = Number(previousRevenueRow?.[0]?.total || 0);
    const currentPeriodOrders = Number(currentOrdersRow?.[0]?.total || 0);
    const previousPeriodOrders = Number(previousOrdersRow?.[0]?.total || 0);
    const currentCustomers = Number(currentCustomersRow?.[0]?.total || 0);
    const previousCustomers = Number(previousCustomersRow?.[0]?.total || 0);
    const currentConversion = Number(currentConversionRow?.[0]?.total || 0);
    const previousConversion = Number(previousConversionRow?.[0]?.total || 0);
    const averageOrderValue = Number(averageOrderValueRow?.[0]?.total || 0);
    const returnCustomerRate = Number(returnCustomerRateRow?.[0]?.total || 0);
    const allTimeRevenue = Number(allTimeRevenueRow?.[0]?.total || 0);
    const allTimeOrders = Number(allTimeOrdersRow?.[0]?.total || 0);
    const cartAbandonmentRate = Number(Math.max(0, 100 - currentConversion).toFixed(1));

    const inventoryStats = inventoryStatsRows?.[0] || {};
    const customerStats = customerStatsRows?.[0] || {};
    const messageStats = messageStatsRows?.[0] || {};

    const orderStatusCounts = {
      pending: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    };

    for (const row of orderStatusRows || []) {
      const key = String(row.status || '').toLowerCase();
      if (Object.prototype.hasOwnProperty.call(orderStatusCounts, key)) {
        orderStatusCounts[key] = Number(row.total || 0);
      }
    }

    response.json({
      summaryCards: [
        {
          id: 'revenue',
          label: 'Revenue (30D)',
          value: currentRevenue,
          format: 'currency',
          trend: percentageDelta(currentRevenue, previousRevenue),
          sparkline: buildSparkline(currentRevenue, previousRevenue),
        },
        {
          id: 'orders',
          label: 'Orders (30D)',
          value: currentPeriodOrders,
          format: 'number',
          trend: percentageDelta(currentPeriodOrders, previousPeriodOrders),
          sparkline: buildSparkline(currentPeriodOrders, previousPeriodOrders),
        },
        {
          id: 'customers',
          label: 'Customers (30D)',
          value: currentCustomers,
          format: 'number',
          trend: percentageDelta(currentCustomers, previousCustomers),
          sparkline: buildSparkline(currentCustomers, previousCustomers),
        },
        {
          id: 'conversion',
          label: 'Conversion',
          value: Number(currentConversion.toFixed(1)),
          format: 'percent',
          trend: percentageDelta(currentConversion, previousConversion),
          sparkline: buildSparkline(currentConversion, previousConversion),
        },
      ],
      overview: {
        generatedAt: new Date().toISOString(),
        allTimeRevenue: Number(allTimeRevenue.toFixed(2)),
        allTimeOrders,
        pendingOrders: Number(orderStatusCounts.pending || 0),
        newMessages: Number(messageStats.new_messages || 0),
        unresolvedMessages: Number(messageStats.unresolved_messages || 0),
        totalMessages: Number(messageStats.total_messages || 0),
      },
      revenueSeries: {
        '7d': createDailySeries(weeklyRevenueRows, 7),
        '30d': createDailySeries(thirtyDayRevenueRows, 30),
        '1y': createMonthSeries(monthlyRevenueRows),
      },
      topSelling: topSellingRows.map((item, index) => ({
        id: `top-${index + 1}`,
        name: item.product_name || `Product ${index + 1}`,
        unitsSold: Number(item.units_sold || 0),
        revenue: Number(item.revenue || 0),
        imageUrl: item.image_url || '',
      })),
      recentOrders: recentOrderRows.map((order, index) => ({
        id: `${order.order_number}-${index}`,
        orderNumber: order.order_number,
        customerName: order.customer_name,
        customerInitials: order.customer_name
          .split(' ')
          .slice(0, 2)
          .map((part) => part[0] || '')
          .join('')
          .toUpperCase(),
        date: formatDateLabel(order.created_at),
        amount: Number(order.total_amount || 0),
        status: normalizeOrderStatus(order.status),
      })),
      orderStatusCounts,
      analytics: {
        averageOrderValue: Number(averageOrderValue.toFixed(2)),
        cartAbandonmentRate,
        returnCustomerRate: Number(returnCustomerRate.toFixed(1)),
      },
      inventory: {
        totalProducts: Number(inventoryStats.total_products || 0),
        totalVariants: Number(inventoryStats.total_variants || 0),
        lowStockVariants: Number(inventoryStats.low_stock_variants || 0),
        featuredProducts: Number(inventoryStats.featured_products || 0),
      },
      customers: {
        totalCustomers: Number(customerStats.total_customers || 0),
        newCustomers30d: Number(customerStats.new_customers_30d || 0),
        activeCustomers30d: Number(customerStats.active_customers_30d || 0),
        topCustomers: (topCustomerRows || []).map((row, index) => ({
          id: `cust-${index + 1}`,
          name: row.customer_name,
          email: row.email,
          totalOrders: Number(row.total_orders || 0),
          lifetimeValue: Number(row.lifetime_value || 0),
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};
