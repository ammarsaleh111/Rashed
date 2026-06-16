import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getProducts as getProductsApi } from '../services/api/products.js';
import ProductCard from '../components/shop/ProductCard.jsx';

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1459865264687-595d652de67e?auto=format&fit=crop&w=2200&q=85';

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
      <section className="relative overflow-hidden border-b border-white/10 bg-[#080b0a]">
        <div className="mx-auto grid min-h-[760px] max-w-[1440px] gap-8 px-4 pb-10 pt-10 sm:px-6 md:px-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
          <div className="relative z-10 py-10 lg:py-20">
            <p className="home-kicker">Football Store</p>
            <h1 className="home-display mt-5 max-w-2xl text-[clamp(4rem,11vw,8rem)] uppercase leading-[0.84]">
              Gear Up.
            </h1>
            <div className="mt-6 h-1 w-24 bg-neon" />
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/shop" className="home-neon-button">Shop Now</Link>
              <Link to="/shop?category=football-boots" className="home-ring-button">Shop Boots</Link>
            </div>
          </div>

          <div className="relative min-h-[430px] overflow-hidden rounded-[1.2rem] border border-white/12 bg-black shadow-[0_24px_70px_rgba(0,0,0,0.38)] lg:min-h-[620px]">
            <img src={HERO_IMAGE} alt="Football player kicking a ball" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/8 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 grid grid-cols-3 gap-2">
              {['T-shirts', 'Boots', 'Balls'].map((item) => (
                <Link key={item} to={`/shop?category=${item === 'T-shirts' ? 'football-jerseys' : `football-${item.toLowerCase()}`}`} className="border border-white/16 bg-black/55 px-3 py-3 text-center text-[10px] font-bold uppercase tracking-[0.16em] text-white backdrop-blur transition hover:border-neon hover:text-neon">
                  {item}
                </Link>
              ))}
            </div>
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

      <section className="border-b border-white/10 py-8">
        <div className="mx-auto grid max-w-[1440px] grid-cols-2 gap-3 px-4 sm:grid-cols-3 sm:px-6 md:grid-cols-6 md:px-10">
          {brandLogos.map((brand) => (
            <div key={brand} className="grid min-h-16 place-items-center rounded-lg border border-white/10 bg-black/25">
              <span className="home-display text-2xl uppercase tracking-wide text-white/70">{brand}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="py-12 md:py-16">
        <div className="mx-auto max-w-[1100px] px-4 sm:px-6 md:px-10">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {trustItems.map((item) => (
              <article key={item.label} className="home-stat-card grid min-h-28 place-items-center rounded-xl text-center">
                <svg className="h-7 w-7 text-neon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7">
                  <path d={item.icon} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.18em] text-white/75">{item.label}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
