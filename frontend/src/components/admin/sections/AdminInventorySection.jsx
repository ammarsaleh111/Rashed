import React, { useEffect, useMemo, useState } from 'react';

import {
  createAdminProduct,
  deleteAdminProduct,
  getAdminProducts,
  updateAdminProduct,
} from '../../../services/api/admin.js';

const categoryOptions = [
  'Football T-shirts',
  'Football Boots',
  'Football Shorts',
  'Football Balls',
  'Accessories',
];

const colorOptions = [
  'Black', 'White', 'Gray', 'Silver', 'Gold',
  'Red','Blue', 'Green',
  'Yellow', 'Orange', 
  'Purple', 'Pink', 'Beige', 'Brown'
];

const createEmptyVariant = () => ({
  id: null,
  size: 'L',
  color: 'Black',
});

const createEmptyForm = () => ({
  name: '',
  description: '',
  basePrice: '',
  categoryName: categoryOptions[0],
  variants: [createEmptyVariant()],
  imageUrl: '',
});

const normalizeProductToForm = (product) => ({
  name: product?.name || '',
  description: product?.description || '',
  basePrice: String(product?.basePrice ?? ''),
  categoryName: categoryOptions.includes(product?.categoryName) ? product.categoryName : categoryOptions[0],
  variants:
    Array.isArray(product?.variants) && product.variants.length
      ? product.variants.map((variant) => ({
          id: variant.id,
          size: variant.size || 'One Size',
          color: colorOptions.includes(variant.color) ? variant.color : 'Black',
        }))
      : [createEmptyVariant()],
  imageUrl:
    Array.isArray(product?.images) && product.images.length
      ? product.images.find((image) => image.isPrimary)?.imageUrl || product.images[0]?.imageUrl || ''
      : product?.primaryImage || '',
});

const formatDateTime = (value) => {
  if (!value) return '--';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '--';
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const parseNonNegativeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

const createPayloadFromForm = ({ form, removedVariantIds, isEdit }) => {
  const payload = {
    name: String(form.name || '').trim(),
    description: String(form.description || '').trim(),
    base_price: parseNonNegativeNumber(form.basePrice, NaN),
    category_name: String(form.categoryName || '').trim(),
    variants: form.variants.map((variant) => ({
      id: variant.id || undefined,
      size: String(variant.size || '').trim() || 'One Size',
      color: colorOptions.includes(variant.color) ? variant.color : 'Black',
      color_hex: null,
      price_modifier: 0,
      stock_quantity: 100,
    })),
    images: form.imageUrl ? [{ image_url: form.imageUrl, is_primary: true }] : [],
  };

  if (!payload.name) throw new Error('Product name is required.');
  if (!payload.description) throw new Error('Description is required.');
  if (!Number.isFinite(payload.base_price)) throw new Error('Price must be a valid number.');
  if (!payload.category_name) throw new Error('Category is required.');

  if (!payload.variants.length) {
    payload.variants = [{ size: 'One Size', color: 'Black', price_modifier: 0, stock_quantity: 100 }];
  }

  if (isEdit && removedVariantIds.length) {
    payload.removed_variant_ids = removedVariantIds;
  }

  return payload;
};

const AdminInventorySection = ({ inventory, onInventoryMutated }) => {
  const [products, setProducts] = useState([]);
  const [meta, setMeta] = useState({ totalCount: 0, page: 1, limit: 12, totalPages: 1 });
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

  const refreshProducts = async () => {
    setIsLoading(true);
    setLoadError('');

    try {
      const response = await getAdminProducts({ page, limit: meta.limit, search: searchQuery.trim() || undefined });
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

  useEffect(() => {
    refreshProducts();
  }, [page, searchQuery]);

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
    setFormData((previous) => ({ ...previous, [field]: value }));
  };

  const addVariant = () => {
    setFormData((previous) => ({ ...previous, variants: [...previous.variants, createEmptyVariant()] }));
  };

  const updateVariant = (index, field, value) => {
    setFormData((previous) => ({
      ...previous,
      variants: previous.variants.map((variant, variantIndex) =>
        variantIndex === index ? { ...variant, [field]: value } : variant,
      ),
    }));
  };

  const removeVariant = (index) => {
    setFormData((previous) => {
      if (previous.variants.length === 1) return previous;
      const variant = previous.variants[index];
      if (variant?.id) {
        setRemovedVariantIds((current) => (current.includes(variant.id) ? current : [...current, variant.id]));
      }
      return { ...previous, variants: previous.variants.filter((_, variantIndex) => variantIndex !== index) };
    });
  };

  const handleSaveProduct = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setActionMessage('');
    setLoadError('');

    try {
      const isEdit = Boolean(editingProductId);
      const payload = createPayloadFromForm({ form: formData, removedVariantIds, isEdit });

      if (isEdit) {
        await updateAdminProduct(editingProductId, payload);
        setActionMessage('Product updated successfully.');
      } else {
        await createAdminProduct(payload);
        setActionMessage('Product created successfully.');
      }

      closeForm();
      if (typeof onInventoryMutated === 'function') await onInventoryMutated();
      await refreshProducts();
    } catch (error) {
      setLoadError(error?.response?.data?.message || error?.message || 'Unable to save product.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!productPendingDelete?.id) return;
    setIsDeleting(true);
    setActionMessage('');
    setLoadError('');

    try {
      await deleteAdminProduct(productPendingDelete.id);
      setActionMessage('Product deleted successfully.');
      setProductPendingDelete(null);
      if (typeof onInventoryMutated === 'function') await onInventoryMutated();
      if (products.length === 1 && page > 1) setPage((current) => Math.max(1, current - 1));
      else await refreshProducts();
    } catch (error) {
      setLoadError(error?.response?.data?.message || 'Unable to delete this product.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="mt-7 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 flex flex-col gap-5 border-b border-white/10 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="font-display text-3xl font-bold uppercase tracking-tighter text-white">Inventory Management</h2>
          <p className="mt-2 text-[10px] uppercase tracking-widest text-gray-400">Simple catalog CRUD synced with MySQL</p>
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
            className="w-64 max-w-full border border-white/10 bg-[#121212] px-4 py-3 text-[11px] uppercase tracking-wider text-white outline-none focus:border-neon"
          />
          <button type="button" onClick={openCreateForm} className="bg-neon px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-black transition-colors hover:bg-[#4ade80]">
            Add Product
          </button>
        </div>
      </div>

      {actionMessage && <p className="mb-4 text-[11px] uppercase tracking-[0.18em] text-neon">{actionMessage}</p>}
      {loadError && <p className="mb-4 text-[11px] uppercase tracking-[0.18em] text-yellow-400">{loadError}</p>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="border border-white/5 bg-[#111] p-6">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-gray-500">{metric.label}</p>
            <p className="font-display text-4xl font-black tracking-tighter text-white">{metric.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 overflow-x-auto border border-white/5 bg-[#101010]">
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
              <tr><td colSpan={7} className="px-5 py-10 text-center text-sm text-white/60">Loading products...</td></tr>
            ) : products.length === 0 ? (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-sm text-white/60">No products found.</td></tr>
            ) : (
              products.map((product) => (
                <tr key={product.id} className="border-b border-white/5 text-sm text-white/90">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-white">{product.name}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-widest text-white/45">/{product.slug}</p>
                  </td>
                  <td className="px-5 py-4 text-white/75">{product.categoryName || 'Uncategorized'}</td>
                  <td className="px-5 py-4">{Number(product.basePrice || 0).toFixed(2)} EGP</td>
                  <td className="px-5 py-4">{Number(product.totalStock || 0)}</td>
                  <td className="px-5 py-4">{Number(product.variantCount || 0)}</td>
                  <td className="px-5 py-4 text-white/65">{formatDateTime(product.updatedAt)}</td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => openEditForm(product)} className="border border-white/15 bg-[#1f1f1f] px-4 py-2 text-[10px] uppercase tracking-widest text-white transition-colors hover:border-neon">Edit</button>
                      <button type="button" onClick={() => setProductPendingDelete(product)} className="border border-red-500/40 bg-[#2a1313] px-4 py-2 text-[10px] uppercase tracking-widest text-red-200 transition-colors hover:border-red-400">Delete</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4 text-[11px] uppercase tracking-[0.16em] text-white/55">
        <p>Showing {products.length} of {meta.totalCount} products</p>
        <div className="flex items-center gap-2">
          <button type="button" disabled={page <= 1 || isLoading} onClick={() => setPage((current) => Math.max(1, current - 1))} className="border border-white/10 bg-[#1a1a1a] px-4 py-2 text-[10px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-35">Prev</button>
          <span className="px-2 text-[10px] text-white/60">Page {page} / {Math.max(1, meta.totalPages)}</span>
          <button type="button" disabled={page >= meta.totalPages || isLoading} onClick={() => setPage((current) => Math.min(meta.totalPages, current + 1))} className="border border-white/10 bg-[#1a1a1a] px-4 py-2 text-[10px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-35">Next</button>
        </div>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-[120] overflow-y-auto bg-black/80 px-4 py-8 backdrop-blur-sm">
          <div className="mx-auto w-full max-w-4xl border border-white/10 bg-[#0f0f0f] p-6 md:p-8">
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-neon">{editingProductId ? 'Update Product' : 'Create Product'}</p>
                <h3 className="mt-2 font-display text-2xl font-black uppercase tracking-tight text-white">{editingProductId ? 'Edit Catalog Item' : 'New Catalog Item'}</h3>
              </div>
              <button type="button" onClick={closeForm} className="border border-white/15 bg-[#1a1a1a] px-4 py-2 text-[10px] uppercase tracking-widest text-white hover:border-white">Close</button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-7">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="block text-[10px] uppercase tracking-widest text-white/45">Name</span>
                  <input value={formData.name} onChange={(event) => updateFormField('name', event.target.value)} type="text" className="w-full border border-white/10 bg-[#1a1a1a] px-4 py-3 text-white outline-none focus:border-neon" required />
                </label>
                <label className="space-y-2">
                  <span className="block text-[10px] uppercase tracking-widest text-white/45">Price</span>
                  <input value={formData.basePrice} onChange={(event) => updateFormField('basePrice', event.target.value)} type="number" min="0" step="0.01" className="w-full border border-white/10 bg-[#1a1a1a] px-4 py-3 text-white outline-none focus:border-neon" required />
                </label>
                <label className="space-y-2 md:col-span-2">
                  <span className="block text-[10px] uppercase tracking-widest text-white/45">Category</span>
                  <select value={formData.categoryName} onChange={(event) => updateFormField('categoryName', event.target.value)} className="w-full border border-white/10 bg-[#1a1a1a] px-4 py-3 text-white outline-none focus:border-neon" required>
                    {categoryOptions.map((category) => <option key={category} value={category}>{category}</option>)}
                  </select>
                </label>
              </div>

              <label className="block space-y-2">
                <span className="block text-[10px] uppercase tracking-widest text-white/45">Description</span>
                <textarea value={formData.description} onChange={(event) => updateFormField('description', event.target.value)} className="min-h-[120px] w-full border border-white/10 bg-[#1a1a1a] px-4 py-3 text-white outline-none focus:border-neon" required />
              </label>

              <div className="border border-white/10 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-neon">Variants</p>
                  <button type="button" onClick={addVariant} className="border border-white/15 bg-[#1f1f1f] px-3 py-2 text-[10px] uppercase tracking-widest text-white hover:border-neon">Add Variant</button>
                </div>
                <div className="space-y-3">
                  {formData.variants.map((variant, index) => (
                    <div key={variant.id || `variant-${index}`} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_110px]">
                      <input value={variant.size} onChange={(event) => updateVariant(index, 'size', event.target.value)} type="text" placeholder="Size" className="border border-white/10 bg-[#1a1a1a] px-3 py-2 text-sm text-white outline-none focus:border-neon" />
                      <select value={variant.color} onChange={(event) => updateVariant(index, 'color', event.target.value)} className="border border-white/10 bg-[#1a1a1a] px-3 py-2 text-sm text-white outline-none focus:border-neon">
                        {colorOptions.map((color) => <option key={color} value={color}>{color}</option>)}
                      </select>
                      <button type="button" onClick={() => removeVariant(index)} disabled={formData.variants.length === 1} className="border border-red-500/40 bg-[#2a1313] px-3 py-2 text-[10px] uppercase tracking-widest text-red-200 disabled:cursor-not-allowed disabled:opacity-40">Remove</button>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-[10px] uppercase tracking-widest text-white/40">Stock defaults to 100 and price modifier defaults to 0 for every variant.</p>
              </div>

              <div className="border border-white/10 p-4">
                <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.18em] text-neon">Image Link</p>
                <div className="space-y-4">
                  <label className="block space-y-2">
                    <span className="block text-[10px] uppercase tracking-widest text-white/45">Image URL</span>
                    <input
                      value={formData.imageUrl}
                      onChange={(event) => updateFormField('imageUrl', event.target.value)}
                      type="url"
                      placeholder="https://example.com/product-image.jpg"
                      className="w-full border border-white/10 bg-[#1a1a1a] px-4 py-3 text-white outline-none focus:border-neon"
                    />
                  </label>
                  {formData.imageUrl ? (
                    <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)] md:items-center">
                      <img src={formData.imageUrl} alt="Product preview" className="h-44 w-full border border-white/10 object-cover md:h-36" />
                      <div className="min-w-0">
                        <p className="truncate text-xs text-white/65">{formData.imageUrl}</p>
                        <button type="button" onClick={() => updateFormField('imageUrl', '')} className="mt-4 border border-red-500/40 bg-[#2a1313] px-4 py-2 text-[10px] uppercase tracking-widest text-red-200">
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-white/45">Paste a direct image link here. The product will use that URL in the gallery.</p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3">
                <button type="button" onClick={closeForm} className="border border-white/15 bg-[#1a1a1a] px-5 py-3 text-[10px] uppercase tracking-widest text-white">Cancel</button>
                <button type="submit" disabled={isSaving} className="bg-neon px-6 py-3 text-[10px] font-bold uppercase tracking-widest text-black transition-colors hover:bg-[#4ade80] disabled:cursor-not-allowed disabled:opacity-45">
                  {isSaving ? 'Saving...' : editingProductId ? 'Update Product' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {productPendingDelete && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg border border-white/10 bg-[#111] p-6">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-red-300">Confirm Delete</p>
            <h4 className="mt-3 font-display text-xl font-black uppercase tracking-tight text-white">Delete {productPendingDelete.name}?</h4>
            <p className="mt-4 text-sm leading-6 text-white/70">This action permanently removes the product from the catalog. It will also disappear from shop pages.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setProductPendingDelete(null)} className="border border-white/15 bg-[#1a1a1a] px-5 py-3 text-[10px] uppercase tracking-widest text-white">Cancel</button>
              <button type="button" onClick={handleConfirmDelete} disabled={isDeleting} className="bg-red-600 px-5 py-3 text-[10px] uppercase tracking-widest text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-45">{isDeleting ? 'Deleting...' : 'Delete Product'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminInventorySection;
