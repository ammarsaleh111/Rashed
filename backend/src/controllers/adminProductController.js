import { getDatabase } from '../config/db.js';

const MAX_PAGE_LIMIT = 200;

const createHttpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object || {}, key);

const toTrimmedString = (value) => String(value ?? '').trim();

const toOptionalString = (value, maxLength = null) => {
  const normalized = toTrimmedString(value);

  if (!normalized) {
    return null;
  }

  if (maxLength && normalized.length > maxLength) {
    return normalized.slice(0, maxLength);
  }

  return normalized;
};

const requireStringField = (value, fieldName, maxLength = null) => {
  const normalized = toOptionalString(value, maxLength);

  if (!normalized) {
    throw createHttpError(400, `${fieldName} is required.`);
  }

  return normalized;
};

const parseMoney = (value, fieldName) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw createHttpError(400, `${fieldName} must be a non-negative number.`);
  }

  return Number(parsed.toFixed(2));
};

const parseNonNegativeInteger = (value, fieldName) => {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw createHttpError(400, `${fieldName} must be a non-negative integer.`);
  }

  return parsed;
};

const parseBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value === 1;
  }

  const normalized = String(value).trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
};

const normalizeSlug = (value) =>
  String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

const normalizeSku = (value) =>
  String(value || '')
    .toUpperCase()
    .trim()
    .replace(/[^A-Z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 100);

const withSuffix = (baseValue, suffix) => {
  const trimmed = String(baseValue || '').slice(0, 100);
  const compound = `${trimmed}-${suffix}`;

  if (compound.length <= 100) {
    return compound;
  }

  const overflow = compound.length - 100;
  return `${trimmed.slice(0, Math.max(1, trimmed.length - overflow))}-${suffix}`;
};

const buildDefaultSkuSeed = ({ productSlug, size, color, index }) => {
  const slugPart = normalizeSku(productSlug).replace(/_/g, '-').slice(0, 12) || 'PRODUCT';
  const colorPart = normalizeSku(color || 'DEFAULT').replace(/_/g, '-').slice(0, 8) || 'DEFAULT';
  const sizePart = normalizeSku(size || 'STD').replace(/_/g, '-').slice(0, 6) || 'STD';
  const numericSuffix = String(index + 1).padStart(2, '0');

  return `RSH-${slugPart}-${colorPart}-${sizePart}-${numericSuffix}`;
};

const isValidImageUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (_error) {
    return false;
  }
};

const ensureUniqueProductSlug = async (connection, desiredSlug, excludeProductId = null) => {
  const baseSlug = normalizeSlug(desiredSlug);

  if (!baseSlug) {
    throw createHttpError(400, 'A valid product slug could not be generated from the provided name/slug.');
  }

  let candidate = baseSlug;
  let suffix = 2;

  while (true) {
    const query = excludeProductId
      ? 'SELECT TOP 1 id FROM products WHERE slug = ? AND id <> ?'
      : 'SELECT TOP 1 id FROM products WHERE slug = ?';
    const params = excludeProductId ? [candidate, excludeProductId] : [candidate];
    const [rows] = await connection.query(query, params);

    if (!rows.length) {
      return candidate;
    }

    candidate = withSuffix(baseSlug, suffix);
    suffix += 1;
  }
};

const ensureUniqueSku = async (connection, desiredSku, excludeVariantId = null) => {
  const baseSku = normalizeSku(desiredSku) || `RSH-SKU-${Date.now()}`;
  let candidate = baseSku;
  let suffix = 2;

  while (true) {
    const query = excludeVariantId
      ? 'SELECT TOP 1 id FROM product_variants WHERE sku = ? AND id <> ?'
      : 'SELECT TOP 1 id FROM product_variants WHERE sku = ?';
    const params = excludeVariantId ? [candidate, excludeVariantId] : [candidate];
    const [rows] = await connection.query(query, params);

    if (!rows.length) {
      return candidate;
    }

    candidate = withSuffix(baseSku, suffix);
    suffix += 1;
  }
};

const getCategoryInput = (payload) => ({
  categoryId: payload.category_id ?? payload.categoryId,
  categorySlug: payload.category_slug ?? payload.categorySlug,
  categoryName: payload.category_name ?? payload.categoryName,
});

const hasCategoryInput = (payload) => {
  const category = getCategoryInput(payload);

  return (
    category.categoryId !== undefined ||
    category.categorySlug !== undefined ||
    category.categoryName !== undefined
  );
};

const resolveCategoryId = async (connection, payload) => {
  const category = getCategoryInput(payload);

  if (category.categoryId !== undefined) {
    if (category.categoryId === null || category.categoryId === '') {
      return null;
    }

    const parsedCategoryId = Number(category.categoryId);

    if (!Number.isInteger(parsedCategoryId) || parsedCategoryId <= 0) {
      throw createHttpError(400, 'category_id must be a valid positive integer.');
    }

    const [rows] = await connection.query('SELECT TOP 1 id FROM categories WHERE id = ?', [parsedCategoryId]);

    if (!rows.length) {
      throw createHttpError(400, 'The specified category_id does not exist.');
    }

    return parsedCategoryId;
  }

  if (category.categorySlug !== undefined && category.categorySlug !== null && category.categorySlug !== '') {
    const normalizedSlug = normalizeSlug(category.categorySlug);

    if (!normalizedSlug) {
      throw createHttpError(400, 'category_slug is invalid.');
    }

    const [rows] = await connection.query('SELECT TOP 1 id FROM categories WHERE slug = ?', [normalizedSlug]);

    if (!rows.length) {
      throw createHttpError(400, 'The specified category_slug does not exist.');
    }

    return rows[0].id;
  }

  if (category.categoryName !== undefined && category.categoryName !== null && category.categoryName !== '') {
    const normalizedName = requireStringField(category.categoryName, 'Category name', 100);
    const categorySlug = normalizeSlug(normalizedName);

    if (!categorySlug) {
      throw createHttpError(400, 'Category name could not be converted into a valid slug.');
    }

    const [existing] = await connection.query('SELECT TOP 1 id FROM categories WHERE slug = ?', [categorySlug]);
    const existingId = existing[0]?.id;

    if (existingId) {
      await connection.query(
        `
        UPDATE categories
        SET name = ?
        WHERE id = ?
        `,
        [normalizedName, existingId],
      );

      return existingId;
    }

    const [insertResult] = await connection.query(
      `
      INSERT INTO categories (name, slug)
      OUTPUT INSERTED.id AS insertId
      VALUES (?, ?)
      `,
      [normalizedName, categorySlug],
    );

    if (!insertResult.insertId) {
      throw createHttpError(500, 'Unable to resolve category.');
    }

    return insertResult.insertId;
  }

  return null;
};

const normalizeVariantsInput = (variantsInput) => {
  if (!Array.isArray(variantsInput)) {
    return [];
  }

  return variantsInput.map((variant, index) => {
    const variantIdRaw = variant?.id ?? variant?.variant_id;
    let variantId = null;

    if (variantIdRaw !== undefined && variantIdRaw !== null && variantIdRaw !== '') {
      variantId = Number(variantIdRaw);
      if (!Number.isInteger(variantId) || variantId <= 0) {
        throw createHttpError(400, `variants[${index}].id must be a valid positive integer.`);
      }
    }

    const stockQuantity = parseNonNegativeInteger(
      variant?.stock_quantity ?? variant?.stockQuantity ?? 0,
      `variants[${index}].stock_quantity`,
    );

    const parsedPriceModifier = Number(variant?.price_modifier ?? variant?.priceModifier ?? 0);

    if (!Number.isFinite(parsedPriceModifier)) {
      throw createHttpError(400, `variants[${index}].price_modifier must be a number.`);
    }

    return {
      id: variantId,
      sku: normalizeSku(variant?.sku),
      size: toOptionalString(variant?.size, 50),
      color: toOptionalString(variant?.color, 50),
      colorHex: toOptionalString(variant?.color_hex ?? variant?.colorHex, 10),
      priceModifier: Number(parsedPriceModifier.toFixed(2)),
      stockQuantity,
      index,
    };
  });
};

const normalizeImagesInput = (imagesInput) => {
  if (!Array.isArray(imagesInput)) {
    return [];
  }

  const normalized = [];
  const seenUrls = new Set();

  for (let index = 0; index < imagesInput.length; index += 1) {
    const image = imagesInput[index];

    let imageUrl = '';
    let isPrimary = false;

    if (typeof image === 'string') {
      imageUrl = toTrimmedString(image);
    } else if (image && typeof image === 'object') {
      imageUrl = toTrimmedString(image.image_url ?? image.imageUrl);
      isPrimary = parseBoolean(image.is_primary ?? image.isPrimary, false);
    }

    if (!imageUrl) {
      continue;
    }

    if (!isValidImageUrl(imageUrl)) {
      throw createHttpError(400, `images[${index}] must be a valid http/https URL.`);
    }

    if (seenUrls.has(imageUrl)) {
      continue;
    }

    seenUrls.add(imageUrl);
    normalized.push({
      imageUrl,
      isPrimary,
      displayOrder: normalized.length,
    });
  }

  if (!normalized.length) {
    return [];
  }

  let primaryIndex = normalized.findIndex((entry) => entry.isPrimary);

  if (primaryIndex < 0) {
    primaryIndex = 0;
  }

  return normalized.map((entry, index) => ({
    imageUrl: entry.imageUrl,
    isPrimary: index === primaryIndex,
    displayOrder: index,
  }));
};

const parseRemovedVariantIds = (value) => {
  if (!Array.isArray(value)) {
    return [];
  }

  const unique = new Set();

  for (const item of value) {
    const parsed = Number(item);

    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw createHttpError(400, 'removed_variant_ids must contain valid positive integer ids.');
    }

    unique.add(parsed);
  }

  return Array.from(unique);
};

const replaceProductImages = async (connection, productId, images) => {
  await connection.query('DELETE FROM product_images WHERE product_id = ?', [productId]);

  for (const image of images) {
    await connection.query(
      `
      INSERT INTO product_images (product_id, variant_id, image_url, is_primary, display_order)
      VALUES (?, NULL, ?, ?, ?)
      `,
      [productId, image.imageUrl, image.isPrimary, image.displayOrder],
    );
  }
};

const upsertProductVariants = async ({
  connection,
  productId,
  productSlug,
  variants,
  existingVariantMap,
}) => {
  const seenPayloadSkus = new Set();

  for (const variant of variants) {
    const existingVariant = variant.id ? existingVariantMap.get(variant.id) : null;

    if (variant.id && !existingVariant) {
      throw createHttpError(400, `Variant id ${variant.id} does not belong to this product.`);
    }

    const skuSeed =
      variant.sku ||
      existingVariant?.sku ||
      buildDefaultSkuSeed({
        productSlug,
        size: variant.size,
        color: variant.color,
        index: variant.index,
      });

    let resolvedSku = await ensureUniqueSku(connection, skuSeed, variant.id || null);

    while (seenPayloadSkus.has(resolvedSku)) {
      resolvedSku = await ensureUniqueSku(connection, withSuffix(resolvedSku, variant.index + 2), variant.id || null);
    }

    seenPayloadSkus.add(resolvedSku);

    if (existingVariant) {
      const nextSize = variant.size !== null ? variant.size : existingVariant.size;
      const nextColor = variant.color !== null ? variant.color : existingVariant.color;
      const nextColorHex = variant.colorHex !== null ? variant.colorHex : existingVariant.color_hex;
      const nextPriceModifier = Number(
        (variant.priceModifier ?? Number(existingVariant.price_modifier || 0)).toFixed(2),
      );
      const nextStock =
        variant.stockQuantity !== undefined && variant.stockQuantity !== null
          ? variant.stockQuantity
          : Number(existingVariant.stock_quantity || 0);

      await connection.query(
        `
        UPDATE product_variants
        SET sku = ?, size = ?, color = ?, color_hex = ?, price_modifier = ?, stock_quantity = ?
        WHERE id = ? AND product_id = ?
        `,
        [
          resolvedSku,
          nextSize,
          nextColor,
          nextColorHex,
          nextPriceModifier,
          nextStock,
          existingVariant.id,
          productId,
        ],
      );

      continue;
    }

    await connection.query(
      `
      INSERT INTO product_variants (
        product_id,
        sku,
        size,
        color,
        color_hex,
        price_modifier,
        stock_quantity
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        productId,
        resolvedSku,
        variant.size,
        variant.color,
        variant.colorHex,
        variant.priceModifier,
        variant.stockQuantity,
      ],
    );
  }
};

const fetchProductsWithRelations = async (connection, productIds) => {
  if (!productIds.length) {
    return [];
  }

  const placeholders = productIds.map(() => '?').join(', ');

  const [products] = await connection.query(
    `
    SELECT
      p.id,
      p.category_id,
      p.name,
      p.slug,
      p.description,
      p.materials_care,
      p.base_price,
      p.is_featured,
      p.created_at,
      p.updated_at,
      c.name AS category_name,
      c.slug AS category_slug,
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
          SELECT COUNT(*)
          FROM product_variants pv
          WHERE pv.product_id = p.id
        ),
        0
      ) AS variant_count,
      COALESCE(
        (
          SELECT TOP 1 pi.image_url
          FROM product_images pi
          WHERE pi.product_id = p.id
          ORDER BY pi.is_primary DESC, pi.display_order ASC, pi.id ASC
        ),
        ''
      ) AS primary_image
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE p.id IN (${placeholders})
    `,
    productIds,
  );

  const [variants] = await connection.query(
    `
    SELECT
      id,
      product_id,
      sku,
      size,
      color,
      color_hex,
      price_modifier,
      stock_quantity
    FROM product_variants
    WHERE product_id IN (${placeholders})
    ORDER BY product_id ASC, id ASC
    `,
    productIds,
  );

  const [images] = await connection.query(
    `
    SELECT
      id,
      product_id,
      variant_id,
      image_url,
      is_primary,
      display_order
    FROM product_images
    WHERE product_id IN (${placeholders})
    ORDER BY product_id ASC, is_primary DESC, display_order ASC, id ASC
    `,
    productIds,
  );

  const variantMap = new Map();

  for (const variant of variants) {
    if (!variantMap.has(variant.product_id)) {
      variantMap.set(variant.product_id, []);
    }

    variantMap.get(variant.product_id).push({
      id: variant.id,
      sku: variant.sku,
      size: variant.size,
      color: variant.color,
      colorHex: variant.color_hex,
      priceModifier: Number(variant.price_modifier || 0),
      stockQuantity: Number(variant.stock_quantity || 0),
    });
  }

  const imageMap = new Map();

  for (const image of images) {
    if (!imageMap.has(image.product_id)) {
      imageMap.set(image.product_id, []);
    }

    imageMap.get(image.product_id).push({
      id: image.id,
      variantId: image.variant_id,
      imageUrl: image.image_url,
      isPrimary: Boolean(image.is_primary),
      displayOrder: Number(image.display_order || 0),
    });
  }

  return products
    .map((product) => ({
      id: product.id,
      categoryId: product.category_id,
      categoryName: product.category_name,
      categorySlug: product.category_slug,
      name: product.name,
      slug: product.slug,
      description: product.description,
      materialsCare: product.materials_care,
      basePrice: Number(product.base_price || 0),
      isFeatured: Boolean(product.is_featured),
      totalStock: Number(product.total_stock || 0),
      variantCount: Number(product.variant_count || 0),
      primaryImage: product.primary_image,
      variants: variantMap.get(product.id) || [],
      images: imageMap.get(product.id) || [],
      createdAt: product.created_at,
      updatedAt: product.updated_at,
    }))
    .sort((left, right) => Number(right.id) - Number(left.id));
};

const fetchProductById = async (connection, productId) => {
  const products = await fetchProductsWithRelations(connection, [productId]);
  return products[0] || null;
};

const normalizeConflictError = (error) => {
  if (error?.statusCode) {
    return error;
  }

  if (error?.number === 2627 || error?.number === 2601) {
    const duplicateMessage = String(error.message || '');

    if (duplicateMessage.includes('UQ_products_slug')) {
      return createHttpError(409, 'A product with this slug already exists.');
    }

    if (duplicateMessage.includes('UQ_product_variants_sku')) {
      return createHttpError(409, 'A product variant SKU already exists.');
    }

    return createHttpError(409, 'Duplicate value detected.');
  }

  return error;
};

export const getAdminProducts = async (request, response, next) => {
  try {
    const db = getDatabase();

    const page = Math.max(1, Number.parseInt(request.query.page || '1', 10) || 1);
    const requestedLimit = Number.parseInt(request.query.limit || '25', 10) || 25;
    const limit = Math.min(MAX_PAGE_LIMIT, Math.max(1, requestedLimit));
    const offset = (page - 1) * limit;
    const search = toOptionalString(request.query.search, 255);

    let whereClause = 'WHERE 1=1';
    const whereParams = [];

    if (search) {
      whereClause += ' AND (p.name LIKE ? OR p.slug LIKE ?)';
      const token = `%${search}%`;
      whereParams.push(token, token);
    }

    const [countRows] = await db.query(
      `
      SELECT COUNT(*) AS total
      FROM products p
      ${whereClause}
      `,
      whereParams,
    );

    const [productRows] = await db.query(
      `
      SELECT p.id
      FROM products p
      ${whereClause}
      ORDER BY p.updated_at DESC, p.id DESC
      OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
      `,
      [...whereParams, offset, limit],
    );

    const productIds = productRows.map((row) => row.id);
    const products = await fetchProductsWithRelations(db, productIds);

    return response.status(200).json({
      success: true,
      data: products,
      meta: {
        totalCount: Number(countRows[0]?.total || 0),
        page,
        limit,
        totalPages: Math.ceil(Number(countRows[0]?.total || 0) / limit) || 1,
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const createAdminProduct = async (request, response, next) => {
  const db = getDatabase();
  const connection = await db.getConnection();
  let transactionStarted = false;

  try {
    const name = requireStringField(request.body.name, 'Product name', 255);
    const description = requireStringField(request.body.description, 'Product description');
    const materialsCare = toOptionalString(request.body.materials_care ?? request.body.materialsCare);
    const basePrice = parseMoney(request.body.base_price ?? request.body.basePrice, 'base_price');
    const isFeatured = parseBoolean(request.body.is_featured ?? request.body.isFeatured, false);

    const requestedSlug =
      toOptionalString(request.body.slug, 255) ||
      toOptionalString(request.body.slugText, 255) ||
      name;
    const categoryId = await resolveCategoryId(connection, request.body);

    const slug = await ensureUniqueProductSlug(connection, requestedSlug);

    let variants = normalizeVariantsInput(request.body.variants);

    if (!variants.length) {
      variants = [
        {
          id: null,
          sku: '',
          size: toOptionalString(request.body.default_size ?? request.body.defaultSize, 50) || 'One Size',
          color: toOptionalString(request.body.default_color ?? request.body.defaultColor, 50) || 'Default',
          colorHex: toOptionalString(request.body.default_color_hex ?? request.body.defaultColorHex, 10),
          priceModifier: 0,
          stockQuantity: parseNonNegativeInteger(
            request.body.stock_quantity ?? request.body.default_stock_quantity ?? 0,
            'stock_quantity',
          ),
          index: 0,
        },
      ];
    }

    const images = normalizeImagesInput(request.body.images);

    await connection.beginTransaction();
    transactionStarted = true;

    const [productInsertResult] = await connection.query(
      `
      INSERT INTO products (
        category_id,
        name,
        slug,
        description,
        materials_care,
        base_price,
        is_featured
      )
      OUTPUT INSERTED.id AS insertId
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [categoryId, name, slug, description, materialsCare, basePrice, isFeatured],
    );

    const productId = productInsertResult.insertId;

    await upsertProductVariants({
      connection,
      productId,
      productSlug: slug,
      variants,
      existingVariantMap: new Map(),
    });

    await replaceProductImages(connection, productId, images);

    await connection.commit();
    transactionStarted = false;

    const created = await fetchProductById(connection, productId);

    return response.status(201).json({
      success: true,
      message: 'Product created successfully.',
      data: created,
    });
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    return next(normalizeConflictError(error));
  } finally {
    connection.release();
  }
};

export const updateAdminProduct = async (request, response, next) => {
  const db = getDatabase();
  const connection = await db.getConnection();
  let transactionStarted = false;

  try {
    const productId = Number(request.params.id);

    if (!Number.isInteger(productId) || productId <= 0) {
      return response.status(400).json({ success: false, message: 'Product id must be a valid positive integer.' });
    }

    const [productRows] = await connection.query(
      `
      SELECT TOP 1 id, category_id, name, slug, description, materials_care, base_price, is_featured
      FROM products
      WHERE id = ?
      `,
      [productId],
    );

    if (!productRows.length) {
      return response.status(404).json({ success: false, message: 'Product not found.' });
    }

    const existingProduct = productRows[0];

    const nextName = hasOwn(request.body, 'name')
      ? requireStringField(request.body.name, 'Product name', 255)
      : existingProduct.name;

    const nextDescription = hasOwn(request.body, 'description')
      ? requireStringField(request.body.description, 'Product description')
      : existingProduct.description;

    const nextMaterialsCare = hasOwn(request.body, 'materials_care') || hasOwn(request.body, 'materialsCare')
      ? toOptionalString(request.body.materials_care ?? request.body.materialsCare)
      : existingProduct.materials_care;

    const nextBasePrice = hasOwn(request.body, 'base_price') || hasOwn(request.body, 'basePrice')
      ? parseMoney(request.body.base_price ?? request.body.basePrice, 'base_price')
      : Number(existingProduct.base_price || 0);

    const nextIsFeatured = hasOwn(request.body, 'is_featured') || hasOwn(request.body, 'isFeatured')
      ? parseBoolean(request.body.is_featured ?? request.body.isFeatured, Boolean(existingProduct.is_featured))
      : Boolean(existingProduct.is_featured);

    const nextCategoryId = hasCategoryInput(request.body)
      ? await resolveCategoryId(connection, request.body)
      : existingProduct.category_id;

    const requestedSlug = hasOwn(request.body, 'slug')
      ? requireStringField(request.body.slug, 'Product slug', 255)
      : existingProduct.slug;

    const nextSlug = await ensureUniqueProductSlug(connection, requestedSlug, productId);

    const shouldUpdateVariants = hasOwn(request.body, 'variants');
    const shouldUpdateImages = hasOwn(request.body, 'images');

    const variants = shouldUpdateVariants ? normalizeVariantsInput(request.body.variants) : [];
    const removedVariantIds = parseRemovedVariantIds(
      request.body.removed_variant_ids ?? request.body.removedVariantIds,
    );
    const images = shouldUpdateImages ? normalizeImagesInput(request.body.images) : [];

    await connection.beginTransaction();
    transactionStarted = true;

    await connection.query(
      `
      UPDATE products
      SET category_id = ?, name = ?, slug = ?, description = ?, materials_care = ?, base_price = ?, is_featured = ?, updated_at = SYSUTCDATETIME()
      WHERE id = ?
      `,
      [
        nextCategoryId,
        nextName,
        nextSlug,
        nextDescription,
        nextMaterialsCare,
        nextBasePrice,
        nextIsFeatured,
        productId,
      ],
    );

    if (shouldUpdateVariants || removedVariantIds.length) {
      const [existingVariants] = await connection.query(
        `
        SELECT id, sku, size, color, color_hex, price_modifier, stock_quantity
        FROM product_variants
        WHERE product_id = ?
        `,
        [productId],
      );

      const existingVariantMap = new Map(existingVariants.map((variant) => [variant.id, variant]));

      if (shouldUpdateVariants) {
        await upsertProductVariants({
          connection,
          productId,
          productSlug: nextSlug,
          variants,
          existingVariantMap,
        });
      }

      if (removedVariantIds.length) {
        for (const variantId of removedVariantIds) {
          if (!existingVariantMap.has(variantId)) {
            throw createHttpError(400, `Variant id ${variantId} does not belong to this product.`);
          }
        }

        const placeholders = removedVariantIds.map(() => '?').join(', ');

        const [orderUsageRows] = await connection.query(
          `
          SELECT COUNT(*) AS total
          FROM order_items
          WHERE variant_id IN (${placeholders})
          `,
          removedVariantIds,
        );

        if (Number(orderUsageRows[0]?.total || 0) > 0) {
          throw createHttpError(
            409,
            'One or more variants are already referenced by orders and cannot be deleted.',
          );
        }

        await connection.query(
          `
          DELETE FROM product_variants
          WHERE product_id = ?
            AND id IN (${placeholders})
          `,
          [productId, ...removedVariantIds],
        );
      }
    }

    if (shouldUpdateImages) {
      await replaceProductImages(connection, productId, images);
    }

    await connection.commit();
    transactionStarted = false;

    const updated = await fetchProductById(connection, productId);

    return response.status(200).json({
      success: true,
      message: 'Product updated successfully.',
      data: updated,
    });
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    return next(normalizeConflictError(error));
  } finally {
    connection.release();
  }
};

export const deleteAdminProduct = async (request, response, next) => {
  const db = getDatabase();
  const connection = await db.getConnection();
  let transactionStarted = false;

  try {
    const productId = Number(request.params.id);

    if (!Number.isInteger(productId) || productId <= 0) {
      return response.status(400).json({ success: false, message: 'Product id must be a valid positive integer.' });
    }

    const [productRows] = await connection.query('SELECT TOP 1 id, name FROM products WHERE id = ?', [productId]);

    if (!productRows.length) {
      return response.status(404).json({ success: false, message: 'Product not found.' });
    }

    const [orderUsageRows] = await connection.query(
      `
      SELECT COUNT(*) AS total
      FROM order_items oi
      INNER JOIN product_variants pv ON pv.id = oi.variant_id
      WHERE pv.product_id = ?
      `,
      [productId],
    );

    if (Number(orderUsageRows[0]?.total || 0) > 0) {
      return response.status(409).json({
        success: false,
        message:
          'This product has historical order records and cannot be deleted safely. Archive it instead.',
      });
    }

    await connection.beginTransaction();
    transactionStarted = true;

    await connection.query('DELETE FROM products WHERE id = ?', [productId]);

    await connection.commit();
    transactionStarted = false;

    return response.status(200).json({
      success: true,
      message: 'Product deleted successfully.',
    });
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    return next(normalizeConflictError(error));
  } finally {
    connection.release();
  }
};
