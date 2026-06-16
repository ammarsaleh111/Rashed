import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import ProductCard from '../components/shop/ProductCard.jsx';
import SidebarFilter from '../components/shop/SidebarFilter.jsx';
import { getProducts as getProductsApi } from '../services/api/products.js';

const mobileCategoryOptions = [
  { label: 'All Categories', value: '' },
  { label: 'T-shirts', value: 'football-jerseys' },
  { label: 'Shorts', value: 'football-shorts' },
  { label: 'Boots', value: 'football-boots' },
  { label: 'Balls', value: 'football-balls' },
  { label: 'Others', value: 'others' },
];

const mobileSizeOptions = ['', 'S', 'M', 'L', 'XL', '39', '40', '41', '42', '43', '44'];

const mobileColorOptions = [
  { label: 'All Colors', value: '' },
  { label: 'Black', value: 'Black' },
  { label: 'White', value: 'White' },
  { label: 'Blue', value: 'Blue' },
  { label: 'Red', value: 'Red' },
  { label: 'Volt', value: 'Volt' },
];

const categoryLabel = (categorySlug, categoryName) =>
  categorySlug === 'football-jerseys' ? 'T-shirts' : categoryName || 'Football Gear';

const ShopPage = () => {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [meta, setMeta] = useState({
    totalCount: 0,
    totalPages: 1,
    currentPage: 1,
    limit: 12,
  });
  const [filters, setFilters] = useState({
    category: searchParams.get('category') || '',
    size: '',
    color: '',
    sort_by: searchParams.get('sort_by') || 'featured',
    page: 1,
    limit: 12,
  });

  const mapApiProductToCard = (item) => ({
    id: item.id,
    slug: item.slug,
    defaultVariantId: Number(item.default_variant_id || 0) || null,
    defaultVariantStock: Number(item.default_variant_stock || 0),
    totalStock: Number(item.total_stock || 0),
    name: item.name,
    price: Number(item.base_price || 0),
    colorName: categoryLabel(item.category_slug, item.category_name),
    imageUrl:
      item.primary_image ||
      'https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=700&q=80',
    isNew: Boolean(item.is_featured),
    rating: Number(item.avg_rating || 0),
    reviewCount: Number(item.review_count || 0),
    badgeText: item.is_featured ? 'Featured' : '',
  });

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: key === 'page' ? value : 1,
    }));
  };

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setIsLoading(true);
        setErrorMessage('');
        const response = await getProductsApi(filters);
        const nextProducts = Array.isArray(response?.data)
          ? response.data.map(mapApiProductToCard)
          : [];

        setProducts(nextProducts);
        setMeta({
          totalCount: Number(response?.meta?.totalCount || 0),
          totalPages: Number(response?.meta?.totalPages || 1),
          currentPage: Number(response?.meta?.currentPage || filters.page),
          limit: Number(response?.meta?.limit || filters.limit),
        });
      } catch (error) {
        console.error('Failed to load products from API.', error);
        setErrorMessage('Unable to fetch live catalog right now.');
        setProducts([]);
        setMeta({
          totalCount: 0,
          totalPages: 1,
          currentPage: 1,
          limit: 12,
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadProducts();
  }, [filters]);

  useEffect(() => {
    setFilters((current) => ({
      ...current,
      category: searchParams.get('category') || '',
      sort_by: searchParams.get('sort_by') || current.sort_by || 'featured',
      page: 1,
    }));
  }, [searchParams]);

  return (
    <div className="w-full font-body text-white">
      {/* Top Breadcrumb/Header Area */}
      <div className="mx-auto max-w-[1500px] px-2 pb-4 pt-3 sm:px-4 md:px-6 md:pt-4">
        <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500 sm:mb-10">
          <Link to="/" className="cursor-pointer transition-all duration-300 ease-in-out hover:text-white">Home</Link>
          <span>&gt;</span>
          <Link to="/shop" className="cursor-pointer transition-all duration-300 ease-in-out hover:text-white">Shop</Link>
          <span>&gt;</span>
          <span className="text-white">Collection</span>
        </div>

        <div className="storefront-surface flex flex-col justify-between gap-6 p-5 md:flex-row md:items-end md:p-6">
          <div>
            <p className="storefront-kicker">Football Store</p>
            <h1 className="storefront-title mt-4 text-[clamp(3.2rem,8vw,6.8rem)]">
              Shop
            </h1>
            <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">
              {meta.totalCount} Football Essentials
            </p>
          </div>
          
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 md:shrink-0">
            <button
              type="button"
              onClick={() => setIsMobileFiltersOpen((current) => !current)}
              className="storefront-secondary justify-center px-4 md:hidden"
            >
              {isMobileFiltersOpen ? 'Hide Filters' : 'Filters'}
            </button>
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Sort By</span>
            <select
              value={filters.sort_by}
              onChange={(event) => handleFilterChange('sort_by', event.target.value)}
              className="min-w-0 cursor-pointer border-b border-zinc-700 bg-transparent pb-1 text-[10px] font-bold uppercase tracking-widest text-white outline-none transition-all duration-300 ease-in-out focus:border-neon"
            >
              <option value="featured" className="bg-black">Featured</option>
              <option value="newest" className="bg-black">New Arrivals</option>
              <option value="price_asc" className="bg-black">Price: Low to High</option>
              <option value="price_desc" className="bg-black">Price: High to Low</option>
            </select>
          </div>
        </div>

        {isMobileFiltersOpen && (
          <div className="storefront-surface mt-4 grid gap-3 p-4 md:hidden">
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/55">Category</span>
                <select
                  value={filters.category}
                  onChange={(event) => handleFilterChange('category', event.target.value)}
                  className="storefront-input"
                >
                  {mobileCategoryOptions.map((option) => (
                    <option key={option.value || 'all'} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/55">Size</span>
                <select
                  value={filters.size}
                  onChange={(event) => handleFilterChange('size', event.target.value)}
                  className="storefront-input"
                >
                  {mobileSizeOptions.map((size) => (
                    <option key={size || 'all'} value={size}>
                      {size || 'All Sizes'}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-white/55">Color</span>
                <select
                  value={filters.color}
                  onChange={(event) => handleFilterChange('color', event.target.value)}
                  className="storefront-input"
                >
                  {mobileColorOptions.map((option) => (
                    <option key={option.value || 'all'} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <button
              type="button"
              onClick={() => {
                setFilters((current) => ({
                  ...current,
                  category: '',
                  size: '',
                  color: '',
                  page: 1,
                }));
              }}
              className="storefront-secondary justify-center px-4"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="mx-auto grid max-w-[1500px] grid-cols-1 gap-8 px-2 py-6 sm:px-4 md:grid-cols-[260px_minmax(0,1fr)] md:gap-8 md:px-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-10">
        <SidebarFilter filters={filters} onFilterChange={handleFilterChange} />

        <div className="flex-1 w-full">
          {errorMessage && (
            <p className="mb-6 text-[11px] uppercase tracking-widest text-yellow-400">{errorMessage}</p>
          )}

          {isLoading && <p className="mb-6 text-sm text-zinc-400">Loading catalog...</p>}

          {!isLoading && !products.length && (
            <p className="mb-6 text-[11px] uppercase tracking-widest text-zinc-500">
              No products matched your current filters.
            </p>
          )}

          <div className="grid grid-cols-1 gap-x-5 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {/* Pagination */}
          <div className="mb-12 mt-24 flex items-center justify-center gap-2">
             <button
               type="button"
               disabled={meta.currentPage <= 1 || isLoading}
               onClick={() => handleFilterChange('page', Math.max(1, meta.currentPage - 1))}
               className="flex h-10 w-10 items-center justify-center border border-white/10 bg-[#121212] text-zinc-500 transition-all duration-300 ease-in-out hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
             >
               &#8249;
             </button>
             <button className="flex h-10 w-10 items-center justify-center bg-neon font-bold text-black shadow-[0_0_16px_rgba(57,255,20,0.28)]">
               {meta.currentPage}
             </button>
             <span className="px-2 text-xs text-zinc-500">/ {Math.max(1, meta.totalPages)}</span>
             <button
               type="button"
               disabled={meta.currentPage >= meta.totalPages || isLoading}
               onClick={() => handleFilterChange('page', Math.min(meta.totalPages, meta.currentPage + 1))}
               className="flex h-10 w-10 items-center justify-center border border-white/10 bg-[#121212] font-bold text-white transition-all duration-300 ease-in-out hover:text-neon disabled:cursor-not-allowed disabled:opacity-40"
             >
               &#8250;
             </button>
          </div>

          <p className="text-center text-[10px] uppercase tracking-widest text-zinc-500">
            Showing {products.length} of {meta.totalCount || products.length} products
          </p>
        </div>
      </div>
    </div>
  );
};

export default ShopPage;
