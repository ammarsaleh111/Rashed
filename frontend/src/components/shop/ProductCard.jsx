import React, { useState } from 'react';
import { Link } from 'react-router-dom';

import { useAppContext } from '../../context/AppContext.jsx';

const ProductCard = ({ product }) => {
  const { addCartItem } = useAppContext();
  const [cartFeedback, setCartFeedback] = useState('');

  const handleAddToCart = async (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (!product.defaultVariantId) {
      setCartFeedback('Variant unavailable');
      return;
    }

    const result = await addCartItem({
      variantId: product.defaultVariantId,
      quantity: 1,
      optimisticItem: {
        id: `temp-${product.defaultVariantId}`,
        cartItemId: `temp-${product.defaultVariantId}`,
        variantId: product.defaultVariantId,
        productId: product.id,
        slug: product.slug,
        name: product.name,
        variant: product.colorName || 'Default / One Size',
        unitPrice: Number(product.price || 0),
        quantity: 1,
        imageUrl: product.imageUrl,
      },
    });

    if (!result.success) {
      setCartFeedback(result.message || 'Unable to add');
      return;
    }

    setCartFeedback('Added to cart');
  };

  const isOutOfStock = Number(product.totalStock || product.defaultVariantStock || 0) <= 0;

  return (
    <article className="storefront-surface group block p-3 transition-all duration-300 ease-in-out">
      <Link to={`/products/${product.slug}`} className="block">
        <div className="relative mb-4 aspect-[4/5] overflow-hidden rounded-lg border border-white/10 bg-[#121212]">
          {product.isNew && (
            <div className="absolute top-3 left-3 bg-neon text-black text-[10px] font-bold px-2 py-1 uppercase tracking-widest z-10">
              New Drop
            </div>
          )}

          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-500 ease-in-out group-hover:scale-105"
            style={{ backgroundImage: `url(${product.imageUrl})` }}
          />

          <div className="absolute inset-0 bg-black/10 opacity-0 transition-all duration-300 ease-in-out group-hover:opacity-100" />

          {product.badgeText && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 border border-white/25 bg-zinc-900/80 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white/85 backdrop-blur-sm">
              {product.badgeText}
            </div>
          )}
        </div>

        <div className="mb-1 flex items-start justify-between gap-3">
          <h3 className="min-w-0 font-display text-base font-bold uppercase leading-none tracking-tight text-white">
            {product.name}
          </h3>
          <span className="shrink-0 font-display text-base font-bold text-white">${product.price.toFixed(2)}</span>
        </div>

        <p className="mb-3 text-[10px] uppercase tracking-widest text-zinc-400">{product.colorName}</p>
      </Link>

      <div className="flex items-center gap-1.5 mb-4">
        <div className="flex text-neon text-[10px]">
          {[...Array(5)].map((_, i) => (
            <svg key={i} className={`w-3 h-3 ${i < Math.floor(product.rating) ? 'fill-current' : 'fill-gray-700'}`} viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
        </div>
        <span className="text-[9px] tracking-wider text-zinc-500">({product.reviewCount})</span>
      </div>

      <button
        type="button"
        onClick={handleAddToCart}
        disabled={isOutOfStock || !product.defaultVariantId}
        className="storefront-primary w-full py-3 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
      </button>

      {cartFeedback && (
        <p className="mt-2 text-center text-[9px] uppercase tracking-widest text-neon">{cartFeedback}</p>
      )}
    </article>
  );
};

export default ProductCard;
