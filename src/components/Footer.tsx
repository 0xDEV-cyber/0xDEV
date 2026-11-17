import React, { useEffect, useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { COMPANY_CONTACT, NAV_LINKS, PageRoute, SERVICES } from '../data/siteData';
import { Logo } from './Logo';

interface FooterProps {
  onNavigate: (page: PageRoute) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState<'idle' | 'error' | 'subscribed'>('idle');
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setShowBackToTop(window.scrollY > 420);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newsletterEmail.trim())) {
      setNewsletterStatus('error');
      return;
    }
    setNewsletterStatus('subscribed');
    setNewsletterEmail('');
  };

  return (
    <>
      <footer className="bg-[#120D4A] text-white print:hidden">
        <div className="mx-auto max-w-7xl px-4 pt-16 pb-10 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-12">
            {/* Brand Summary */}
            <div className="lg:col-span-4">
              <a
                href="/"
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate('home');
                }}
                aria-label="0xDEV Home"
                className="inline-block"
              >
                <Logo variant="dark" />
              </a>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/75">
                One Team. Every Layer of Your Technology. Based in {COMPANY_CONTACT.location},
                we design, build, secure, and maintain software and cloud systems—open for local
                contracts and global freelance engagements.
              </p>
              <div className="mt-5 space-y-1.5 text-xs text-white/75">
                <p>
                  <span className="text-white/50">Lead Contact:</span> {COMPANY_CONTACT.leadName}
                </p>
                <p>
                  <a
                    href={`tel:${COMPANY_CONTACT.phoneRaw}`}
                    className="hover:text-[#EE1119] transition-colors"
                  >
                    {COMPANY_CONTACT.phoneDisplay}
                  </a>
                </p>
                <p>
                  <a
                    href={`mailto:${COMPANY_CONTACT.email}`}
                    className="hover:text-[#EE1119] transition-colors"
                  >
                    {COMPANY_CONTACT.email}
                  </a>
                </p>
                <p className="text-white/60">{COMPANY_CONTACT.location}</p>
              </div>
            </div>

            {/* Quick Links */}
            <div className="lg:col-span-2">
              <h3 className="font-display text-xs font-bold uppercase tracking-[0.15em] text-white/60">
                Pages
              </h3>
              <ul className="mt-4 space-y-2.5 text-sm">
                <li>
                  <a
                    href="/"
                    onClick={(e) => {
                      e.preventDefault();
                      onNavigate('home');
                    }}
                    className="text-white/80 transition-colors hover:text-[#EE1119]"
                  >
                    Home
                  </a>
                </li>
                {NAV_LINKS.map((link) => (
                  <li key={link.id}>
                    <a
                      href={link.path}
                      onClick={(e) => {
                        e.preventDefault();
                        onNavigate(link.id);
                      }}
                      className="text-white/80 transition-colors hover:text-[#EE1119]"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Core Services */}
            <div className="lg:col-span-3">
              <h3 className="font-display text-xs font-bold uppercase tracking-[0.15em] text-white/60">
                Core Capabilities
              </h3>
              <ul className="mt-4 space-y-2.5 text-sm">
                {SERVICES.slice(0, 6).map((svc) => (
                  <li key={svc.id}>
                    <a
                      href="/services"
                      onClick={(e) => {
                        e.preventDefault();
                        onNavigate('services');
                      }}
                      className="text-white/80 transition-colors hover:text-[#EE1119]"
                    >
                      {svc.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Newsletter Signup */}
            <div className="lg:col-span-3">
              <h3 className="font-display text-xs font-bold uppercase tracking-[0.15em] text-white/60">
                Engineering Briefings
              </h3>
              <p className="mt-4 text-sm text-white/75 leading-relaxed">
                Practical notes on software architecture, cloud cost optimization, and security.
              </p>
              <form onSubmit={handleNewsletterSubmit} noValidate className="mt-4">
                <label htmlFor="footer-newsletter" className="sr-only">
                  Email address for engineering briefings
                </label>
                <div className="flex gap-2">
                  <input
                    id="footer-newsletter"
                    type="email"
                    value={newsletterEmail}
                    onChange={(e) => {
                      setNewsletterEmail(e.target.value);
                      if (newsletterStatus !== 'idle') setNewsletterStatus('idle');
                    }}
                    placeholder="arigyewisdom7@gmail.com"
                    className="w-full min-w-0 rounded-xl border border-white/15 bg-white/10 px-3.5 py-2.5 text-sm text-white placeholder:text-white/45 focus:border-[#EE1119] focus:bg-white/15"
                  />
                  <button
                    type="submit"
                    className="shrink-0 rounded-xl bg-[#EE1119] px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#D00D14] whitespace-nowrap"
                  >
                    Subscribe
                  </button>
                </div>
                {newsletterStatus === 'error' && (
                  <p className="mt-2 text-xs text-[#EE1119]">Please enter a valid email address.</p>
                )}
                {newsletterStatus === 'subscribed' && (
                  <p className="mt-2 text-xs text-white/90" role="status">
                    Subscribed. Watch for our next engineering briefing.
                  </p>
                )}
              </form>
            </div>
          </div>

          <div className="mt-12 flex flex-col gap-4 border-t border-white/15 pt-8 sm:flex-row sm:items-center sm:justify-between text-xs text-white/65">
            <p>© 2026 0xDEV · Kabale, Uganda. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <a
                href="/contact"
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate('contact');
                }}
                className="hover:text-white transition-colors"
              >
                SLA &amp; Security Policy
              </a>
              <a
                href="/why-0xdev"
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate('why-0xdev');
                }}
                className="hover:text-white transition-colors"
              >
                Engagement FAQ
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Back to Top Button */}
      {showBackToTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Back to top"
          className="fixed right-5 bottom-20 z-40 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#1A1464] text-white shadow-[0_10px_25px_rgba(26,20,100,0.3)] border border-white/15 transition-all duration-150 hover:bg-[#EE1119] hover:-translate-y-0.5 print:hidden"
        >
          <ArrowUp className="h-5 w-5" aria-hidden="true" />
        </button>
      )}
    </>
  );
};
