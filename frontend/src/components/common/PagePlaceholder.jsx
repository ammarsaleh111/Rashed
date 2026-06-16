const PagePlaceholder = ({ eyebrow, title, description }) => {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/20 backdrop-blur md:p-12">
      <p className="font-display text-sm uppercase tracking-[0.45em] text-brand-300">{eyebrow}</p>
      <h1 className="mt-4 font-display text-4xl font-bold text-white md:text-6xl">{title}</h1>
      <p className="mt-5 max-w-2xl text-base leading-7 text-brand-50/75 md:text-lg">{description}</p>
    </section>
  );
};

export default PagePlaceholder;

