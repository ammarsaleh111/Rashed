import { useEffect, useState } from 'react';

import { useAppContext } from '../context/AppContext.jsx';
import { submitContactMessage } from '../services/api/contact.js';

const ContactPage = () => {
  const { authUser } = useAppContext();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    subject: '',
    message: '',
  });

  useEffect(() => {
    if (!authUser) {
      return;
    }

    setFormData((current) => ({
      ...current,
      fullName:
        current.fullName || `${String(authUser.firstName || '').trim()} ${String(authUser.lastName || '').trim()}`.trim(),
      email: current.email || String(authUser.email || ''),
    }));

  }, [authUser]);

  const handleFieldChange = (key, value) => {
    setFormData((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setStatusMessage('');

    setIsSubmitting(true);
    try {
      await submitContactMessage({
        full_name: formData.fullName,
        email: formData.email,
        subject: formData.subject,
        message: formData.message,
      });

      setStatusMessage('Message sent. We will reply soon.');
      setFormData((current) => ({
        ...current,
        subject: '',
        message: '',
      }));
    } catch (error) {
      setErrorMessage(error?.response?.data?.message || 'Unable to send your message right now.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-5xl px-2 py-3 text-white md:px-4">
      <div className="storefront-shell p-5 sm:p-8">
        <p className="storefront-kicker">Customer Support</p>
        <h1 className="storefront-title mt-3 text-[clamp(2.6rem,6vw,4.6rem)] text-white">
          Contact Rashed
        </h1>
        <p className="storefront-subtitle mt-4 max-w-2xl">
          Questions about orders, sizing, or products. We are here to help.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55">Full Name</span>
              <input
                value={formData.fullName}
                onChange={(event) => handleFieldChange('fullName', event.target.value)}
                type="text"
                required
                className="storefront-input"
              />
            </label>

            <label className="space-y-2">
              <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55">Email</span>
              <input
                value={formData.email}
                onChange={(event) => handleFieldChange('email', event.target.value)}
                type="email"
                required
                className="storefront-input"
              />
            </label>
          </div>

          <label className="space-y-2 block">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55">Subject</span>
            <input
              value={formData.subject}
              onChange={(event) => handleFieldChange('subject', event.target.value)}
              type="text"
              required
              className="storefront-input"
            />
          </label>

          <label className="space-y-2 block">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55">Message</span>
            <textarea
              value={formData.message}
              onChange={(event) => handleFieldChange('message', event.target.value)}
              required
              minLength={10}
              rows={7}
              className="storefront-input resize-none"
            />
          </label>

          {statusMessage && <p className="text-[11px] uppercase tracking-widest text-neon">{statusMessage}</p>}
          {errorMessage && <p className="text-[11px] uppercase tracking-widest text-red-400">{errorMessage}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="storefront-primary px-7 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>
    </section>
  );
};

export default ContactPage;
