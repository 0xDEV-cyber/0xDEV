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
  CheckCircle2,
  Clock,
  Globe,
  Mail,
  MapPin,
  Phone,
  Send,
  User,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { COUNTRIES, stripLeadingDialCode } from '../data/countries';
import { COMPANY_CONTACT, PageRoute, SERVICES } from '../data/siteData';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { PageHeader } from './PageHeader';

interface ContactPageProps {
  preselectedService: string;
  preselectedBudget: string;
  onNavigate: (page: PageRoute) => void;
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

export const ContactPage: React.FC<ContactPageProps> = ({
  preselectedService,
  preselectedBudget,
  onNavigate,
}) => {
  const { user, resendVerificationEmail, refreshUserStatus } = useAuth();

  const [form, setForm] = useState<FormState>({
    name: user?.displayName || '',
    email: user?.email || '',
    country: '',
    dialCode: '',
    phone: '',
    company: '',
    service: SERVICES[0].title,
    budget: BUDGET_RANGES[2],
    message: '',
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
    }
  }, [preselectedService]);

  useEffect(() => {
    if (preselectedBudget) {
      const matched = BUDGET_RANGES.find((item) => item.includes(preselectedBudget));
      setForm((prev) => ({ ...prev, budget: matched || prev.budget }));
      setSubmittedRef(null);
    }
  }, [preselectedBudget]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validateForm();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0 || !user) return;

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
        title="Speak directly with our Kabale studio."
        description="Whether you need a complete software and cloud team or a focused freelance developer, share your brief below and Arigye Wisdom will reply within one business day."
        currentLabel="Contact"
        onNavigate={onNavigate}
      />

      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 items-start">
            {/* Left Direct Details Column */}
            <div className="lg:col-span-5 space-y-6">
              <div className="rounded-2xl border border-[#E5E7F0] bg-[#F6F7FB] p-6 sm:p-7">
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#EE1119]">
                  Direct Studio Contact
                </p>
                <h2 className="mt-2 font-display text-xl font-extrabold text-[#1A1464]">
                  {COMPANY_CONTACT.location}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[#4A4F63]">
                  We are physically located in Kabale, Uganda and welcome both in-person meetings
                  and remote or freelance collaborations globally.
                </p>

                <div className="mt-6 space-y-4 border-t border-[#E5E7F0] pt-5">
                  <div className="flex items-start gap-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white border border-[#E5E7F0] text-[#1A1464]">
                      <User className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-[#6B7188]">
                        Lead Architect &amp; Contact
                      </p>
                      <p className="text-sm font-bold text-[#1A1464]">
                        {COMPANY_CONTACT.leadName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white border border-[#E5E7F0] text-[#1A1464]">
                      <Phone className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-[#6B7188]">
                        Phone &amp; WhatsApp
                      </p>
                      <a
                        href={`tel:${COMPANY_CONTACT.phoneRaw}`}
                        className="font-display text-base font-bold text-[#1A1464] hover:text-[#EE1119] transition-colors"
                      >
                        {COMPANY_CONTACT.phoneDisplay}
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white border border-[#E5E7F0] text-[#1A1464]">
                      <Mail className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-[#6B7188]">
                        Email
                      </p>
                      <a
                        href={`mailto:${COMPANY_CONTACT.email}`}
                        className="block text-sm font-bold text-[#1A1464] hover:text-[#EE1119] transition-colors"
                      >
                        {COMPANY_CONTACT.email}
                      </a>
                      <a
                        href={`mailto:${COMPANY_CONTACT.studioEmail}`}
                        className="block text-xs font-medium text-[#6B7188] hover:text-[#1A1464]"
                      >
                        {COMPANY_CONTACT.studioEmail}
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white border border-[#E5E7F0] text-[#1A1464]">
                      <MapPin className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-[#6B7188]">
                        Physical Studio
                      </p>
                      <p className="text-sm font-semibold text-[#1A1464]">
                        {COMPANY_CONTACT.location}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white border border-[#E5E7F0] text-[#1A1464]">
                      <Globe className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-[#6B7188]">
                        Freelance &amp; Remote Availability
                      </p>
                      <p className="text-xs leading-relaxed text-[#4A4F63]">
                        {COMPANY_CONTACT.timezone}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {myInquiries.length > 0 && (
                <div className="rounded-2xl border border-[#E5E7F0] bg-white p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-sm font-bold text-[#1A1464]">
                      Your Saved Inquiries ({myInquiries.length})
                    </h3>
                    <Clock className="h-4 w-4 text-[#EE1119]" aria-hidden="true" />
                  </div>
                  <div className="mt-4 space-y-3">
                    {myInquiries.map((item) => (
                      <div
                        key={item.inquiryId}
                        className="rounded-xl border border-[#E5E7F0] bg-[#F6F7FB]/60 p-3.5 text-xs"
                      >
                        <div className="flex items-center justify-between font-bold text-[#1A1464]">
                          <span>{item.service}</span>
                          <span className="uppercase text-[#EE1119]">{item.status}</span>
                        </div>
                        <p className="mt-1 text-[#6B7188]">
                          Ref: {item.inquiryId} · {item.budget}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Intake Form */}
            <div className="lg:col-span-7">
              <div className="relative rounded-2xl border border-[#E5E7F0] bg-white p-6 sm:p-9 shadow-[0_18px_45px_rgba(26,20,100,0.06)]">
                <div
                  aria-hidden="true"
                  className="absolute top-0 right-8 h-1.5 w-24 -skew-x-24 bg-[#EE1119]"
                />

                {submittedRef ? (
                  <div className="py-6" role="status" aria-live="polite">
                    <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#1A1464] text-white">
                      <CheckCircle2 className="h-7 w-7 text-[#EE1119]" aria-hidden="true" />
                    </div>
                    <h2 className="mt-5 font-display text-2xl font-extrabold text-[#1A1464]">
                      Project Brief Saved
                    </h2>
                    <p className="mt-2 text-base leading-relaxed text-[#4A4F63]">
                      Thank you, <strong className="text-[#1A1464]">{form.name}</strong>. Your
                      inquiry has been stored under reference{' '}
                      <span className="font-display font-bold text-[#EE1119]">{submittedRef}</span>.
                      {` ${COMPANY_CONTACT.leadName}`} will reach out via {form.email} or{' '}
                      {form.phone} within one business day.
                    </p>

                    <div className="mt-6 rounded-xl border border-[#E5E7F0] bg-[#F6F7FB] p-4 text-xs sm:text-sm space-y-1.5">
                      <p>
                        <strong className="text-[#1A1464]">Country:</strong> {form.country} (
                        {form.dialCode})
                      </p>
                      <p>
                        <strong className="text-[#1A1464]">Phone:</strong> {form.phone}
                      </p>
                      <p>
                        <strong className="text-[#1A1464]">Service:</strong> {form.service}
                      </p>
                      <p>
                        <strong className="text-[#1A1464]">Budget Range:</strong> {form.budget}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleResetForm}
                      className="mt-6 inline-flex items-center gap-2 rounded-xl border border-[#1A1464] px-5 py-2.5 text-sm font-semibold text-[#1A1464] transition-colors hover:bg-[#1A1464] hover:text-white"
                    >
                      Submit Another Inquiry
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} noValidate className="space-y-5">
                    <div className="border-b border-[#E5E7F0] pb-4">
                      <h2 className="font-display text-xl font-extrabold text-[#1A1464]">
                        Request a Free Consultation or Freelance Quote
                      </h2>
                      <p className="mt-1 text-xs sm:text-sm text-[#6B7188]">
                        Select your country to auto-fill your international dialing code.
                      </p>
                    </div>

                    {errors.submit && (
                      <div
                        role="alert"
                        className="rounded-xl border border-[#EE1119]/40 bg-[#EE1119]/5 p-4 text-xs sm:text-sm text-[#1A1464]"
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
                                      : 'Still awaiting verification—please click the link in your inbox.'
                                  );
                                } catch {
                                  setVerifyFeedback(
                                    'Could not refresh verification status. Please try again.'
                                  );
                                } finally {
                                  setVerifyBusy(false);
                                }
                              }}
                              className="font-bold text-[#1A1464] hover:underline disabled:opacity-60"
                            >
                              Refresh Verification Status
                            </button>
                          </div>
                        )}
                        {verifyFeedback && (
                          <p className="mt-2 text-xs font-medium text-[#4A4F63]">
                            {verifyFeedback}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor="contact-name"
                          className="block text-xs font-bold uppercase tracking-wider text-[#1A1464]"
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
                          placeholder="Arigye Wisdom"
                          aria-invalid={Boolean(errors.name)}
                          className={`mt-2 w-full rounded-xl border px-4 py-3 text-sm text-[#1A1464] bg-[#F6F7FB]/50 placeholder:text-[#6B7188]/70 transition-colors focus:bg-white ${
                            errors.name ? 'border-[#EE1119]' : 'border-[#E5E7F0] focus:border-[#1A1464]'
                          }`}
                        />
                        {errors.name && (
                          <p className="mt-1.5 text-xs font-semibold text-[#EE1119]">{errors.name}</p>
                        )}
                      </div>

                      <div>
                        <label
                          htmlFor="contact-email"
                          className="block text-xs font-bold uppercase tracking-wider text-[#1A1464]"
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
                          placeholder="arigyewisdom7@gmail.com"
                          aria-invalid={Boolean(errors.email)}
                          className={`mt-2 w-full rounded-xl border px-4 py-3 text-sm text-[#1A1464] bg-[#F6F7FB]/50 placeholder:text-[#6B7188]/70 transition-colors focus:bg-white ${
                            errors.email
                              ? 'border-[#EE1119]'
                              : 'border-[#E5E7F0] focus:border-[#1A1464]'
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
                          className="block text-xs font-bold uppercase tracking-wider text-[#1A1464]"
                        >
                          Country <span className="text-[#EE1119]">*</span>
                        </label>
                        <select
                          id="contact-country"
                          value={form.country}
                          onChange={(e) => handleCountryChange(e.target.value)}
                          aria-invalid={Boolean(errors.country)}
                          className={`mt-2 w-full rounded-xl border px-4 py-3 text-sm font-medium text-[#1A1464] bg-[#F6F7FB]/50 transition-colors focus:bg-white ${
                            errors.country
                              ? 'border-[#EE1119]'
                              : 'border-[#E5E7F0] focus:border-[#1A1464]'
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
                            className="block text-xs font-bold uppercase tracking-wider text-[#1A1464]"
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
                          placeholder="+256 766 922 566"
                          aria-invalid={Boolean(errors.phone)}
                          className={`mt-2 w-full rounded-xl border px-4 py-3 text-sm text-[#1A1464] bg-[#F6F7FB]/50 placeholder:text-[#6B7188]/70 transition-colors focus:bg-white ${
                            errors.phone
                              ? 'border-[#EE1119]'
                              : 'border-[#E5E7F0] focus:border-[#1A1464]'
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
                          className="block text-xs font-bold uppercase tracking-wider text-[#1A1464]"
                        >
                          Company / Project Name
                        </label>
                        <input
                          id="contact-company"
                          type="text"
                          value={form.company}
                          onChange={(e) => setForm({ ...form, company: e.target.value })}
                          placeholder="0xDEV Studio / Freelance Client"
                          className="mt-2 w-full rounded-xl border border-[#E5E7F0] bg-[#F6F7FB]/50 px-4 py-3 text-sm text-[#1A1464] placeholder:text-[#6B7188]/70 transition-colors focus:border-[#1A1464] focus:bg-white"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="contact-service"
                          className="block text-xs font-bold uppercase tracking-wider text-[#1A1464]"
                        >
                          Primary Service <span className="text-[#EE1119]">*</span>
                        </label>
                        <select
                          id="contact-service"
                          value={form.service}
                          onChange={(e) => setForm({ ...form, service: e.target.value })}
                          className="mt-2 w-full rounded-xl border border-[#E5E7F0] bg-[#F6F7FB]/50 px-4 py-3 text-sm font-medium text-[#1A1464] transition-colors focus:border-[#1A1464] focus:bg-white"
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
                        className="block text-xs font-bold uppercase tracking-wider text-[#1A1464]"
                      >
                        Estimated Budget Range
                      </label>
                      <select
                        id="contact-budget"
                        value={form.budget}
                        onChange={(e) => setForm({ ...form, budget: e.target.value })}
                        className="mt-2 w-full rounded-xl border border-[#E5E7F0] bg-[#F6F7FB]/50 px-4 py-3 text-sm font-medium text-[#1A1464] transition-colors focus:border-[#1A1464] focus:bg-white"
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
                        className="block text-xs font-bold uppercase tracking-wider text-[#1A1464]"
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
                        className={`mt-2 w-full rounded-xl border px-4 py-3 text-sm text-[#1A1464] bg-[#F6F7FB]/50 placeholder:text-[#6B7188]/70 transition-colors focus:bg-white ${
                          errors.message
                            ? 'border-[#EE1119]'
                            : 'border-[#E5E7F0] focus:border-[#1A1464]'
                        }`}
                      />
                      {errors.message && (
                        <p className="mt-1.5 text-xs font-semibold text-[#EE1119]">
                          {errors.message}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pt-2">
                      <p className="text-xs text-[#6B7188]">
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
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};
