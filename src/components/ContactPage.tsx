import React, { useEffect, useRef, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
} from 'firebase/firestore';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Globe,
  Lock,
  Mail,
  MapPin,
  Phone,
  Send,
  User,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { COUNTRIES, stripLeadingDialCode } from '../data/countries';
import { COMPANY_CONTACT, PageRoute, SERVICES } from '../data/siteData';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { DiscoveryBookingPanel } from './DiscoveryBookingPanel';
import { EASE_OUT_EXPO, Reveal, SPRING_SNAPPY } from './MotionPrimitives';
import { PageHeader } from './PageHeader';

interface ContactPageProps {
  preselectedService: string;
  preselectedBudget: string;
  preselectedMessage?: string;
  onNavigate: (page: PageRoute) => void;
  onRequestAuth?: () => void;
}

interface FormState {
  name: string;
  email: string;
  country: string;
  dialCode: string;
  phone: string;
  company: string;
  service: string;
  budget: string;
  message: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  country?: string;
  phone?: string;
  service?: string;
  message?: string;
  submit?: string;
}

interface SavedInquiry {
  inquiryId: string;
  service: string;
  budget: string;
  country: string;
  status: string;
  message: string;
  createdAtMs: number;
}

const BUDGET_RANGES = [
  'Freelance / Micro-Project (Under $5k)',
  '$5k – $15k',
  '$15k – $40k',
  '$40k – $100k',
  '$100k+',
  'Managed Retainer ($1.5k – $15k/mo)',
];

const CONTACT_DRAFT_STORAGE_KEY = '0xdev_contact_draft';

export const ContactPage: React.FC<ContactPageProps> = ({
  preselectedService,
  preselectedBudget,
  preselectedMessage,
  onNavigate,
  onRequestAuth,
}) => {
  const { user, resendVerificationEmail, refreshUserStatus } = useAuth();

  const [rightTab, setRightTab] = useState<'brief' | 'booking'>('brief');
  const [form, setForm] = useState<FormState>(() => {
    let saved: Partial<FormState> = {};
    try {
      const raw = window.sessionStorage.getItem(CONTACT_DRAFT_STORAGE_KEY);
      if (raw) saved = JSON.parse(raw) as Partial<FormState>;
    } catch {
      saved = {};
    }
    return {
      name: saved.name || user?.displayName || '',
      email: saved.email || user?.email || '',
      country: saved.country || '',
      dialCode: saved.dialCode || '',
      phone: saved.phone || '',
      company: saved.company || '',
      service: saved.service || SERVICES[0].title,
      budget: saved.budget || BUDGET_RANGES[2],
      message: saved.message || '',
    };
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);
  const [myInquiries, setMyInquiries] = useState<SavedInquiry[]>([]);
  const [verifyFeedback, setVerifyFeedback] = useState<string | null>(null);
  const [verifyBusy, setVerifyBusy] = useState(false);
  const didPrefillUserRef = useRef(false);

  useEffect(() => {
    if (preselectedService) {
      setForm((prev) => ({ ...prev, service: preselectedService }));
      setSubmittedRef(null);
      setRightTab('brief');
    }
  }, [preselectedService]);

  useEffect(() => {
    if (preselectedBudget) {
      const matched = BUDGET_RANGES.find((item) => item.includes(preselectedBudget));
      setForm((prev) => ({ ...prev, budget: matched || prev.budget }));
      setSubmittedRef(null);
      setRightTab('brief');
    }
  }, [preselectedBudget]);

  useEffect(() => {
    if (preselectedMessage) {
      setForm((prev) => ({ ...prev, message: preselectedMessage }));
      setSubmittedRef(null);
      setRightTab('brief');
    }
  }, [preselectedMessage]);

  useEffect(() => {
    if (!user) {
      didPrefillUserRef.current = false;
      return;
    }
    if (!didPrefillUserRef.current) {
      didPrefillUserRef.current = true;
      setForm((prev) => ({
        ...prev,
        name: prev.name || user.displayName || '',
        email: prev.email || user.email || '',
      }));
    }
    if (user.emailVerified) {
      setErrors((prev) => (prev.submit ? { ...prev, submit: undefined } : prev));
    }
  }, [user, user?.emailVerified]);

  // Listen to authenticated user's own submitted inquiries
  useEffect(() => {
    if (!user) {
      setMyInquiries([]);
      return;
    }
    const q = query(collection(db, 'inquiries'), where('authorId', '==', user.uid));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: SavedInquiry[] = snapshot.docs
          .map((d) => {
            const data = d.data();
            const createdAtMs =
              data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now();
            return {
              inquiryId: String(data.inquiryId || d.id),
              service: String(data.service || ''),
              budget: String(data.budget || ''),
              country: String(data.country || ''),
              status: String(data.status || 'submitted'),
              message: String(data.message || ''),
              createdAtMs,
            };
          })
          .sort((a, b) => b.createdAtMs - a.createdAtMs);
        setMyInquiries(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'inquiries');
      }
    );
    return () => unsubscribe();
  }, [user]);

  const handleCountryChange = (countryName: string) => {
    const selected = COUNTRIES.find((c) => c.name === countryName);
    const nextDialCode = selected ? selected.dialCode : '';

    setForm((prev) => {
      const localPart = stripLeadingDialCode(prev.phone, prev.dialCode);
      const nextPhone = nextDialCode
        ? localPart
          ? `${nextDialCode} ${localPart}`
          : `${nextDialCode} `
        : localPart;

      return {
        ...prev,
        country: countryName,
        dialCode: nextDialCode,
        phone: nextPhone,
      };
    });

    if (errors.country) {
      setErrors((prev) => ({ ...prev, country: undefined }));
    }
  };

  const validateForm = (): FormErrors => {
    const nextErrors: FormErrors = {};
    if (!form.name.trim() || form.name.trim().length < 2) {
      nextErrors.name = 'Please enter your full name.';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email.trim())) {
      nextErrors.email = 'Please enter a valid email address.';
    }
    if (!form.country) {
      nextErrors.country = 'Please select your country so we can apply the dialing code.';
    }
    const digitsOnly = form.phone.replace(/\D/g, '');
    if (digitsOnly.length < 7) {
      nextErrors.phone = 'Please enter a valid phone number including your local digits.';
    }
    if (!form.service) {
      nextErrors.service = 'Please select a primary service.';
    }
    if (!form.message.trim() || form.message.trim().length < 15) {
      nextErrors.message = 'Please share a brief summary of your project (at least 15 characters).';
    }
    return nextErrors;
  };

  const saveDraftAndRequestAuth = () => {
    try {
      window.sessionStorage.setItem(CONTACT_DRAFT_STORAGE_KEY, JSON.stringify(form));
    } catch {
      // Ignore storage quota errors
    }
    if (onRequestAuth) onRequestAuth();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validateForm();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    if (!user) {
      saveDraftAndRequestAuth();
      return;
    }

    if (!user.emailVerified) {
      setErrors({
        submit:
          'Please verify your email address first before submitting a project brief (check your inbox, then click "Refresh Verification Status" below).',
      });
      return;
    }

    setSubmitting(true);
    const inquiryId = `0X-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const path = `inquiries/${inquiryId}`;

    try {
      const payload: Record<string, unknown> = {
        inquiryId,
        authorId: user.uid,
        name: form.name.trim().slice(0, 100),
        email: form.email.trim().slice(0, 200),
        country: form.country.trim().slice(0, 100),
        dialCode: (form.dialCode.trim() || '+0').slice(0, 16),
        phone: form.phone.trim().slice(0, 40),
        service: form.service.trim().slice(0, 120),
        budget: form.budget.trim().slice(0, 80),
        message: form.message.trim().slice(0, 3000),
        status: 'submitted',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (form.company.trim()) {
        payload.company = form.company.trim().slice(0, 120);
      }

      await setDoc(doc(db, 'inquiries', inquiryId), payload);
      try {
        window.sessionStorage.removeItem(CONTACT_DRAFT_STORAGE_KEY);
      } catch {
        // ignore
      }
      setSubmittedRef(inquiryId);
    } catch (error) {
      setErrors({
        submit: 'Could not save your inquiry right now. Please verify your email and try again.',
      });
      handleFirestoreError(error, OperationType.CREATE, path);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setSubmittedRef(null);
    setForm((prev) => ({
      ...prev,
      country: '',
      dialCode: '',
      phone: '',
      company: '',
      message: '',
    }));
    setErrors({});
  };

  return (
    <>
      <PageHeader
        eyebrow="Start a Conversation"
        title="Talk directly with our Kabale team."
        description="Whether you need a full software and cloud crew or one senior developer for a sprint, send your brief below. Arigye Wisdom replies within one business day."
        currentLabel="Contact"
        onNavigate={onNavigate}
      />

      <section className="bg-white dark:bg-[#090D1F] py-16 sm:py-20 transition-colors">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 items-start">
            {/* Left Direct Details Column */}
            <Reveal delay={0.05} className="lg:col-span-5 space-y-6">
              <div className="rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#101530] p-6 sm:p-7">
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#EE1119]">
                  Direct Studio Contact
                </p>
                <h2 className="mt-2 font-display text-xl font-extrabold text-[#1A1464] dark:text-[#F4F6FC]">
                  {COMPANY_CONTACT.location}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[#4A4F63] dark:text-[#C2C9E0]">
                  Our office is in Kabale, Uganda. We meet local teams in person and work remotely
                  with founders and companies worldwide.
                </p>

                <div className="mt-6 space-y-4 border-t border-[#E5E7F0] dark:border-[#242C54] pt-5">
                  <div className="flex items-start gap-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-[#141A38] border border-[#E5E7F0] dark:border-[#242C54] text-[#1A1464] dark:text-[#9FA8FF]">
                      <User className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-[#6B7188] dark:text-[#8E97B8]">
                        Lead Architect &amp; Contact
                      </p>
                      <p className="text-sm font-bold text-[#1A1464] dark:text-[#F4F6FC]">
                        {COMPANY_CONTACT.leadName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-[#141A38] border border-[#E5E7F0] dark:border-[#242C54] text-[#1A1464] dark:text-[#9FA8FF]">
                      <Phone className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-[#6B7188] dark:text-[#8E97B8]">
                        Phone &amp; WhatsApp
                      </p>
                      <a
                        href={`tel:${COMPANY_CONTACT.phoneRaw}`}
                        className="font-display text-base font-bold text-[#1A1464] dark:text-[#F4F6FC] hover:text-[#EE1119] transition-colors"
                      >
                        {COMPANY_CONTACT.phoneDisplay}
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-[#141A38] border border-[#E5E7F0] dark:border-[#242C54] text-[#1A1464] dark:text-[#9FA8FF]">
                      <Mail className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-[#6B7188] dark:text-[#8E97B8]">
                        Email
                      </p>
                      <a
                        href={`mailto:${COMPANY_CONTACT.email}`}
                        className="block text-sm font-bold text-[#1A1464] dark:text-[#F4F6FC] hover:text-[#EE1119] transition-colors"
                      >
                        {COMPANY_CONTACT.email}
                      </a>
                      <a
                        href={`mailto:${COMPANY_CONTACT.studioEmail}`}
                        className="block text-xs font-medium text-[#6B7188] dark:text-[#8E97B8] hover:text-[#1A1464] dark:hover:text-white"
                      >
                        {COMPANY_CONTACT.studioEmail}
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-[#141A38] border border-[#E5E7F0] dark:border-[#242C54] text-[#1A1464] dark:text-[#9FA8FF]">
                      <MapPin className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-[#6B7188] dark:text-[#8E97B8]">
                        Physical Studio
                      </p>
                      <p className="text-sm font-semibold text-[#1A1464] dark:text-[#F4F6FC]">
                        {COMPANY_CONTACT.location}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-[#141A38] border border-[#E5E7F0] dark:border-[#242C54] text-[#1A1464] dark:text-[#9FA8FF]">
                      <Globe className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-[#6B7188] dark:text-[#8E97B8]">
                        Freelance &amp; Remote Availability
                      </p>
                      <p className="text-xs leading-relaxed text-[#4A4F63] dark:text-[#C2C9E0]">
                        {COMPANY_CONTACT.timezone}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {myInquiries.length > 0 && (
                <div className="rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-sm font-bold text-[#1A1464] dark:text-[#F4F6FC]">
                      Your Saved Inquiries ({myInquiries.length})
                    </h3>
                    <Clock className="h-4 w-4 text-[#EE1119]" aria-hidden="true" />
                  </div>
                  <div className="mt-4 space-y-3">
                    {myInquiries.map((item) => (
                      <div
                        key={item.inquiryId}
                        className="rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB]/60 dark:bg-[#101530] p-3.5 text-xs"
                      >
                        <div className="flex items-center justify-between font-bold text-[#1A1464] dark:text-[#F4F6FC]">
                          <span>{item.service}</span>
                          <span className="uppercase text-[#EE1119]">{item.status}</span>
                        </div>
                        <p className="mt-1 text-[#6B7188] dark:text-[#8E97B8]">
                          Ref: {item.inquiryId} · {item.budget}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Reveal>

            {/* Right Intake Form / Discovery Call Scheduler */}
            <Reveal delay={0.12} className="lg:col-span-7">
              <div className="relative rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] p-6 sm:p-9 shadow-[0_18px_45px_rgba(26,20,100,0.06)] dark:shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
                <div
                  aria-hidden="true"
                  className="absolute top-0 right-8 h-1.5 w-24 -skew-x-24 bg-[#EE1119]"
                />

                {/* Segmented Mode Switcher: Project Brief vs Discovery Call */}
                <div
                  className="mb-6 grid grid-cols-2 gap-1.5 rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#101530] p-1.5"
                  role="tablist"
                  aria-label="Contact options"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={rightTab === 'brief'}
                    onClick={() => setRightTab('brief')}
                    className={`relative inline-flex items-center justify-center gap-2 rounded-lg py-2.5 px-3 text-xs sm:text-sm font-bold transition-colors ${
                      rightTab === 'brief'
                        ? 'text-white'
                        : 'text-[#4A4F63] dark:text-[#C2C9E0] hover:text-[#1A1464] dark:hover:text-white'
                    }`}
                  >
                    {rightTab === 'brief' && (
                      <motion.span
                        layoutId="contact-mode-pill"
                        aria-hidden="true"
                        transition={SPRING_SNAPPY}
                        className="absolute inset-0 rounded-lg bg-[#1A1464] dark:bg-[#2E368F] shadow-sm"
                      />
                    )}
                    <Send className="relative z-10 h-3.5 w-3.5" aria-hidden="true" />
                    <span className="relative z-10">Send Project Brief</span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={rightTab === 'booking'}
                    onClick={() => setRightTab('booking')}
                    className={`relative inline-flex items-center justify-center gap-2 rounded-lg py-2.5 px-3 text-xs sm:text-sm font-bold transition-colors ${
                      rightTab === 'booking'
                        ? 'text-white'
                        : 'text-[#4A4F63] dark:text-[#C2C9E0] hover:text-[#1A1464] dark:hover:text-white'
                    }`}
                  >
                    {rightTab === 'booking' && (
                      <motion.span
                        layoutId="contact-mode-pill"
                        aria-hidden="true"
                        transition={SPRING_SNAPPY}
                        className="absolute inset-0 rounded-lg bg-[#1A1464] dark:bg-[#2E368F] shadow-sm"
                      />
                    )}
                    <Calendar className="relative z-10 h-3.5 w-3.5" aria-hidden="true" />
                    <span className="relative z-10">Book 30-Min Discovery Call</span>
                  </button>
                </div>

                <AnimatePresence mode="wait">
                  {rightTab === 'booking' ? (
                    <motion.div
                      key="contact-tab-booking"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.22, ease: EASE_OUT_EXPO }}
                    >
                      <DiscoveryBookingPanel onRequestAuth={saveDraftAndRequestAuth} />
                    </motion.div>
                  ) : submittedRef ? (
                    <motion.div
                      key="contact-tab-submitted"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.22, ease: EASE_OUT_EXPO }}
                      className="py-6"
                      role="status"
                      aria-live="polite"
                    >
                      <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1A1464] dark:bg-[#232B6E] text-white">
                        <CheckCircle2 className="h-7 w-7 text-[#EE1119]" aria-hidden="true" />
                      </div>
                    <h2 className="mt-5 font-display text-2xl font-extrabold text-[#1A1464] dark:text-[#F4F6FC]">
                      Project Brief Saved
                    </h2>
                    <p className="mt-2 text-base leading-relaxed text-[#4A4F63] dark:text-[#C2C9E0]">
                      Thank you, <strong className="text-[#1A1464] dark:text-white">{form.name}</strong>. Your
                      inquiry has been stored under reference{' '}
                      <span className="font-display font-bold text-[#EE1119]">{submittedRef}</span>.
                      {` ${COMPANY_CONTACT.leadName}`} will reach out via {form.email} or{' '}
                      {form.phone} within one business day.
                    </p>

                    <div className="mt-6 rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#101530] p-4 text-xs sm:text-sm space-y-1.5 text-[#4A4F63] dark:text-[#C2C9E0]">
                      <p>
                        <strong className="text-[#1A1464] dark:text-[#F4F6FC]">Country:</strong> {form.country} (
                        {form.dialCode})
                      </p>
                      <p>
                        <strong className="text-[#1A1464] dark:text-[#F4F6FC]">Phone:</strong> {form.phone}
                      </p>
                      <p>
                        <strong className="text-[#1A1464] dark:text-[#F4F6FC]">Service:</strong> {form.service}
                      </p>
                      <p>
                        <strong className="text-[#1A1464] dark:text-[#F4F6FC]">Budget Range:</strong> {form.budget}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleResetForm}
                      className="mt-6 inline-flex items-center gap-2 rounded-xl border border-[#1A1464] dark:border-[#3A437A] px-5 py-2.5 text-sm font-semibold text-[#1A1464] dark:text-[#F4F6FC] transition-colors hover:bg-[#1A1464] dark:hover:bg-[#2E368F] hover:text-white"
                    >
                      Submit Another Inquiry
                    </button>
                    </motion.div>
                  ) : (
                    <motion.form
                      key="contact-tab-form"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.22, ease: EASE_OUT_EXPO }}
                      onSubmit={handleSubmit}
                      noValidate
                      className="space-y-5"
                    >
                    <div className="border-b border-[#E5E7F0] dark:border-[#242C54] pb-4">
                      <h2 className="font-display text-xl font-extrabold text-[#1A1464] dark:text-[#F4F6FC]">
                        Request a Free Consultation or Freelance Quote
                      </h2>
                      <p className="mt-1 text-xs sm:text-sm text-[#6B7188] dark:text-[#8E97B8]">
                        Select your country to auto-fill your international dialing code.
                      </p>
                    </div>

                    {errors.submit && (
                      <div
                        role="alert"
                        className="rounded-xl border border-[#EE1119]/40 bg-[#EE1119]/5 dark:bg-[#EE1119]/10 p-4 text-xs sm:text-sm text-[#1A1464] dark:text-[#F4F6FC]"
                      >
                        <p className="font-semibold">{errors.submit}</p>
                        {!user?.emailVerified && (
                          <div className="mt-2 flex flex-wrap items-center gap-3">
                            <button
                              type="button"
                              disabled={verifyBusy}
                              onClick={async () => {
                                setVerifyBusy(true);
                                setVerifyFeedback(null);
                                try {
                                  await resendVerificationEmail();
                                  setVerifyFeedback('Verification email sent. Check your inbox.');
                                } catch {
                                  setVerifyFeedback(
                                    'Unable to send another email just now. Please wait a moment.'
                                  );
                                } finally {
                                  setVerifyBusy(false);
                                }
                              }}
                              className="font-bold text-[#EE1119] hover:underline disabled:opacity-60"
                            >
                              Resend Verification Email
                            </button>
                            <button
                              type="button"
                              disabled={verifyBusy}
                              onClick={async () => {
                                setVerifyBusy(true);
                                setVerifyFeedback(null);
                                try {
                                  const verified = await refreshUserStatus();
                                  setVerifyFeedback(
                                    verified
                                      ? 'Email verified! You can submit your brief now.'
                                      : 'Still awaiting verification. Please click the link in your inbox.'
                                  );
                                } catch {
                                  setVerifyFeedback(
                                    'Could not refresh verification status. Please try again.'
                                  );
                                } finally {
                                  setVerifyBusy(false);
                                }
                              }}
                              className="font-bold text-[#1A1464] dark:text-[#9FA8FF] hover:underline disabled:opacity-60"
                            >
                              Refresh Verification Status
                            </button>
                          </div>
                        )}
                        {verifyFeedback && (
                          <p className="mt-2 text-xs font-medium text-[#4A4F63] dark:text-[#C2C9E0]">
                            {verifyFeedback}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor="contact-name"
                          className="block text-xs font-bold uppercase tracking-wider text-[#1A1464] dark:text-[#F4F6FC]"
                        >
                          Full Name <span className="text-[#EE1119]">*</span>
                        </label>
                        <input
                          id="contact-name"
                          type="text"
                          value={form.name}
                          onChange={(e) => {
                            setForm({ ...form, name: e.target.value });
                            if (errors.name) setErrors({ ...errors, name: undefined });
                          }}
                          placeholder="Your full name"
                          aria-invalid={Boolean(errors.name)}
                          className={`mt-2 w-full rounded-xl border px-4 py-3 text-sm text-[#1A1464] dark:text-white bg-[#F6F7FB]/50 dark:bg-[#101530] placeholder:text-[#6B7188]/70 dark:placeholder:text-[#8E97B8]/70 transition-colors focus:bg-white dark:focus:bg-[#182044] ${
                            errors.name ? 'border-[#EE1119]' : 'border-[#E5E7F0] dark:border-[#242C54] focus:border-[#1A1464] dark:focus:border-[#7C8CFF]'
                          }`}
                        />
                        {errors.name && (
                          <p className="mt-1.5 text-xs font-semibold text-[#EE1119]">{errors.name}</p>
                        )}
                      </div>

                      <div>
                        <label
                          htmlFor="contact-email"
                          className="block text-xs font-bold uppercase tracking-wider text-[#1A1464] dark:text-[#F4F6FC]"
                        >
                          Email Address <span className="text-[#EE1119]">*</span>
                        </label>
                        <input
                          id="contact-email"
                          type="email"
                          value={form.email}
                          onChange={(e) => {
                            setForm({ ...form, email: e.target.value });
                            if (errors.email) setErrors({ ...errors, email: undefined });
                          }}
                          placeholder="Your email address"
                          aria-invalid={Boolean(errors.email)}
                          className={`mt-2 w-full rounded-xl border px-4 py-3 text-sm text-[#1A1464] dark:text-white bg-[#F6F7FB]/50 dark:bg-[#101530] placeholder:text-[#6B7188]/70 dark:placeholder:text-[#8E97B8]/70 transition-colors focus:bg-white dark:focus:bg-[#182044] ${
                            errors.email
                              ? 'border-[#EE1119]'
                              : 'border-[#E5E7F0] dark:border-[#242C54] focus:border-[#1A1464] dark:focus:border-[#7C8CFF]'
                          }`}
                        />
                        {errors.email && (
                          <p className="mt-1.5 text-xs font-semibold text-[#EE1119]">{errors.email}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor="contact-country"
                          className="block text-xs font-bold uppercase tracking-wider text-[#1A1464] dark:text-[#F4F6FC]"
                        >
                          Country <span className="text-[#EE1119]">*</span>
                        </label>
                        <select
                          id="contact-country"
                          value={form.country}
                          onChange={(e) => handleCountryChange(e.target.value)}
                          aria-invalid={Boolean(errors.country)}
                          className={`mt-2 w-full rounded-xl border px-4 py-3 text-sm font-medium text-[#1A1464] dark:text-white bg-[#F6F7FB]/50 dark:bg-[#101530] transition-colors focus:bg-white dark:focus:bg-[#182044] ${
                            errors.country
                              ? 'border-[#EE1119]'
                              : 'border-[#E5E7F0] dark:border-[#242C54] focus:border-[#1A1464] dark:focus:border-[#7C8CFF]'
                          }`}
                        >
                          <option value="">Select your country...</option>
                          {COUNTRIES.map((country) => (
                            <option key={country.iso} value={country.name}>
                              {country.name} ({country.dialCode})
                            </option>
                          ))}
                        </select>
                        {errors.country && (
                          <p className="mt-1.5 text-xs font-semibold text-[#EE1119]">
                            {errors.country}
                          </p>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center justify-between">
                          <label
                            htmlFor="contact-phone"
                            className="block text-xs font-bold uppercase tracking-wider text-[#1A1464] dark:text-[#F4F6FC]"
                          >
                            Phone / WhatsApp <span className="text-[#EE1119]">*</span>
                          </label>
                          {form.dialCode && (
                            <span className="text-[11px] font-bold text-[#EE1119]">
                              Code: {form.dialCode}
                            </span>
                          )}
                        </div>
                        <input
                          id="contact-phone"
                          type="tel"
                          value={form.phone}
                          onChange={(e) => {
                            setForm({ ...form, phone: e.target.value });
                            if (errors.phone) setErrors({ ...errors, phone: undefined });
                          }}
                          placeholder="Phone or WhatsApp number"
                          aria-invalid={Boolean(errors.phone)}
                          className={`mt-2 w-full rounded-xl border px-4 py-3 text-sm text-[#1A1464] dark:text-white bg-[#F6F7FB]/50 dark:bg-[#101530] placeholder:text-[#6B7188]/70 dark:placeholder:text-[#8E97B8]/70 transition-colors focus:bg-white dark:focus:bg-[#182044] ${
                            errors.phone
                              ? 'border-[#EE1119]'
                              : 'border-[#E5E7F0] dark:border-[#242C54] focus:border-[#1A1464] dark:focus:border-[#7C8CFF]'
                          }`}
                        />
                        {errors.phone && (
                          <p className="mt-1.5 text-xs font-semibold text-[#EE1119]">{errors.phone}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor="contact-company"
                          className="block text-xs font-bold uppercase tracking-wider text-[#1A1464] dark:text-[#F4F6FC]"
                        >
                          Company / Project Name
                        </label>
                        <input
                          id="contact-company"
                          type="text"
                          value={form.company}
                          onChange={(e) => setForm({ ...form, company: e.target.value })}
                          placeholder="Company or project name (optional)"
                          className="mt-2 w-full rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB]/50 dark:bg-[#101530] px-4 py-3 text-sm text-[#1A1464] dark:text-white placeholder:text-[#6B7188]/70 dark:placeholder:text-[#8E97B8]/70 transition-colors focus:border-[#1A1464] dark:focus:border-[#7C8CFF] focus:bg-white dark:focus:bg-[#182044]"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="contact-service"
                          className="block text-xs font-bold uppercase tracking-wider text-[#1A1464] dark:text-[#F4F6FC]"
                        >
                          Primary Service <span className="text-[#EE1119]">*</span>
                        </label>
                        <select
                          id="contact-service"
                          value={form.service}
                          onChange={(e) => setForm({ ...form, service: e.target.value })}
                          className="mt-2 w-full rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB]/50 dark:bg-[#101530] px-4 py-3 text-sm font-medium text-[#1A1464] dark:text-white transition-colors focus:border-[#1A1464] dark:focus:border-[#7C8CFF] focus:bg-white dark:focus:bg-[#182044]"
                        >
                          {SERVICES.map((svc) => (
                            <option key={svc.id} value={svc.title}>
                              {svc.title}
                            </option>
                          ))}
                          <option value="Full-Stack (Multiple Layers)">
                            Full-Stack (Multiple Layers)
                          </option>
                          <option value="Freelance Engineering Support">
                            Freelance Engineering Support
                          </option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="contact-budget"
                        className="block text-xs font-bold uppercase tracking-wider text-[#1A1464] dark:text-[#F4F6FC]"
                      >
                        Estimated Budget Range
                      </label>
                      <select
                        id="contact-budget"
                        value={form.budget}
                        onChange={(e) => setForm({ ...form, budget: e.target.value })}
                        className="mt-2 w-full rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB]/50 dark:bg-[#101530] px-4 py-3 text-sm font-medium text-[#1A1464] dark:text-white transition-colors focus:border-[#1A1464] dark:focus:border-[#7C8CFF] focus:bg-white dark:focus:bg-[#182044]"
                      >
                        {BUDGET_RANGES.map((range) => (
                          <option key={range} value={range}>
                            {range}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="contact-message"
                        className="block text-xs font-bold uppercase tracking-wider text-[#1A1464] dark:text-[#F4F6FC]"
                      >
                        Project Scope &amp; Goals <span className="text-[#EE1119]">*</span>
                      </label>
                      <textarea
                        id="contact-message"
                        rows={4}
                        value={form.message}
                        onChange={(e) => {
                          setForm({ ...form, message: e.target.value });
                          if (errors.message) setErrors({ ...errors, message: undefined });
                        }}
                        placeholder="Describe what you are building, whether this is a freelance task or full product build, and your target timeline..."
                        aria-invalid={Boolean(errors.message)}
                        className={`mt-2 w-full rounded-xl border px-4 py-3 text-sm text-[#1A1464] dark:text-white bg-[#F6F7FB]/50 dark:bg-[#101530] placeholder:text-[#6B7188]/70 dark:placeholder:text-[#8E97B8]/70 transition-colors focus:bg-white dark:focus:bg-[#182044] ${
                          errors.message
                            ? 'border-[#EE1119]'
                            : 'border-[#E5E7F0] dark:border-[#242C54] focus:border-[#1A1464] dark:focus:border-[#7C8CFF]'
                        }`}
                      />
                      {errors.message && (
                        <p className="mt-1.5 text-xs font-semibold text-[#EE1119]">
                          {errors.message}
                        </p>
                      )}
                    </div>

                    {!user ? (
                      <div className="rounded-xl border border-[#1A1464]/20 dark:border-[#2B3466] bg-[#F6F7FB] dark:bg-[#101530] p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-xs text-[#4A4F63] dark:text-[#C2C9E0]">
                          Sign in or register free to save your project brief and unlock your live
                          0xDEV client timeline, chat, and invoices. Your draft is preserved.
                        </p>
                        <button
                          type="button"
                          onClick={saveDraftAndRequestAuth}
                          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#EE1119] px-5 py-3 text-xs sm:text-sm font-bold text-white shadow-[0_10px_24px_rgba(238,17,25,0.22)] hover:bg-[#D00D14] whitespace-nowrap"
                        >
                          <Lock className="h-4 w-4" aria-hidden="true" />
                          <span>Sign In &amp; Submit Brief</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2">
                        <p className="text-xs text-[#6B7188] dark:text-[#8E97B8]">
                          Direct reply from {COMPANY_CONTACT.leadName} · Protected under NDA on
                          request.
                        </p>
                        <button
                          type="submit"
                          disabled={submitting}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#EE1119] px-7 py-3.5 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(238,17,25,0.22)] transition-all duration-150 hover:bg-[#D00D14] disabled:opacity-60 whitespace-nowrap"
                        >
                          <span>{submitting ? 'Saving Brief...' : 'Send Project Brief'}</span>
                          <Send className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    )}
                    </motion.form>
                  )}
                </AnimatePresence>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
};
