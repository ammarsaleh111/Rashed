import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getProducts as getProductsApi } from '../services/api/products.js';
import ProductCard from '../components/shop/ProductCard.jsx';

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1511886929837-354d827aae26?auto=format&fit=crop&w=2200&q=85';

const categories = [
  {
    title: 'T-shirts',
    to: '/shop?category=football-jerseys',
    image: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=900&q=80',
  },
  {
    title: 'Boots',
    to: '/shop?category=football-boots',
    image: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=900&q=80',
  },
  {
    title: 'Balls',
    to: '/shop?category=football-balls',
    image: 'https://images.unsplash.com/photo-1614632537190-23e4146777db?auto=format&fit=crop&w=900&q=80',
  },
  {
    title: 'Others',
    to: '/shop?category=others',
    image: 'https://images.unsplash.com/photo-1547347298-4074fc3086f0?auto=format&fit=crop&w=900&q=80',
  },
];

const brandLogos = ['NIKE', 'ADIDAS', 'PUMA', 'UMBRO', 'SELECT', 'REUSCH'];

const trustItems = [
  { label: 'Fast Delivery', icon: 'M4 7h10v8H4z M14 10h3l3 3v2h-6z M7 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z M17 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z' },
  { label: 'Quality Products', icon: 'M12 3l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.3 6.8 19l1-5.8-4.3-4.1 5.9-.9z' },
  { label: 'Cash On Delivery', icon: 'M4 7h16v10H4z M7 10h4 M16 14h1 M8 17v2 M16 17v2' },
  { label: 'Easy Ordering', icon: 'M5 12l4 4L19 6 M4 20h16' },
];

const categoryLabel = (categorySlug, categoryName) =>
  categorySlug === 'football-jerseys' ? 'T-shirts' : categoryName || 'Football Gear';

const fallbackProducts = [
  {
    id: 'football-tshirt',
    slug: 'elite-match-jersey',
    defaultVariantId: null,
    totalStock: 1,
    name: 'Elite Match T-shirt',
    price: 79,
    colorName: 'T-shirts',
    imageUrl: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=800&q=80',
    isNew: true,
    rating: 5,
    reviewCount: 24,
    badgeText: 'Best Seller',
  },
  {
    id: 'football-boots',
    slug: 'speed-control-boots',
    defaultVariantId: null,
    totalStock: 1,
    name: 'Speed Control Boots',
    price: 149,
    colorName: 'Boots',
    imageUrl: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=800&q=80',
    isNew: false,
    rating: 5,
    reviewCount: 18,
    badgeText: 'Match Ready',
  },
  {
    id: 'match-ball',
    slug: 'pro-match-ball',
    defaultVariantId: null,
    totalStock: 1,
    name: 'Pro Match Ball',
    price: 49,
    colorName: 'Balls',
    imageUrl: 'https://images.unsplash.com/photo-1614632537190-23e4146777db?auto=format&fit=crop&w=800&q=80',
    isNew: true,
    rating: 4,
    reviewCount: 31,
    badgeText: 'New',
  },
];

const mapProduct = (item) => ({
  id: item.id,
  slug: item.slug,
  defaultVariantId: Number(item.default_variant_id || 0) || null,
  defaultVariantStock: Number(item.default_variant_stock || 0),
  totalStock: Number(item.total_stock || 0),
  name: String(item.name || '').replace(/Jersey/gi, 'T-shirt'),
  price: Number(item.base_price || 0),
  colorName: categoryLabel(item.category_slug, item.category_name),
  imageUrl:
    item.primary_image ||
    'https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=800&q=80',
  isNew: Boolean(item.is_featured),
  rating: Number(item.avg_rating || 0),
  reviewCount: Number(item.review_count || 0),
  badgeText: item.is_featured ? 'Best Seller' : '',
});

const HomePage = () => {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadProducts = async () => {
      setIsLoading(true);
      try {
        const response = await getProductsApi({ sort_by: 'featured', limit: 8, page: 1 });
        const mapped = Array.isArray(response?.data) ? response.data.map(mapProduct) : [];
        if (isMounted) setProducts(mapped);
      } catch {
        if (isMounted) setProducts([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadProducts();
    return () => {
      isMounted = false;
    };
  }, []);

  const displayProducts = products.length ? products : fallbackProducts;

  return (
    <div className="home-shell text-white">
      <section className="relative flex min-h-[90vh] items-center justify-center overflow-hidden border-b border-white/10 bg-[#080b0a] pt-[120px]">
        {/* Full width Background Image */}
        <div className="absolute inset-0 z-0">
          <img 
            src={HERO_IMAGE} 
            alt="Football background" 
            className="h-full w-full object-cover opacity-40 mix-blend-luminosity" 
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/50 to-[#080b0a]" />
          <div className="absolute inset-0 bg-neon/5" />
        </div>

        {/* Minimal Centered Content */}
        <div className="relative z-10 mx-auto w-full max-w-5xl px-4 py-20 text-center sm:px-6 md:px-10">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.3em] text-neon sm:text-sm">
            Rashed Sport Pro Gear
          </p>
          <h1 className="home-display mx-auto mb-6 text-[clamp(3.5rem,10vw,8rem)] uppercase leading-[0.85] text-white">
            Unleash Your<br />
            <span 
              className="text-transparent" 
              style={{ WebkitTextStroke: '2px #5eff33' }}
            >
              Potential
            </span>
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-sm font-light leading-relaxed text-gray-400 sm:text-base">
            Engineered for speed, control, and precision. Discover the latest elite football gear and dominate every single match.
          </p>
          
          <div className="flex flex-wrap justify-center gap-5">
            <Link 
              to="/shop" 
              className="rounded bg-neon px-8 py-4 text-sm font-bold uppercase tracking-widest text-black transition-all hover:bg-white hover:text-black hover:shadow-[0_0_20px_rgba(94,255,51,0.4)]"
            >
              Shop Collection
            </Link>
            <Link 
              to="/shop?category=football-boots" 
              className="rounded border border-white/20 bg-black/40 px-8 py-4 text-sm font-bold uppercase tracking-widest text-white backdrop-blur-md transition-all hover:border-neon hover:text-neon"
            >
              Explore Boots
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 py-12 md:py-16">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 md:px-10">
          <div className="mb-7 flex items-end justify-between gap-4">
            <h2 className="home-display text-[clamp(2.3rem,6vw,4.4rem)] uppercase leading-none">Shop Categories</h2>
            <Link to="/shop" className="home-text-link hidden sm:inline-flex">All Products</Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((category) => (
              <Link key={category.title} to={category.to} className="group relative min-h-[250px] overflow-hidden rounded-xl border border-white/12 bg-black">
                <img src={category.image} alt={category.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/88 via-black/18 to-transparent" />
                <h3 className="home-display absolute bottom-5 left-5 text-5xl uppercase leading-none">{category.title}</h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-white/10 py-12 md:py-16">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 md:px-10">
          <div className="mb-7 flex items-end justify-between gap-4">
            <h2 className="home-display text-[clamp(2.3rem,6vw,4.4rem)] uppercase leading-none">Best Sellers</h2>
            <Link to="/shop?sort_by=featured" className="home-ring-button hidden sm:inline-flex">View All</Link>
          </div>

          {isLoading ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="home-product-card h-96 animate-pulse bg-white/10" />
              ))}
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {displayProducts.slice(0, 4).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Premium Marquee for Brands */}
      <section className="home-brand-marquee border-y border-white/10 py-16">
        <div className="marquee-track relative">
          {/* Subtle fade edges for the marquee */}
          <div className="marquee-fade-left absolute inset-y-0 left-0 z-10 w-32 pointer-events-none" />
          <div className="marquee-fade-right absolute inset-y-0 right-0 z-10 w-32 pointer-events-none" />
          
          <div className="marquee-content">
            {brandLogos.map((brand, i) => (
              <span 
                key={`${brand}-1`} 
                className="marquee-item text-4xl hover:text-neon transition-colors duration-300 md:text-5xl"
                style={{ '--marquee-tilt-delay': `${i * 0.2}s` }}
              >
                {brand}
              </span>
            ))}
          </div>
          <div className="marquee-content" aria-hidden="true">
            {brandLogos.map((brand, i) => (
              <span 
                key={`${brand}-2`} 
                className="marquee-item text-4xl hover:text-neon transition-colors duration-300 md:text-5xl"
                style={{ '--marquee-tilt-delay': `${i * 0.2}s` }}
              >
                {brand}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Modernized Trust Grid */}
      <section className="home-trust-section py-16 md:py-24">
        <div className="mx-auto max-w-[1440px] px-4 sm:px-6 md:px-10">
          <div className="mb-12 text-center">
            <h2 className="home-display text-3xl uppercase tracking-widest text-white md:text-4xl">
              Why Choose <span className="text-neon">Us</span>
            </h2>
            <div className="mx-auto mt-4 h-[2px] w-12 bg-neon/80" />
          </div>
          
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {trustItems.map((item) => (
              <article 
                key={item.label} 
                className="home-trust-card group relative flex flex-col items-center justify-center overflow-hidden py-10 px-6 transition-all duration-500 hover:-translate-y-2 hover:border-neon/30 hover:shadow-[0_10px_40px_rgba(94,255,51,0.06)]"
              >
                <div className="absolute inset-0 z-0 bg-gradient-to-b from-neon/0 to-neon/5 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                <div className="relative z-10 mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-white/5 transition-transform duration-500 group-hover:scale-110 group-hover:bg-neon/10">
                  <svg className="h-8 w-8 text-white/70 transition-colors duration-500 group-hover:text-neon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path d={item.icon} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <p className="relative z-10 text-[13px] font-bold uppercase tracking-[0.2em] text-white/80 transition-colors duration-500 group-hover:text-white">
                  {item.label}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;

