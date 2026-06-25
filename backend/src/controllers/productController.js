import { getDatabase } from '../config/db.js';

const MAX_LIMIT = 48;
const OTHER_CATEGORY_SLUGS = [
  'goalkeeper-gloves',
  'shin-guards',
  'sports-bags',
  'accessories',
  'training',
];

const toFiniteNumber = (value, fallback = null) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

// @desc    Get all products (with pagination, filters, sort)
// @route   GET /api/products
// @access  Public
export const getProducts = async (req, res, next) => {
  try {
    const {
      category,
      size,
      color,
      price_min,
      price_max,
      sort_by = 'featured',
      page = 1,
      limit = 12,
    } = req.query;

    const parsedPage = Math.max(1, toFiniteNumber(page, 1));
    const parsedLimit = Math.min(MAX_LIMIT, Math.max(1, toFiniteNumber(limit, 12)));
    const parsedMinPrice = toFiniteNumber(price_min);
    const parsedMaxPrice = toFiniteNumber(price_max);

    if (parsedMinPrice !== null && parsedMaxPrice !== null && parsedMinPrice > parsedMaxPrice) {
      return res.status(400).json({
        success: false,
        message: 'Invalid price range. price_min must be less than or equal to price_max.',
      });
    }

    const allowedSorts = new Set(['featured', 'newest', 'price_asc', 'price_desc', 'name_asc']);
    if (!allowedSorts.has(sort_by)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid sort_by value.',
      });
    }

    const db = getDatabase();

    let fromAndWhere = `
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE 1=1
    `;
    const filterParams = [];

    if (category === 'others') {
      fromAndWhere += ` AND c.slug IN (${OTHER_CATEGORY_SLUGS.map(() => '?').join(', ')})`;
      filterParams.push(...OTHER_CATEGORY_SLUGS);
    } else if (category) {
      fromAndWhere += ' AND c.slug = ?';
      filterParams.push(category);
    }

    if (parsedMinPrice !== null) {
      fromAndWhere += ' AND p.base_price >= ?';
      filterParams.push(parsedMinPrice);
    }

    if (parsedMaxPrice !== null) {
      fromAndWhere += ' AND p.base_price <= ?';
      filterParams.push(parsedMaxPrice);
    }

    if (size) {
      fromAndWhere += `
        AND EXISTS (
          SELECT 1
          FROM product_variants pv_size
          WHERE pv_size.product_id = p.id
            AND pv_size.size = ?
        )
      `;
      filterParams.push(size);
    }

    if (color) {
      fromAndWhere += `
        AND EXISTS (
          SELECT 1
          FROM product_variants pv_color
          WHERE pv_color.product_id = p.id
            AND pv_color.color = ?
        )
      `;
      filterParams.push(color);
    }

    let orderClause = ' ORDER BY p.is_featured DESC, p.created_at DESC';
    if (sort_by === 'newest') {
      orderClause = ' ORDER BY p.created_at DESC';
    }
    if (sort_by === 'price_asc') {
      orderClause = ' ORDER BY p.base_price ASC, p.created_at DESC';
    }
    if (sort_by === 'price_desc') {
      orderClause = ' ORDER BY p.base_price DESC, p.created_at DESC';
    }
    if (sort_by === 'name_asc') {
      orderClause = ' ORDER BY p.name ASC';
    }

    const productsQuery = `
      SELECT 
        p.id,
        p.name,
        p.slug,
        p.base_price,
        p.is_featured,
        c.name AS category_name,
        c.slug AS category_slug,
        (
          SELECT pv.id
          FROM product_variants pv
          WHERE pv.product_id = p.id
          ORDER BY pv.stock_quantity DESC, pv.id ASC
          LIMIT 1
        ) AS default_variant_id,
        COALESCE(
          (
            SELECT pv.stock_quantity
            FROM product_variants pv
            WHERE pv.product_id = p.id
            ORDER BY pv.stock_quantity DESC, pv.id ASC
            LIMIT 1
          ),
          0
        ) AS default_variant_stock,
        COALESCE(
          (
            SELECT SUM(pv.stock_quantity)
            FROM product_variants pv
            WHERE pv.product_id = p.id
          ),
          0
        ) AS total_stock,
        COALESCE(
          (
            SELECT pi.image_url
            FROM product_images pi
            WHERE pi.product_id = p.id
            ORDER BY pi.is_primary DESC, pi.display_order ASC, pi.id ASC
            LIMIT 1
          ),
          ''
        ) AS primary_image,
        COALESCE((SELECT COUNT(*) FROM reviews r WHERE r.product_id = p.id), 0) AS review_count,
        COALESCE((SELECT ROUND(AVG(r.rating), 1) FROM reviews r WHERE r.product_id = p.id), 0) AS avg_rating
      ${fromAndWhere}
      ${orderClause}
      LIMIT ? OFFSET ?
    `;

    const countQuery = `
      SELECT COUNT(*) AS total
      ${fromAndWhere}
    `;

    const offset = (parsedPage - 1) * parsedLimit;
    const [products] = await db.query(productsQuery, [...filterParams, parsedLimit, offset]);
    const [countRows] = await db.query(countQuery, filterParams);
    const totalCount = Number(countRows[0]?.total || 0);

    res.status(200).json({
      success: true,
      data: products,
      meta: {
        count: products.length,
        totalCount,
        totalPages: Math.ceil(totalCount / parsedLimit),
        currentPage: parsedPage,
        limit: parsedLimit,
        filters: {
          category: category || null,
          size: size || null,
          color: color || null,
          price_min: parsedMinPrice,
          price_max: parsedMaxPrice,
          sort_by,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single product by slug
// @route   GET /api/products/:slug
// @access  Public
export const getProductBySlug = async (req, res, next) => {
  try {
    const { slug = '' } = req.params;

    if (!slug.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Product slug is required.',
      });
    }

    const db = getDatabase();

    const query = `
      SELECT 
        p.id, p.name, p.slug, p.description, p.materials_care, p.base_price,
        c.name as category_name
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.slug = ?
    `;

    const [products] = await db.query(query, [slug.trim()]);

    if (products.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const product = products[0];

    // Fetch images
    const [images] = await db.query(
      'SELECT id, image_url, is_primary FROM product_images WHERE product_id = ? ORDER BY is_primary DESC, display_order ASC, id ASC',
      [product.id],
    );
    
    // Fetch variants (Sizes, Colors, Stock)
    const [variants] = await db.query(
      'SELECT id, sku, size, color, color_hex, price_modifier, stock_quantity FROM product_variants WHERE product_id = ?',
      [product.id],
    );
    
    // Fetch reviews summary
    const [reviews] = await db.query(
      'SELECT COUNT(*) as total_reviews, ROUND(AVG(rating), 1) as avg_rating FROM reviews WHERE product_id = ?',
      [product.id],
    );

    const availableSizes = [...new Set(variants.map((variant) => variant.size).filter(Boolean))];
    const availableColors = [
      ...new Map(
        variants
          .filter((variant) => variant.color)
          .map((variant) => [variant.color, { name: variant.color, hex: variant.color_hex || null }]),
      ).values(),
    ];

    res.status(200).json({
      success: true,
      data: {
        ...product,
        images,
        variants,
        availableSizes,
        availableColors,
        reviews: {
          count: Number(reviews[0]?.total_reviews || 0),
          rating: Number(reviews[0]?.avg_rating || 0),
        },
      },
    });

  } catch (error) {
    next(error);
  }
};