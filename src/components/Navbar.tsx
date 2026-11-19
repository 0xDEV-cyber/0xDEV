import React, { useEffect, useState } from 'react';
import { LogIn, LogOut, Menu, Moon, Sun, X } from 'lucide-react';
import { AnimatePresence, motion, useScroll, useSpring } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { NAV_LINKS, PageRoute } from '../data/siteData';
import { Logo } from './Logo';
import { PWAInstallButton } from './PWAControls';
import { UserAvatar } from './UserAvatar';

interface NavbarProps {
  currentPage: PageRoute;
  onNavigate: (page: PageRoute) => void;
  onOpenAuth?: (mode: 'login' | 'register') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPage, onNavigate, onOpenAuth }) => {
  const { user, profilePhotoUrl, signOutUser } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 220,
    damping: 30,
    restDelta: 0.001,
  });

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 18);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleLinkClick = (e: React.MouseEvent, page: PageRoute) => {
    e.preventDefault();
    setMobileOpen(false);
    onNavigate(page);
  };

  const handleSignOut = async () => {
    setMobileOpen(false);
    await signOutUser();
  };

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-200 print:hidden ${
        scrolled
          ? 'bg-white/95 dark:bg-[#090D1F]/95 backdrop-blur-md shadow-[0_8px_30px_rgba(26,20,100,0.08)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.45)] border-b border-[#E5E7F0] dark:border-[#242C54] py-3'
          : 'bg-white/95 dark:bg-[#090D1F]/95 backdrop-blur-sm border-b border-[#E5E7F0]/70 dark:border-[#242C54]/70 py-4'
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 xl:gap-8 px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Brand Wordmark */}
        <motion.a
          href="/"
          onClick={(e) => handleLinkClick(e, 'home')}
          aria-label="0xDEV Home"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="whitespace-nowrap shrink-0 rounded-md focus-visible:outline-2"
        >
          <Logo variant={isDark ? 'dark' : 'light'} />
        </motion.a>

        {/* Zone 2: Single-line Page Navigation Links */}
        <nav aria-label="Primary Navigation" className="hidden lg:flex items-center gap-3.5 xl:gap-5">
          {NAV_LINKS.map((link) => {
            const isActive = currentPage === link.id;
            return (
              <a
                key={link.id}
                href={link.path}
                onClick={(e) => handleLinkClick(e, link.id)}
                aria-current={isActive ? 'page' : undefined}
                className={`relative py-1.5 text-[13px] xl:text-sm font-semibold whitespace-nowrap shrink-0 transition-colors duration-150 ${
                  isActive
                    ? 'text-[#1A1464] dark:text-white'
                    : 'text-[#4A4F63] dark:text-[#B8C0DA] hover:text-[#1A1464] dark:hover:text-white'
                }`}
              >
                {link.label}
                {isActive && (
                  <motion.span
                    layoutId="navbar-active-underline"
                    aria-hidden="true"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    className="absolute left-0 right-0 -bottom-0.5 h-[2.5px] rounded-full bg-[#EE1119]"
                  />
                )}
              </a>
            );
          })}
        </nav>

        {/* Zone 3: Theme Toggle + Consultation CTA + PWA Install + Auth + Mobile Menu */}
        <div className="flex items-center gap-2 shrink-0">
          <motion.button
            type="button"
            onClick={toggleTheme}
            whileTap={{ scale: 0.94 }}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-pressed={isDark}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#141A38] text-[#1A1464] dark:text-[#F4F6FC] transition-colors hover:border-[#1A1464]/40 dark:hover:border-white/30 hover:bg-white dark:hover:bg-[#1C234B] shrink-0"
          >
            {isDark ? (
              <Sun className="h-4 w-4 text-amber-400" aria-hidden="true" />
            ) : (
              <Moon className="h-4 w-4 text-[#1A1464]" aria-hidden="true" />
            )}
          </motion.button>

          <div className="hidden xl:block">
            <PWAInstallButton compact />
          </div>

          <motion.a
            href="/contact"
            onClick={(e) => handleLinkClick(e, 'contact')}
            whileHover={{ y: -1.5 }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="hidden sm:inline-flex items-center justify-center rounded-xl bg-[#EE1119] px-3.5 xl:px-4 py-2 text-xs xl:text-sm font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-[#D00D14] whitespace-nowrap shrink-0"
          >
            Free Consultation
          </motion.a>

          {user ? (
            <div className="hidden sm:flex items-center gap-2">
              <motion.button
                type="button"
                onClick={() => onNavigate('dashboard')}
                whileTap={{ scale: 0.97 }}
                title={`Account & Profile Picture (${user.displayName || user.email || 'Member'})`}
                aria-label="Open account dashboard and profile settings"
                className={`inline-flex items-center gap-2 rounded-xl border p-1 pr-2.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  currentPage === 'dashboard'
                    ? 'border-[#1A1464] dark:border-[#7C8CFF] bg-[#F6F7FB] dark:bg-[#1C234B] text-[#1A1464] dark:text-white'
                    : 'border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] text-[#1A1464] dark:text-[#F4F6FC] hover:border-[#1A1464]/40 dark:hover:border-white/30 hover:bg-[#F6F7FB] dark:hover:bg-[#1C234B]'
                }`}
              >
                <UserAvatar
                  src={profilePhotoUrl}
                  name={user.displayName}
                  email={user.email}
                  size="sm"
                />
                <span className="max-w-[96px] truncate">
                  {user.displayName?.split(/\s+/)[0] || 'Account'}
                </span>
              </motion.button>
              <motion.button
                type="button"
                onClick={handleSignOut}
                whileTap={{ scale: 0.97 }}
                title={`Signed in as ${user.displayName || user.email || 'Member'}`}
                aria-label="Sign out"
                className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-3 py-2 text-xs font-semibold text-[#1A1464] dark:text-[#F4F6FC] transition-colors hover:border-[#1A1464]/40 dark:hover:border-white/30 hover:bg-[#F6F7FB] dark:hover:bg-[#1C234B] whitespace-nowrap shrink-0"
              >
                <LogOut className="h-3.5 w-3.5 text-[#EE1119]" aria-hidden="true" />
                <span>Sign Out</span>
              </motion.button>
            </div>
          ) : (
            onOpenAuth && (
              <motion.button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  onOpenAuth('login');
                }}
                whileTap={{ scale: 0.97 }}
                className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-3 py-2 text-xs font-semibold text-[#1A1464] dark:text-[#F4F6FC] transition-colors hover:border-[#1A1464]/40 dark:hover:border-white/30 hover:bg-[#F6F7FB] dark:hover:bg-[#1C234B] whitespace-nowrap shrink-0"
              >
                <LogIn className="h-3.5 w-3.5 text-[#EE1119]" aria-hidden="true" />
                <span>Sign In</span>
              </motion.button>
            )
          )}

          <motion.button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            whileTap={{ scale: 0.95 }}
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation-drawer"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] text-[#1A1464] dark:text-[#F4F6FC] transition-colors hover:bg-[#F6F7FB] dark:hover:bg-[#1C234B] lg:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </motion.button>
        </div>
      </div>

      {/* Scroll Progress Indicator */}
      <motion.div
        aria-hidden="true"
        className="absolute bottom-0 left-0 right-0 h-[2px] origin-left bg-[#EE1119]"
        style={{ scaleX }}
      />

      {/* Mobile Navigation Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            id="mobile-navigation-drawer"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="max-h-[calc(100dvh-4.5rem)] overflow-y-auto border-t border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#0D1229] px-4 pb-6 pt-4 shadow-lg lg:hidden"
          >
            <nav aria-label="Mobile Navigation" className="flex flex-col gap-1">
              <a
                href="/"
                onClick={(e) => handleLinkClick(e, 'home')}
                className={`flex items-center justify-between rounded-xl px-4 py-3 text-base font-semibold transition-colors ${
                  currentPage === 'home'
                    ? 'bg-[#F6F7FB] dark:bg-[#182044] text-[#1A1464] dark:text-white'
                    : 'text-[#4A4F63] dark:text-[#C2C9E0] hover:bg-[#F6F7FB] dark:hover:bg-[#141A38] hover:text-[#1A1464] dark:hover:text-white'
                }`}
              >
                <span>Home</span>
                {currentPage === 'home' && (
                  <span className="h-2 w-5 -skew-x-12 rounded-xs bg-[#EE1119]" aria-hidden="true" />
                )}
              </a>
              {NAV_LINKS.map((link) => {
                const isActive = currentPage === link.id;
                return (
                  <a
                    key={link.id}
                    href={link.path}
                    onClick={(e) => handleLinkClick(e, link.id)}
                    className={`flex items-center justify-between rounded-xl px-4 py-3 text-base font-semibold transition-colors ${
                      isActive
                        ? 'bg-[#F6F7FB] dark:bg-[#182044] text-[#1A1464] dark:text-white'
                        : 'text-[#4A4F63] dark:text-[#C2C9E0] hover:bg-[#F6F7FB] dark:hover:bg-[#141A38] hover:text-[#1A1464] dark:hover:text-white'
                    }`}
                  >
                    <span>{link.label}</span>
                    {isActive && (
                      <span className="h-2 w-5 -skew-x-12 rounded-xs bg-[#EE1119]" aria-hidden="true" />
                    )}
                  </a>
                );
              })}
              <div className="mt-3 pt-3 border-t border-[#E5E7F0] dark:border-[#242C54] space-y-2">
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="flex w-full items-center justify-between rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#141A38] px-4 py-3 text-sm font-semibold text-[#1A1464] dark:text-[#F4F6FC]"
                >
                  <span className="flex items-center gap-2">
                    {isDark ? (
                      <Sun className="h-4 w-4 text-amber-400" aria-hidden="true" />
                    ) : (
                      <Moon className="h-4 w-4 text-[#1A1464]" aria-hidden="true" />
                    )}
                    <span>Appearance</span>
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#6B7188] dark:text-[#8E97B8]">
                    {isDark ? 'Dark' : 'Light'}
                  </span>
                </button>
                <a
                  href="/contact"
                  onClick={(e) => handleLinkClick(e, 'contact')}
                  className="flex w-full items-center justify-center rounded-xl bg-[#EE1119] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#D00D14]"
                >
                  Get a Free Consultation
                </a>
                <div className="flex justify-center">
                  <PWAInstallButton />
                </div>
                {user ? (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMobileOpen(false);
                        onNavigate('dashboard');
                      }}
                      className="flex w-full items-center gap-3 rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#141A38] px-4 py-2.5 text-left"
                    >
                      <UserAvatar
                        src={profilePhotoUrl}
                        name={user.displayName}
                        email={user.email}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-[#1A1464] dark:text-[#F4F6FC]">
                          {user.displayName || '0xDEV Member'}
                        </p>
                        <p className="truncate text-xs text-[#6B7188] dark:text-[#8E97B8]">
                          Manage profile &amp; photo
                        </p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#141A38] px-5 py-3 text-sm font-semibold text-[#1A1464] dark:text-[#F4F6FC]"
                    >
                      <LogOut className="h-4 w-4 text-[#EE1119]" aria-hidden="true" />
                      <span>Sign Out ({user.email})</span>
                    </button>
                  </div>
                ) : (
                  onOpenAuth && (
                    <button
                      type="button"
                      onClick={() => {
                        setMobileOpen(false);
                        onOpenAuth('login');
                      }}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#141A38] px-5 py-3 text-sm font-semibold text-[#1A1464] dark:text-[#F4F6FC]"
                    >
                      <LogIn className="h-4 w-4 text-[#EE1119]" aria-hidden="true" />
                      <span>Sign In / Register</span>
                    </button>
                  )
                )}
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
