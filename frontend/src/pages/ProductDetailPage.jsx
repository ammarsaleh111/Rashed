import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { getProductBySlug as getProductBySlugApi, getProducts as getProductsApi } from '../services/api/products.js';
import { useAppContext } from '../context/AppContext.jsx';
import ProductCard from '../components/shop/ProductCard.jsx';

const DEFAULT_SHIPPING_MESSAGE =
  'Cash on Delivery available. Fast delivery on football gear.';
const FALLBACK_PRODUCT_IMAGE =
  'https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=900&q=80';

const FEATURE_PANELS = [
  {
    title: 'Match Ready',
    body: 'Built for football sessions, training, and match day.',
  },
  {
    title: 'Premium Gear',
    body: 'Selected for reliable quality and strong product feel.',
  },
  {
    title: 'COD Checkout',
    body: 'Order fast and pay cash when your gear arrives.',
  },
];

const EMPTY_PRODUCT = {
  id: null,
  name: 'Product',
  category: 'Collection',
  price: 0,
  rating: 0,
  reviewCount: 0,
  colors: [],
  sizes: [],
  description: 'Product details are unavailable.',
  materials: 'Gear details are unavailable.',
  shipping: DEFAULT_SHIPPING_MESSAGE,
  images: [FALLBACK_PRODUCT_IMAGE],
  variants: [],
};

const categoryLabel = (categoryName) =>
  String(categoryName || '').toLowerCase() === 'football jerseys' ? 'T-shirts' : categoryName || EMPTY_PRODUCT.category;

const Accordion = ({ title, content, isOpen, onClick }) => {
  const safeContent = String(content || '').trim() || 'No details available right now.';

  return (
    <div className="border-b border-white/10">
      <button
        type="button"
        className="group flex w-full items-center justify-between py-4 text-left transition-all duration-300 ease-in-out hover:text-white"
        onClick={onClick}
      >
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-300 transition-all duration-300 ease-in-out group-hover:text-neon">
          {title}
        </span>
        <svg
          className={`h-4 w-4 transition-transform duration-300 ${isOpen ? 'rotate-180 text-neon' : 'text-zinc-500'}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-96 opacity-100 pb-5' : 'max-h-0 opacity-0'}`}
      >
        <p className="text-sm leading-relaxed text-zinc-400">{safeContent}</p>
      </div>
    </div>
  );
};

const ProductDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addCartItem } = useAppContext();
  const [product, setProduct] = useState(EMPTY_PRODUCT);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [cartFeedback, setCartFeedback] = useState('');
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedSize, setSelectedSize] = useState('');
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [openAccordion, setOpenAccordion] = useState('description');
  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const materialsSectionRef = useRef(null);

  useEffect(() => {
    const loadProduct = async () => {
      try {
        setIsLoading(true);
        setErrorMessage('');
        const response = await getProductBySlugApi(slug);
        const data = response?.data;

        if (!data) {
          throw new Error('Invalid product response payload.');
        }

        const colorSource = Array.isArray(data.availableColors)
          ? data.availableColors
          : Array.from(
              new Map(
                (data.variants || [])
                  .filter((variant) => variant.color)
                  .map((variant) => [variant.color, { name: variant.color, hex: variant.color_hex || '#1f1f1f' }]),
              ).values(),
            );

        const mappedColors = colorSource.map((color, index) => ({
          id: `api-color-${index + 1}`,
          name: color.name,
          hex: color.hex || '#1f1f1f',
        }));

        const mappedImages = (data.images || []).map((image) => image.image_url).filter(Boolean);
        const mappedSizes = Array.isArray(data.availableSizes)
          ? data.availableSizes
          : Array.from(new Set((data.variants || []).map((variant) => variant.size).filter(Boolean)));

        const nextProduct = {
          id: data.id,
          name: data.name || EMPTY_PRODUCT.name,
          category: categoryLabel(data.category_name),
          price: Number(data.base_price || 0),
          rating: Number(data.reviews?.rating || 0),
          reviewCount: Number(data.reviews?.count || 0),
          colors: mappedColors,
          sizes: mappedSizes,
          description: data.description || EMPTY_PRODUCT.description,
          materials: data.materials_care || EMPTY_PRODUCT.materials,
          shipping: DEFAULT_SHIPPING_MESSAGE,
          images: mappedImages.length ? mappedImages : [FALLBACK_PRODUCT_IMAGE],
          variants: Array.isArray(data.variants) ? data.variants : [],
        };

        setProduct(nextProduct);
        setSelectedColor(nextProduct.colors[0] || null);
        setSelectedSize(nextProduct.sizes[0] || '');
        setQuantity(1);
        setActiveImage(0);
      } catch (error) {
        console.error('Failed to load product from API.', error);
        setErrorMessage('Unable to fetch live product details right now.');
        setProduct(EMPTY_PRODUCT);
        setSelectedColor(null);
        setSelectedSize('');
        setQuantity(1);
        setActiveImage(0);
      } finally {
        setIsLoading(false);
      }
    };

    if (!slug) {
      setErrorMessage('Product slug is missing.');
      setProduct(EMPTY_PRODUCT);
      return;
    }

    loadProduct();
  }, [slug]);

  const selectedVariant = useMemo(
    () =>
      (product.variants || []).find((variant) => {
        const sizeMatch = selectedSize
          ? String(variant.size || '').toUpperCase() === String(selectedSize || '').toUpperCase()
          : true;
        const colorMatch = selectedColor
          ? String(variant.color || '').toLowerCase() === String(selectedColor?.name || '').toLowerCase()
          : true;
        return sizeMatch && colorMatch;
      }) || null,
    [product.variants, selectedColor, selectedSize],
  );

  const selectedStock = Math.max(0, Number(selectedVariant?.stock_quantity || 0));
  const maxSelectableQuantity = Math.max(1, Math.min(10, selectedStock || 10));
  const hasMultipleImages = product.images.length > 1;

  const shortDescription = useMemo(() => {
    const value = String(product.description || '').replace(/\s+/g, ' ').trim();
    if (!value) {
      return 'Premium football gear for training and match day.';
    }
    if (value.length <= 150) {
      return value;
    }
    return `${value.slice(0, 147)}...`;
  }, [product.description]);

  const canAddToCart = Boolean(selectedVariant) && selectedStock > 0 && !isLoading;

  useEffect(() => {
    setQuantity(1);
  }, [selectedVariant?.id]);

  useEffect(() => {
    setQuantity((current) => Math.min(Math.max(1, current), maxSelectableQuantity));
  }, [maxSelectableQuantity]);

  const goToPreviousImage = () => {
    setActiveImage((current) => (current - 1 + product.images.length) % product.images.length);
  };

  const goToNextImage = () => {
    setActiveImage((current) => (current + 1) % product.images.length);
  };

  const handleAddToCart = async () => {
    setCartFeedback('');

    if (!selectedVariant) {
      setCartFeedback('Selected option is unavailable.');
      return { success: false };
    }

    if (selectedStock <= 0) {
      setCartFeedback('This option is currently out of stock.');
      return { success: false };
    }

    const selectedVariantId = Number(selectedVariant.id);
    const selectedQuantity = Math.min(Math.max(1, quantity), maxSelectableQuantity);
    const selectedVariantLabel = `${
      selectedVariant.color || selectedColor?.name || 'Default'
    } / ${selectedVariant.size || selectedSize || 'One Size'}`;

    const result = await addCartItem({
      variantId: selectedVariantId,
      quantity: selectedQuantity,
      optimisticItem: {
        id: `temp-${selectedVariantId}`,
        cartItemId: `temp-${selectedVariantId}`,
        variantId: selectedVariantId,
        productId: product.id,
        slug,
        name: product.name,
        variant: selectedVariantLabel,
        color: selectedVariant.color || selectedColor?.name || null,
        size: selectedVariant.size || selectedSize || null,
        unitPrice: Number(product.price || 0),
        quantity: selectedQuantity,
        imageUrl: product.images?.[0] || FALLBACK_PRODUCT_IMAGE,
      },
    });

    if (!result.success) {
      setCartFeedback(result.message || 'Unable to add this item to cart.');
      return result;
    }

    setCartFeedback(`${selectedQuantity} item${selectedQuantity > 1 ? 's' : ''} added to cart.`);
    return result;
  };

  const handleBuyNow = async () => {
    const result = await handleAddToCart();
    if (result?.success) {
      navigate('/checkout');
    }
  };

  const handleShowSizeGuide = () => {
    setShowSizeGuide(true);
  };

  const handleExploreConstruction = () => {
    setOpenAccordion('materials');
    materialsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => {
    let isMounted = true;

    const loadRelatedProducts = async () => {
      try {
        const response = await getProductsApi({ category: '', sort_by: 'featured', limit: 4, page: 1 });
        const mapped = Array.isArray(response?.data)
          ? response.data
              .filter((item) => item.slug !== slug)
              .map((item) => ({
                id: item.id,
                slug: item.slug,
                defaultVariantId: Number(item.default_variant_id || 0) || null,
                defaultVariantStock: Number(item.default_variant_stock || 0),
                totalStock: Number(item.total_stock || 0),
                name: item.name,
                price: Number(item.base_price || 0),
                colorName: item.category_name || 'Football Gear',
                imageUrl:
                  item.primary_image ||
                  'https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=700&q=80',
                isNew: Boolean(item.is_featured),
                rating: Number(item.avg_rating || 0),
                reviewCount: Number(item.review_count || 0),
                badgeText: item.is_featured ? 'Related' : '',
              }))
          : [];
        if (isMounted) setRelatedProducts(mapped.slice(0, 4));
      } catch {
        if (isMounted) setRelatedProducts([]);
      }
    };

    loadRelatedProducts();
    return () => {
      isMounted = false;
    };
  }, [slug]);

  const stockStatusLabel = !selectedVariant
    ? 'Select size and color'
    : selectedStock > 0
      ? `${selectedStock} in stock`
      : 'Out of stock';

  const stockStatusClass = !selectedVariant
    ? 'text-white/55'
    : selectedStock > 0
      ? 'text-neon'
      : 'text-red-400';

  return (
    <section className="mx-auto w-full max-w-[1540px] px-0 py-2 text-white sm:px-2 sm:py-3 md:px-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
        <Link to="/" className="cursor-pointer transition-all duration-300 ease-in-out hover:text-white">Home</Link>
        <span>&gt;</span>
        <Link to="/shop" className="cursor-pointer transition-all duration-300 ease-in-out hover:text-white">Shop</Link>
        <span>&gt;</span>
        <span className="text-white">{product.name}</span>
      </div>

      {errorMessage && !isLoading && (
        <div className="storefront-surface mt-4 flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-yellow-400">{errorMessage}</p>
          <Link to="/shop" className="storefront-secondary px-4">Back To Shop</Link>
        </div>
      )}

      <div className="mt-4 grid gap-5 xl:grid-cols-[minmax(0,1fr)_430px]">
        <div className="storefront-surface p-4 sm:p-5">
          <div className="relative overflow-hidden rounded-xl border border-white/10 bg-black/35">
            {isLoading ? (
              <div className="h-[320px] animate-pulse bg-white/10 sm:h-[460px] lg:h-[560px]" />
            ) : (
              <img
                src={product.images[activeImage] || FALLBACK_PRODUCT_IMAGE}
                alt={product.name}
                className="h-[320px] w-full object-cover transition-transform duration-500 ease-in-out hover:scale-[1.02] sm:h-[460px] lg:h-[560px]"
              />
            )}

            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

            <div className="absolute left-3 top-3 flex items-center gap-2">
              <span className="storefront-chip">{product.category}</span>
              <span className="storefront-chip">
                {activeImage + 1} / {product.images.length}
              </span>
            </div>

            {hasMultipleImages && !isLoading && (
              <>
                <button
                  type="button"
                  onClick={goToPreviousImage}
                  className="storefront-icon-button absolute left-3 top-1/2 -translate-y-1/2"
                  aria-label="Previous image"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={goToNextImage}
                  className="storefront-icon-button absolute right-3 top-1/2 -translate-y-1/2"
                  aria-label="Next image"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  </svg>
                </button>
              </>
            )}
          </div>

          <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-7">
            {product.images.map((img, index) => (
              <button
                key={`${img}-${index}`}
                type="button"
                onClick={() => setActiveImage(index)}
                className={`overflow-hidden rounded-lg border transition-all duration-300 ${
                  activeImage === index
                    ? 'border-neon shadow-[0_0_0_1px_rgba(57,255,20,0.35)]'
                    : 'border-white/10 hover:border-white/35'
                }`}
                aria-label={`Show image ${index + 1}`}
              >
                <img src={img} alt={`${product.name} view ${index + 1}`} className="h-20 w-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        <aside className="storefront-surface h-fit p-5 sm:p-6 xl:sticky xl:top-28">
          <p className="storefront-kicker">Football Gear</p>
          <h1 className="storefront-title mt-4 text-[clamp(2.8rem,7vw,4.8rem)] text-white">{product.name}</h1>
          <p className="mt-3 text-sm leading-relaxed text-white/70">{shortDescription}</p>

          <div className="mt-5 flex items-end justify-between gap-4">
            <p className="text-4xl font-bold text-neon">${product.price.toFixed(2)}</p>
            <div className="flex items-center gap-1">
              <div className="flex text-neon">
                {[...Array(5)].map((_, index) => (
                  <svg
                    key={`rating-star-${index}`}
                    className={`h-3 w-3 ${index < Math.floor(product.rating) ? 'fill-current' : 'fill-zinc-700'}`}
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <span className="ml-1 text-[10px] uppercase tracking-[0.14em] text-white/55">
                {product.reviewCount} reviews
              </span>
            </div>
          </div>

          <div className="mt-6 space-y-7">
            <div>
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">
                Color / {selectedColor?.name?.split(' / ')[1] || selectedColor?.name || 'N/A'}
              </p>
              <div className="flex flex-wrap gap-2">
                {product.colors.length > 0 ? (
                  product.colors.map((color) => (
                    <button
                      key={color.id}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      className={`h-9 w-9 rounded-full border-2 p-0.5 transition-all duration-300 ease-in-out ${
                        selectedColor?.id === color.id
                          ? 'border-neon shadow-[0_0_0_1px_rgba(57,255,20,0.35)]'
                          : 'border-transparent hover:border-zinc-500'
                      }`}
                      aria-label={`Select color ${color.name}`}
                    >
                      <span
                        className="block h-full w-full rounded-full border border-white/20"
                        style={{ backgroundColor: color.hex }}
                      />
                    </button>
                  ))
                ) : (
                  <p className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">No color options</p>
                )}
              </div>
            </div>

            <div>
              <div className="mb-4 flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">Size</p>
                <button
                  type="button"
                  onClick={handleShowSizeGuide}
                  className="text-[10px] font-bold uppercase tracking-[0.14em] text-neon transition-all duration-300 ease-in-out hover:text-white"
                >
                  Size Guide
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
                {product.sizes.length > 0 ? (
                  product.sizes.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setSelectedSize(size)}
                      className={`rounded-lg border py-2.5 text-[11px] font-bold uppercase tracking-[0.12em] transition-all duration-300 ease-in-out ${
                        selectedSize === size
                          ? 'border-neon bg-neon text-black'
                          : 'border-white/10 bg-black/25 text-zinc-300 hover:border-zinc-500'
                      }`}
                    >
                      {size}
                    </button>
                  ))
                ) : (
                  <p className="col-span-full text-[10px] uppercase tracking-[0.16em] text-zinc-500">No size options</p>
                )}
              </div>
            </div>

            <div>
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-zinc-400">Quantity</p>
              <div className="inline-flex items-center overflow-hidden rounded-lg border border-white/12 bg-black/30">
                <button
                  type="button"
                  onClick={() => setQuantity((current) => Math.max(1, current - 1))}
                  className="px-4 py-2 text-sm text-white/75 transition-all duration-300 hover:text-white"
                  aria-label="Decrease quantity"
                >
                  -
                </button>
                <span className="min-w-10 px-2 text-center text-sm font-semibold">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((current) => Math.min(maxSelectableQuantity, current + 1))}
                  className="px-4 py-2 text-sm text-white/75 transition-all duration-300 hover:text-white"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!canAddToCart}
            className="storefront-primary mt-7 flex w-full items-center justify-center gap-2 py-4 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {selectedStock > 0 ? 'Add To Cart' : 'Unavailable'}
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>

          <button
            type="button"
            onClick={handleBuyNow}
            disabled={!canAddToCart}
            className="storefront-secondary mt-3 flex w-full items-center justify-center gap-2 py-4 disabled:cursor-not-allowed disabled:opacity-45"
          >
            Buy Now
          </button>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[10px] uppercase tracking-[0.14em]">
            <p className={stockStatusClass}>{stockStatusLabel}</p>
            <p className="text-white/55">Cash on delivery</p>
          </div>

          {cartFeedback && (
            <p className="mt-3 text-[11px] uppercase tracking-[0.15em] text-neon">{cartFeedback}</p>
          )}

          <div ref={materialsSectionRef} className="mt-6 border-t border-white/10">
            <Accordion 
              title="Details" 
              content={product.description}
              isOpen={openAccordion === 'description'}
              onClick={() => setOpenAccordion(openAccordion === 'description' ? '' : 'description')}
            />
            <Accordion 
              title="Materials & Care" 
              content={product.materials}
              isOpen={openAccordion === 'materials'}
              onClick={() => setOpenAccordion(openAccordion === 'materials' ? '' : 'materials')}
            />
            <Accordion 
              title="Delivery & Returns" 
              content={product.shipping}
              isOpen={openAccordion === 'shipping'}
              onClick={() => setOpenAccordion(openAccordion === 'shipping' ? '' : 'shipping')}
            />
          </div>
        </aside>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {FEATURE_PANELS.map((panel, index) => (
          <article key={panel.title} className="storefront-surface p-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neon">0{index + 1}</p>
            <h3 className="mt-3 text-2xl font-semibold text-white">{panel.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/65">{panel.body}</p>
            {index === 1 && (
              <button
                type="button"
                onClick={handleExploreConstruction}
                className="storefront-secondary mt-4 px-4"
              >
                Open Gear Details
              </button>
            )}
          </article>
        ))}
      </div>

      {showSizeGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 px-2 py-6 sm:px-6 sm:py-10">
          <div className="storefront-surface max-h-[calc(100vh-3rem)] w-full max-w-3xl overflow-y-auto p-4 shadow-2xl shadow-black/40 sm:p-6">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-neon">Size Guide</p>
            <h3 className="mt-2 font-display text-3xl font-bold uppercase tracking-tight text-white">
                  Size Guide
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSizeGuide(false)}
                className="storefront-secondary min-h-0 px-3 py-2 text-[11px]"
              >
                Close
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-black/35 p-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/45">Selected Size</p>
                <p className="mt-2 text-2xl font-bold text-white">{selectedSize || 'M'}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/35 p-4">
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/45">Recommended Fit</p>
                <p className="mt-2 text-sm text-white/72">Choose your regular match or boot size.</p>
              </div>
            </div>

            <div className="mt-6 overflow-x-auto border border-white/10">
              <table className="min-w-[560px] text-left">
                <thead className="bg-black/45 text-[10px] uppercase tracking-[0.2em] text-white/45">
                  <tr>
                    <th className="px-4 py-3">Size</th>
                    <th className="px-4 py-3">Apparel</th>
                    <th className="px-4 py-3">Boots</th>
                    <th className="px-4 py-3">Fit Note</th>
                  </tr>
                </thead>
                <tbody>
                  {(product.sizes.length > 0 ? product.sizes : ['S', 'M', 'L', 'XL']).map((size) => (
                    <tr key={size} className="border-t border-white/10 text-sm text-white/80">
                      <td className="px-4 py-3 font-semibold uppercase">{size}</td>
                      <td className="px-4 py-3">Regular</td>
                      <td className="px-4 py-3">True size</td>
                      <td className="px-4 py-3 text-white/60">Match-ready fit</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {relatedProducts.length > 0 && (
        <section className="mt-8">
          <div className="mb-5 flex items-end justify-between gap-4">
            <h2 className="storefront-title text-[clamp(2.2rem,5vw,4rem)]">Related Products</h2>
            <Link to="/shop" className="storefront-secondary px-4">Shop All</Link>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {relatedProducts.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}
    </section>
  );
};

export default ProductDetailPage;
