import { Link, useSearchParams } from 'react-router-dom';

const copyByVariant = {
  help: {
    eyebrow: 'Support Center',
    title: 'Need Help?',
    description:
      'Quick access to account, orders, and support links.',
    primaryLabel: 'Go To Shop',
    primaryTo: '/shop',
    secondaryLabel: 'Open Dashboard',
    secondaryTo: '/dashboard',
    sections: [
      {
        title: 'Account',
        body: 'Sign in or register from one auth screen, then continue to your dashboard.',
      },
      {
        title: 'Orders',
        body: 'Cart, checkout, and order history are connected and live.',
      },
      {
        title: 'Social Login',
        body: 'External providers are not connected yet.',
      },
    ],
  },
  terms: {
    eyebrow: 'Legal',
    title: 'Terms of Service',
    description:
      'How the store, accounts, and orders are handled.',
    primaryLabel: 'Back To Shop',
    primaryTo: '/shop',
    secondaryLabel: 'Privacy Policy',
    secondaryTo: '/privacy',
    sections: [
      {
        title: 'Accounts',
        body: 'Keep your account credentials secure.',
      },
      {
        title: 'Orders',
        body: 'Orders depend on stock and confirmation.',
      },
      {
        title: 'Content',
        body: 'Product content can change as collections update.',
      },
    ],
  },
  privacy: {
    eyebrow: 'Legal',
    title: 'Privacy Policy',
    description:
      'How account and order data is used inside the store.',
    primaryLabel: 'Back To Shop',
    primaryTo: '/shop',
    secondaryLabel: 'Terms Of Service',
    secondaryTo: '/terms',
    sections: [
      {
        title: 'Account Data',
        body: 'Profile data is used for secure access and personalization.',
      },
      {
        title: 'Cart And Orders',
        body: 'Cart and order data is stored to keep checkout continuous.',
      },
      {
        title: 'Session Handling',
        body: 'Guest sessions are used to keep cart items before login.',
      },
    ],
  },
};

const StaticInfoPage = ({ variant = 'help' }) => {
  const [searchParams] = useSearchParams();
  const resolvedVariant = copyByVariant[variant] ? variant : 'help';
  const content = copyByVariant[resolvedVariant];
  const topic = searchParams.get('topic');

  return (
    <section className="mx-auto w-full max-w-5xl px-2 py-3 text-white md:px-4">
      <div className="storefront-shell p-5 sm:p-10">
        <p className="storefront-kicker">{content.eyebrow}</p>
        <h1 className="storefront-title mt-3 text-[clamp(2.6rem,6vw,4.8rem)] text-white">
          {content.title}
        </h1>
        <p className="storefront-subtitle mt-4 max-w-2xl">{content.description}</p>

        {topic === 'oauth' && resolvedVariant === 'help' && (
          <div className="storefront-surface mt-6 p-4 text-sm text-white/70">
            Social login buttons point here until providers are connected.
          </div>
        )}

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {content.sections.map((section) => (
            <article key={section.title} className="storefront-surface p-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/50">{section.title}</p>
              <p className="mt-2 text-sm text-white/72">{section.body}</p>
            </article>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to={content.primaryTo}
            className="storefront-primary px-6"
          >
            {content.primaryLabel}
          </Link>
          <Link
            to={content.secondaryTo}
            className="storefront-secondary px-6"
          >
            {content.secondaryLabel}
          </Link>
        </div>
      </div>
    </section>
  );
};

export default StaticInfoPage;
