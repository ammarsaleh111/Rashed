import React from 'react';

const categoryOptions = [
  { label: 'T-shirts', value: 'football-jerseys' },
  { label: 'Shorts', value: 'football-shorts' },
  { label: 'Boots', value: 'football-boots' },
  { label: 'Balls', value: 'football-balls' },
  { label: 'Others', value: 'others' },
];

const sizeOptions = ['S', 'M', 'L', 'XL', '39', '40', '41', '42', '43', '44'];
const colorOptions = [
  { label: 'Black', value: 'Black', swatchClass: 'bg-black border-white/70' },
  { label: 'White', value: 'White', swatchClass: 'bg-white border-zinc-400' },
  { label: 'Blue', value: 'Blue', swatchClass: 'bg-blue-600 border-transparent' },
  { label: 'Red', value: 'Red', swatchClass: 'bg-red-600 border-transparent' },
  { label: 'Volt', value: 'Volt', swatchClass: 'bg-neon border-transparent' },
];

const SidebarFilter = ({ filters, onFilterChange }) => {
  const selectedCategory = filters?.category || '';
  const selectedSize = filters?.size || '';
  const selectedColor = filters?.color || '';

  return (
    <aside className="storefront-surface hidden w-full p-6 text-white md:sticky md:top-24 md:block">
      {/* Category Section */}
      <div className="mb-10">
        <h4 className="text-neon font-bold text-[10px] tracking-[0.2em] uppercase mb-4">Category</h4>
        <ul className="space-y-3">
          {categoryOptions.map((category) => (
            <li key={category.value} className="flex items-center gap-3">
              <label className="flex items-center cursor-pointer group">
                <input
                  type="radio"
                  name="shop-category"
                  className="sr-only"
                  checked={selectedCategory === category.value}
                  onChange={() => onFilterChange('category', category.value)}
                />
                <div className={`w-3 h-3 flex items-center justify-center border transition-all duration-300 ease-in-out ${selectedCategory === category.value ? 'bg-neon border-neon' : 'border-zinc-700 bg-transparent group-hover:border-neon'}`}>
                   {selectedCategory === category.value && <div className="w-1.5 h-1.5 bg-black" />}
                </div>
                <span className="ml-3 text-[10px] uppercase tracking-widest text-zinc-300 font-bold transition-all duration-300 ease-in-out group-hover:text-white">{category.label}</span>
              </label>
            </li>
          ))}
          <li className="pt-2">
            <button
              type="button"
              className="text-[10px] uppercase tracking-widest text-zinc-500 transition-all duration-300 ease-in-out hover:text-neon"
              onClick={() => onFilterChange('category', '')}
            >
              Clear Category
            </button>
          </li>
        </ul>
      </div>

      {/* Size Section */}
      <div className="mb-10">
        <h4 className="text-neon font-bold text-[10px] tracking-[0.2em] uppercase mb-4">Size</h4>
        <div className="grid grid-cols-4 gap-2">
          {sizeOptions.map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => onFilterChange('size', selectedSize === size ? '' : size)}
              className={`border py-2 text-[10px] font-bold uppercase tracking-widest transition-all duration-300 ease-in-out ${selectedSize === size ? 'border-neon bg-neon text-black' : 'border-white/10 bg-black text-zinc-400 hover:border-zinc-500'}`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* Price Range Section */}
      <div className="mb-10">
        <h4 className="text-neon font-bold text-[10px] tracking-[0.2em] uppercase mb-4">Price</h4>
          <div className="relative mb-4 mt-6 h-0.5 w-full bg-zinc-800">
            <div className="absolute left-1/4 right-0 h-full bg-zinc-500"></div>
           <div className="absolute left-[30%] -mt-1.5 w-3 h-3 bg-neon"></div>
        </div>
          <div className="flex justify-between text-[9px] font-bold tracking-widest text-zinc-400">
           <span>$0</span>
           <span>$500+</span>
        </div>
      </div>

      {/* Color Section */}
      <div className="mb-10">
        <h4 className="text-neon font-bold text-[10px] tracking-[0.2em] uppercase mb-4">Color</h4>
        <div className="flex flex-wrap gap-2">
          {colorOptions.map((color) => {
            const isActive = selectedColor === color.value;

            return (
              <button
                key={color.value}
                type="button"
                title={color.label}
                aria-label={color.label}
                onClick={() => onFilterChange('color', isActive ? '' : color.value)}
                className={`h-5 w-5 border focus:outline-none transition-all duration-300 ease-in-out ${color.swatchClass} ${isActive ? 'ring-2 ring-neon ring-offset-2 ring-offset-black' : ''}`}
              />
            );
          })}
        </div>
        {selectedColor && (
          <button
            type="button"
            className="mt-3 text-[10px] uppercase tracking-widest text-zinc-500 transition-all duration-300 ease-in-out hover:text-neon"
            onClick={() => onFilterChange('color', '')}
          >
            Clear Color
          </button>
        )}
      </div>
    </aside>
  );
};

export default SidebarFilter;
