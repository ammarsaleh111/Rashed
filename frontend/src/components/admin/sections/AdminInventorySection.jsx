import React, { useEffect, useMemo, useState } from 'react';

import {
  createAdminProduct,
  deleteAdminProduct,
  getAdminProducts,
  updateAdminProduct,
} from '../../../services/api/admin.js';

const createEmptyVariant = () => ({
  id: null,
  sku: '',
  size: 'One Size',
  color: 'Default',
  colorHex: '',
  priceModifier: '0',
  stockQuantity: '0',
});

const createEmptyForm = () => ({
  name: '',
  slug: '',
  description: '',
  materialsCare: '',
  basePrice: '',
  categoryName: '',
  isFeatured: false,
  variants: [createEmptyVariant()],
  images: [''],
});

const normalizeProductToForm = (product) => ({
  name: product?.name || '',
  slug: product?.slug || '',
  description: product?.description || '',
  materialsCare: product?.materialsCare || '',
  basePrice: String(product?.basePrice ?? ''),
  categoryName: product?.categoryName || '',
  isFeatured: Boolean(product?.isFeatured),
  variants:
    Array.isArray(product?.variants) && product.variants.length
      ? product.variants.map((variant) => ({
          id: variant.id,
          sku: variant.sku || '',
          size: variant.size || '',
          color: variant.color || '',
          colorHex: variant.colorHex || '',
          priceModifier: String(variant.priceModifier ?? 0),
          stockQuantity: String(variant.stockQuantity ?? 0),
        }))
      : [createEmptyVariant()],
  images:
    Array.isArray(product?.images) && product.images.length
      ? product.images.map((image) => image.imageUrl || '').filter(Boolean)
      : [''],
});

const formatDateTime = (value) => {
  if (!value) {
    return '--';
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return '--';
  }

  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const parseNonNegativeNumber = (value, fallback = 0) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return parsed;
};

const createPayloadFromForm = ({ form, removedVariantIds, isEdit }) => {
  const payload = {
    name: String(form.name || '').trim(),
    slug: String(form.slug || '').trim(),
    description: String(form.description || '').trim(),
    materials_care: String(form.materialsCare || '').trim(),
    base_price: parseNonNegativeNumber(form.basePrice, NaN),
    category_name: String(form.categoryName || '').trim(),
    is_featured: Boolean(form.isFeatured),
  };

  if (!payload.name) {
    throw new Error('Product name is required.');
  }

  if (!payload.description) {
    throw new Error('Description is required.');
  }

  if (!Number.isFinite(payload.base_price)) {
    throw new Error('Base price must be a valid number.');
  }

  const normalizedVariants = Array.isArray(form.variants)
    ? form.variants
        .map((variant) => {
          const stockQuantity = parseNonNegativeNumber(variant.stockQuantity, 0);
          const priceModifier = parseNonNegativeNumber(variant.priceModifier, 0);

          return {
            id: variant.id || undefined,
            sku: String(variant.sku || '').trim(),
            size: String(variant.size || '').trim() || null,
            color: String(variant.color || '').trim() || null,
            color_hex: String(variant.colorHex || '').trim() || null,
            price_modifier: Number(priceModifier.toFixed(2)),
            stock_quantity: Math.round(stockQuantity),
          };
        })
        .filter(
          (variant) =>
            variant.size ||
            variant.color ||
            variant.stock_quantity > 0 ||
            variant.price_modifier !== 0 ||
            variant.sku,
        )
    : [];

  payload.variants = normalizedVariants.length
    ? normalizedVariants
    : [
        {
          size: 'One Size',
          color: 'Default',
          stock_quantity: 0,
          price_modifier: 0,
        },
      ];

  const normalizedImages = Array.isArray(form.images)
    ? form.images.map((url) => String(url || '').trim()).filter(Boolean)
    : [];

  payload.images = normalizedImages;

  if (isEdit && removedVariantIds.length) {
    payload.removed_variant_ids = removedVariantIds;
  }

  if (!payload.slug) {
    delete payload.slug;
  }

  if (!payload.materials_care) {
    delete payload.materials_care;
  }

  if (!payload.category_name) {
    delete payload.category_name;
  }

  return payload;
};

const AdminInventorySection = ({ inventory, onInventoryMutated }) => {
  const [products, setProducts] = useState([]);
  const [meta, setMeta] = useState({
    totalCount: 0,
    page: 1,
    limit: 12,
    totalPages: 1,
  });
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [formData, setFormData] = useState(createEmptyForm);
  const [removedVariantIds, setRemovedVariantIds] = useState([]);

  const [productPendingDelete, setProductPendingDelete] = useState(null);

  const metrics = useMemo(
    () => [
      { label: 'Products', value: Number(inventory?.totalProducts || 0) },
      { label: 'Variants / SKUs', value: Number(inventory?.totalVariants || 0) },
      { label: 'Low Stock Variants', value: Number(inventory?.lowStockVariants || 0) },
      { label: 'Featured Products', value: Number(inventory?.featuredProducts || 0) },
    ],
    [inventory],
  );

  useEffect(() => {
    const loadProducts = async () => {
      setIsLoading(true);
      setLoadError('');

      try {
        const response = await getAdminProducts({
          page,
          limit: meta.limit,
          search: searchQuery.trim() || undefined,
        });

        setProducts(Array.isArray(response?.data) ? response.data : []);
        setMeta((previous) => ({
          ...previous,
          totalCount: Number(response?.meta?.totalCount || 0),
          page: Number(response?.meta?.page || page),
          limit: Number(response?.meta?.limit || previous.limit),
          totalPages: Math.max(1, Number(response?.meta?.totalPages || 1)),
        }));
      } catch (error) {
        setLoadError(error?.response?.data?.message || 'Unable to load products from the database.');
        setProducts([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadProducts();
  }, [page, searchQuery, meta.limit]);

  const refreshProducts = async () => {
    setIsLoading(true);
    setLoadError('');

    try {
      const response = await getAdminProducts({
        page,
        limit: meta.limit,
        search: searchQuery.trim() || undefined,
      });

      setProducts(Array.isArray(response?.data) ? response.data : []);
      setMeta((previous) => ({
        ...previous,
        totalCount: Number(response?.meta?.totalCount || 0),
        page: Number(response?.meta?.page || page),
        limit: Number(response?.meta?.limit || previous.limit),
        totalPages: Math.max(1, Number(response?.meta?.totalPages || 1)),
      }));
    } catch (error) {
      setLoadError(error?.response?.data?.message || 'Unable to load products from the database.');
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingProductId(null);
    setFormData(createEmptyForm());
    setRemovedVariantIds([]);
  };

  const openCreateForm = () => {
    setActionMessage('');
    setLoadError('');
    setEditingProductId(null);
    setRemovedVariantIds([]);
    setFormData(createEmptyForm());
    setIsFormOpen(true);
  };

  const openEditForm = (product) => {
    setActionMessage('');
    setLoadError('');
    setEditingProductId(product.id);
    setRemovedVariantIds([]);
    setFormData(normalizeProductToForm(product));
    setIsFormOpen(true);
  };

  const updateFormField = (field, value) => {
    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const addVariant = () => {
    setFormData((previous) => ({
      ...previous,
      variants: [...previous.variants, createEmptyVariant()],
    }));
  };

  const updateVariant = (index, field, value) => {
    setFormData((previous) => ({
      ...previous,
      variants: previous.variants.map((variant, variantIndex) =>
        variantIndex === index
          ? {
              ...variant,
              [field]: value,
            }
          : variant,
      ),
    }));
  };

  const removeVariant = (index) => {
    setFormData((previous) => {
      if (previous.variants.length === 1) {
        return previous;
      }

      const variant = previous.variants[index];

      if (variant?.id) {
        setRemovedVariantIds((current) =>
          current.includes(variant.id) ? current : [...current, variant.id],
        );
      }

      return {
        ...previous,
        variants: previous.variants.filter((_, variantIndex) => variantIndex !== index),
      };
    });
  };

  const addImage = () => {
    setFormData((previous) => ({
      ...previous,
      images: [...previous.images, ''],
    }));
  };

  const updateImage = (index, value) => {
    setFormData((previous) => ({
      ...previous,
      images: previous.images.map((image, imageIndex) => (imageIndex === index ? value : image)),
    }));
  };

  const removeImage = (index) => {
    setFormData((previous) => ({
      ...previous,
      images: previous.images.filter((_, imageIndex) => imageIndex !== index),
    }));
  };

  const handleSaveProduct = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setActionMessage('');
    setLoadError('');

    try {
      const isEdit = Boolean(editingProductId);
      const payload = createPayloadFromForm({
        form: formData,
        removedVariantIds,
        isEdit,
      });

      if (isEdit) {
        await updateAdminProduct(editingProductId, payload);
        setActionMessage('Product updated successfully.');
      } else {
        await createAdminProduct(payload);
        setActionMessage('Product created successfully.');
      }

      closeForm();

      if (typeof onInventoryMutated === 'function') {
        await onInventoryMutated();
      }

      await refreshProducts();
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Unable to save product. Please verify your inputs and try again.';
      setLoadError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!productPendingDelete?.id) {
      return;
    }

    setIsDeleting(true);
    setActionMessage('');
    setLoadError('');

    try {
      await deleteAdminProduct(productPendingDelete.id);
      setActionMessage('Product deleted successfully.');
      setProductPendingDelete(null);

      if (typeof onInventoryMutated === 'function') {
        await onInventoryMutated();
      }

      const shouldMoveToPreviousPage = products.length === 1 && page > 1;
      if (shouldMoveToPreviousPage) {
        setPage((current) => Math.max(1, current - 1));
      } else {
        await refreshProducts();
      }
    } catch (error) {
      setLoadError(error?.response?.data?.message || 'Unable to delete this product.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="mt-7 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-5 border-b border-white/10 pb-6 mb-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-white font-display font-bold text-3xl uppercase tracking-tighter">
            Inventory Management
          </h2>
          <p className="text-gray-400 text-[10px] uppercase tracking-widest mt-2">
            Full catalog CRUD synced with MySQL
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setPage(1);
            }}
            placeholder="Search by product or slug"
            className="w-64 max-w-full bg-[#121212] border border-white/10 px-4 py-3 text-[11px] tracking-wider uppercase text-white outline-none focus:border-neon"
          />
          <button
            type="button"
            onClick={openCreateForm}
            className="bg-neon text-black text-[10px] font-bold px-6 py-3 uppercase tracking-widest hover:bg-[#4ade80] transition-colors"
          >
            Add Product
          </button>
        </div>
      </div>

      {actionMessage && (
        <p className="mb-4 text-[11px] uppercase tracking-[0.18em] text-neon">{actionMessage}</p>
      )}

      {loadError && (
        <p className="mb-4 text-[11px] uppercase tracking-[0.18em] text-yellow-400">{loadError}</p>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="bg-[#111] border border-white/5 p-6">
            <p className="text-gray-500 text-[10px] uppercase tracking-widest mb-3 font-bold">
              {metric.label}
            </p>
            <p className="text-4xl font-display font-black tracking-tighter text-white">{metric.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 border border-white/5 bg-[#101010] overflow-x-auto">
        <table className="w-full min-w-[980px]">
          <thead>
            <tr className="border-b border-white/5 text-[10px] uppercase tracking-[0.18em] text-white/45">
              <th className="px-5 py-4 text-left">Product</th>
              <th className="px-5 py-4 text-left">Category</th>
              <th className="px-5 py-4 text-left">Price</th>
              <th className="px-5 py-4 text-left">Stock</th>
              <th className="px-5 py-4 text-left">Variants</th>
              <th className="px-5 py-4 text-left">Updated</th>
              <th className="px-5 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-sm text-white/60">
                  Loading products...
                </td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-sm text-white/60">
                  No products found.
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id} className="border-b border-white/5 text-sm text-white/90">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-white">{product.name}</p>
                    <p className="text-[10px] uppercase tracking-widest text-white/45 mt-1">/{product.slug}</p>
                  </td>
                  <td className="px-5 py-4 text-white/75">{product.categoryName || 'Uncategorized'}</td>
                  <td className="px-5 py-4">${Number(product.basePrice || 0).toFixed(2)}</td>
                  <td className="px-5 py-4">{Number(product.totalStock || 0)}</td>
                  <td className="px-5 py-4">{Number(product.variantCount || 0)}</td>
                  <td className="px-5 py-4 text-white/65">{formatDateTime(product.updatedAt)}</td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEditForm(product)}
                        className="bg-[#1f1f1f] border border-white/15 hover:border-neon text-white text-[10px] px-4 py-2 uppercase tracking-widest transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setProductPendingDelete(product)}
                        className="bg-[#2a1313] border border-red-500/40 hover:border-red-400 text-red-200 text-[10px] px-4 py-2 uppercase tracking-widest transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 text-[11px] uppercase tracking-[0.16em] text-white/55">
        <p>
          Showing {products.length} of {meta.totalCount} products
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1 || isLoading}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            className="bg-[#1a1a1a] border border-white/10 px-4 py-2 text-[10px] font-bold text-white disabled:opacity-35 disabled:cursor-not-allowed"
          >
            Prev
          </button>
          <span className="px-2 text-[10px] text-white/60">
            Page {page} / {Math.max(1, meta.totalPages)}
          </span>
          <button
            type="button"
            disabled={page >= meta.totalPages || isLoading}
            onClick={() => setPage((current) => Math.min(meta.totalPages, current + 1))}
            className="bg-[#1a1a1a] border border-white/10 px-4 py-2 text-[10px] font-bold text-white disabled:opacity-35 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      </div>

      <div className="mt-6 bg-[#111] border border-white/5 p-8">
        <p className="text-[11px] uppercase tracking-[0.18em] text-white/65">Live Sync Status</p>
        <p className="mt-3 text-sm text-white/70">
          Catalog actions here write directly to MySQL through admin product APIs and appear in the public shop.
        </p>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-sm overflow-y-auto px-4 py-8">
          <div className="mx-auto w-full max-w-5xl border border-white/10 bg-[#0f0f0f] p-6 md:p-8">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-neon font-bold">
                  {editingProductId ? 'Update Product' : 'Create Product'}
                </p>
                <h3 className="mt-2 text-2xl font-display font-black tracking-tight uppercase text-white">
                  {editingProductId ? 'Edit Catalog Item' : 'New Catalog Item'}
                </h3>
              </div>
              <button
                type="button"
                onClick={closeForm}
                className="bg-[#1a1a1a] border border-white/15 px-4 py-2 text-[10px] uppercase tracking-widest text-white hover:border-white"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-7">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="block text-[10px] uppercase tracking-widest text-white/45">Name</span>
                  <input
                    value={formData.name}
                    onChange={(event) => updateFormField('name', event.target.value)}
                    type="text"
                    className="w-full bg-[#1a1a1a] border border-white/10 px-4 py-3 text-white outline-none focus:border-neon"
                    required
                  />
                </label>

                <label className="space-y-2">
                  <span className="block text-[10px] uppercase tracking-widest text-white/45">Slug (optional)</span>
                  <input
                    value={formData.slug}
                    onChange={(event) => updateFormField('slug', event.target.value)}
                    type="text"
                    className="w-full bg-[#1a1a1a] border border-white/10 px-4 py-3 text-white outline-none focus:border-neon"
                    placeholder="auto-generated-if-empty"
                  />
                </label>

                <label className="space-y-2">
                  <span className="block text-[10px] uppercase tracking-widest text-white/45">Base Price</span>
                  <input
                    value={formData.basePrice}
                    onChange={(event) => updateFormField('basePrice', event.target.value)}
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full bg-[#1a1a1a] border border-white/10 px-4 py-3 text-white outline-none focus:border-neon"
                    required
                  />
                </label>

                <label className="space-y-2">
                  <span className="block text-[10px] uppercase tracking-widest text-white/45">Category</span>
                  <input
                    value={formData.categoryName}
                    onChange={(event) => updateFormField('categoryName', event.target.value)}
                    type="text"
                    className="w-full bg-[#1a1a1a] border border-white/10 px-4 py-3 text-white outline-none focus:border-neon"
                    placeholder="Performance"
                  />
                </label>
              </div>

              <label className="space-y-2 block">
                <span className="block text-[10px] uppercase tracking-widest text-white/45">Description</span>
                <textarea
                  value={formData.description}
                  onChange={(event) => updateFormField('description', event.target.value)}
                  className="w-full min-h-[120px] bg-[#1a1a1a] border border-white/10 px-4 py-3 text-white outline-none focus:border-neon"
                  required
                />
              </label>

              <label className="space-y-2 block">
                <span className="block text-[10px] uppercase tracking-widest text-white/45">Materials & Care</span>
                <textarea
                  value={formData.materialsCare}
                  onChange={(event) => updateFormField('materialsCare', event.target.value)}
                  className="w-full min-h-[90px] bg-[#1a1a1a] border border-white/10 px-4 py-3 text-white outline-none focus:border-neon"
                  placeholder="Optional"
                />
              </label>

              <label className="inline-flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isFeatured}
                  onChange={(event) => updateFormField('isFeatured', event.target.checked)}
                  className="h-4 w-4 accent-lime-400"
                />
                <span className="text-[11px] uppercase tracking-widest text-white/70">Featured Product</span>
              </label>

              <div className="border border-white/10 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-neon font-bold">Variants</p>
                  <button
                    type="button"
                    onClick={addVariant}
                    className="bg-[#1f1f1f] border border-white/15 px-3 py-2 text-[10px] uppercase tracking-widest text-white hover:border-neon"
                  >
                    Add Variant
                  </button>
                </div>

                <div className="space-y-3">
                  {formData.variants.map((variant, index) => (
                    <div key={variant.id || `variant-${index}`} className="grid gap-3 md:grid-cols-12">
                      <input
                        value={variant.size}
                        onChange={(event) => updateVariant(index, 'size', event.target.value)}
                        type="text"
                        placeholder="Size"
                        className="md:col-span-2 bg-[#1a1a1a] border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-neon"
                      />
                      <input
                        value={variant.color}
                        onChange={(event) => updateVariant(index, 'color', event.target.value)}
                        type="text"
                        placeholder="Color"
                        className="md:col-span-2 bg-[#1a1a1a] border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-neon"
                      />
                      <input
                        value={variant.colorHex}
                        onChange={(event) => updateVariant(index, 'colorHex', event.target.value)}
                        type="text"
                        placeholder="#000000"
                        className="md:col-span-2 bg-[#1a1a1a] border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-neon"
                      />
                      <input
                        value={variant.priceModifier}
                        onChange={(event) => updateVariant(index, 'priceModifier', event.target.value)}
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Modifier"
                        className="md:col-span-2 bg-[#1a1a1a] border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-neon"
                      />
                      <input
                        value={variant.stockQuantity}
                        onChange={(event) => updateVariant(index, 'stockQuantity', event.target.value)}
                        type="number"
                        min="0"
                        step="1"
                        placeholder="Stock"
                        className="md:col-span-2 bg-[#1a1a1a] border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-neon"
                      />
                      <button
                        type="button"
                        onClick={() => removeVariant(index)}
                        disabled={formData.variants.length === 1}
                        className="md:col-span-2 bg-[#2a1313] border border-red-500/40 px-3 py-2 text-[10px] uppercase tracking-widest text-red-200 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Remove
                      </button>
                      <input
                        value={variant.sku}
                        onChange={(event) => updateVariant(index, 'sku', event.target.value)}
                        type="text"
                        placeholder="SKU (optional)"
                        className="md:col-span-12 bg-[#151515] border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-neon"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="border border-white/10 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-neon font-bold">Image URLs</p>
                  <button
                    type="button"
                    onClick={addImage}
                    className="bg-[#1f1f1f] border border-white/15 px-3 py-2 text-[10px] uppercase tracking-widest text-white hover:border-neon"
                  >
                    Add Image
                  </button>
                </div>

                <div className="space-y-3">
                  {formData.images.map((image, index) => (
                    <div key={`image-${index}`} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_110px]">
                      <input
                        value={image}
                        onChange={(event) => updateImage(index, event.target.value)}
                        type="url"
                        placeholder="https://example.com/image.jpg"
                        className="bg-[#1a1a1a] border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-neon"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        className="bg-[#2a1313] border border-red-500/40 px-3 py-2 text-[10px] uppercase tracking-widest text-red-200"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeForm}
                  className="bg-[#1a1a1a] border border-white/15 px-5 py-3 text-[10px] uppercase tracking-widest text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="bg-neon text-black font-bold px-6 py-3 text-[10px] uppercase tracking-widest hover:bg-[#4ade80] transition-colors disabled:opacity-45 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Saving...' : editingProductId ? 'Update Product' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {productPendingDelete && (
        <div className="fixed inset-0 z-[130] bg-black/75 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="w-full max-w-lg border border-white/10 bg-[#111] p-6">
            <p className="text-[10px] uppercase tracking-[0.18em] text-red-300 font-bold">Confirm Delete</p>
            <h4 className="mt-3 text-xl font-display font-black tracking-tight text-white uppercase">
              Delete {productPendingDelete.name}?
            </h4>
            <p className="mt-4 text-sm text-white/70 leading-6">
              This action permanently removes the product from the catalog. It will also disappear from shop pages.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setProductPendingDelete(null)}
                className="bg-[#1a1a1a] border border-white/15 px-5 py-3 text-[10px] uppercase tracking-widest text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-500 text-white px-5 py-3 text-[10px] uppercase tracking-widest disabled:opacity-45 disabled:cursor-not-allowed"
              >
                {isDeleting ? 'Deleting...' : 'Delete Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminInventorySection;
