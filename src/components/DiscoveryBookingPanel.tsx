import React, { useEffect, useMemo, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { AnimatePresence, motion } from 'motion/react';
import { Calendar, CheckCircle2, Clock, Globe, Lock, Video } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { COMPANY_CONTACT } from '../data/siteData';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { EASE_OUT_EXPO, SPRING_SNAPPY } from './MotionPrimitives';

interface DiscoveryBookingRecord {
  bookingId: string;
  authorId: string;
  name: string;
  email: string;
  timezone: string;
  slotDate: string;
  slotTimeEat: string;
  channel: 'google_meet' | 'whatsapp_call' | 'kabale_studio';
  topic: string;
  status: 'requested' | 'confirmed' | 'completed' | 'cancelled';
  createdAtMs: number;
}

interface DiscoveryBookingPanelProps {
  onRequestAuth?: () => void;
}

const EAT_SLOTS = [
  { id: '10:00 EAT', hourEat: 10, minute: 0, label: '10:00 AM EAT' },
  { id: '12:00 EAT', hourEat: 12, minute: 0, label: '12:00 PM EAT' },
  { id: '15:00 EAT', hourEat: 15, minute: 0, label: '03:00 PM EAT' },
  { id: '17:30 EAT', hourEat: 17, minute: 30, label: '05:30 PM EAT' },
] as const;

const CHANNELS = [
  { id: 'google_meet', label: 'Google Meet Video' },
  { id: 'whatsapp_call', label: 'WhatsApp Voice / Video' },
  { id: 'kabale_studio', label: 'Kabale Studio In-Person' },
] as const;

function getUpcomingBusinessDays(count = 8): { iso: string; label: string }[] {
  const days: { iso: string; label: string }[] = [];
  const cursor = new Date();
  cursor.setDate(cursor.getDate() + 1);

  while (days.length < count) {
    const dow = cursor.getDay();
    if (dow !== 0) {
      // Allow Mon-Sat
      const iso = cursor.toISOString().slice(0, 10);
      const label = new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }).format(cursor);
      days.push({ iso, label });
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function convertEatToVisitorLocal(isoDate: string, hourEat: number, minute: number, tz: string): string {
  try {
    const [y, m, d] = isoDate.split('-').map(Number);
    // EAT is always UTC+3 (no DST)
    const utcMs = Date.UTC(y, m - 1, d, hourEat - 3, minute, 0);
    return new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: 'numeric',
      minute: '2-digit',
    }).format(new Date(utcMs));
  } catch {
    return `${hourEat}:${String(minute).padStart(2, '0')} EAT`;
  }
}

export const DiscoveryBookingPanel: React.FC<DiscoveryBookingPanelProps> = ({ onRequestAuth }) => {
  const { user } = useAuth();
  const isPrimaryAdmin =
    Boolean(user?.emailVerified) && user?.email?.toLowerCase() === 'arigyewisdom7@gmail.com';

  const visitorTz = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Kampala';
    } catch {
      return 'Africa/Kampala';
    }
  }, []);

  const businessDays = useMemo(() => getUpcomingBusinessDays(8), []);

  const [slotDate, setSlotDate] = useState(businessDays[0]?.iso || '');
  const [slotTimeEat, setSlotTimeEat] = useState<string>(EAT_SLOTS[1].id);
  const [channel, setChannel] = useState<'google_meet' | 'whatsapp_call' | 'kabale_studio'>(
    'google_meet'
  );
  const [name, setName] = useState(user?.displayName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [topic, setTopic] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedBookingId, setConfirmedBookingId] = useState<string | null>(null);
  const [bookings, setBookings] = useState<DiscoveryBookingRecord[]>([]);

  useEffect(() => {
    if (user) {
      setName((prev) => prev || user.displayName || '');
      setEmail((prev) => prev || user.email || '');
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setBookings([]);
      return;
    }

    const q = isPrimaryAdmin
      ? collection(db, 'bookings')
      : query(collection(db, 'bookings'), where('authorId', '==', user.uid));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items: DiscoveryBookingRecord[] = snapshot.docs
          .map((d) => {
            const data = d.data();
            const createdAtMs =
              data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now();
            return {
              bookingId: String(data.bookingId || d.id),
              authorId: String(data.authorId || ''),
              name: String(data.name || ''),
              email: String(data.email || ''),
              timezone: String(data.timezone || 'UTC'),
              slotDate: String(data.slotDate || ''),
              slotTimeEat: String(data.slotTimeEat || ''),
              channel: (data.channel || 'google_meet') as DiscoveryBookingRecord['channel'],
              topic: String(data.topic || ''),
              status: (data.status || 'requested') as DiscoveryBookingRecord['status'],
              createdAtMs,
            };
          })
          .sort((a, b) => b.createdAtMs - a.createdAtMs);
        setBookings(items);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'bookings');
      }
    );

    return () => unsubscribe();
  }, [user, isPrimaryAdmin]);

  const handleBookCall = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user) {
      if (onRequestAuth) onRequestAuth();
      return;
    }
    if (!user.emailVerified) {
      setError('Please verify your email address first before booking a call slot.');
      return;
    }
    if (name.trim().length < 2) {
      setError('Please enter your name.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    if (topic.trim().length < 5) {
      setError('Please share a brief topic for the call (at least 5 characters).');
      return;
    }

    const bookingId = `BK-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    setSubmitting(true);
    try {
      await setDoc(doc(db, 'bookings', bookingId), {
        bookingId,
        authorId: user.uid,
        name: name.trim().slice(0, 100),
        email: email.trim().slice(0, 200),
        timezone: visitorTz.slice(0, 80),
        slotDate: slotDate.slice(0, 30),
        slotTimeEat: slotTimeEat.slice(0, 30),
        channel,
        topic: topic.trim().slice(0, 600),
        status: 'requested',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setConfirmedBookingId(bookingId);
      setTopic('');
    } catch (err) {
      setError('Unable to book this slot right now.');
      handleFirestoreError(err, OperationType.CREATE, `bookings/${bookingId}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateBookingStatus = async (
    bookingId: string,
    nextStatus: DiscoveryBookingRecord['status']
  ) => {
    try {
      await updateDoc(doc(db, 'bookings', bookingId), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `bookings/${bookingId}`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5E7F0] dark:border-[#242C54] pb-4">
        <div>
          <h2 className="font-display text-xl font-extrabold text-[#1A1464] dark:text-[#F4F6FC]">
            Book a 30-Minute Discovery Call
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-[#6B7188] dark:text-[#8E97B8]">
            Times appear in your local timezone (<strong className="text-[#1A1464] dark:text-white">{visitorTz}</strong>) synced to{' '}
            {COMPANY_CONTACT.location} (EAT / UTC+3).
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1A1464] dark:text-[#F4F6FC]">
          <Globe className="h-3.5 w-3.5 text-[#EE1119]" aria-hidden="true" />
          <span>{visitorTz}</span>
        </span>
      </div>

      <AnimatePresence mode="wait">
        {confirmedBookingId ? (
          <motion.div
            key="booking-confirmed"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: EASE_OUT_EXPO }}
            className="py-4"
            role="status"
          >
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1A1464] dark:bg-[#232B6E] text-white">
              <CheckCircle2 className="h-6 w-6 text-[#EE1119]" aria-hidden="true" />
            </div>
            <h3 className="mt-4 font-display text-xl font-extrabold text-[#1A1464] dark:text-[#F4F6FC]">
              Call Slot Requested
            </h3>
            <p className="mt-2 text-sm text-[#4A4F63] dark:text-[#C2C9E0]">
              Reference <strong className="text-[#EE1119]">{confirmedBookingId}</strong> for{' '}
              <strong className="text-[#1A1464] dark:text-white">{slotDate}</strong> at{' '}
              <strong className="text-[#1A1464] dark:text-white">{slotTimeEat}</strong> is with{' '}
              {COMPANY_CONTACT.leadName}.
            </p>
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              transition={SPRING_SNAPPY}
              onClick={() => setConfirmedBookingId(null)}
              className="mt-5 rounded-xl border border-[#1A1464] dark:border-[#3A437A] px-4 py-2 text-xs font-bold text-[#1A1464] dark:text-[#F4F6FC] hover:bg-[#1A1464] dark:hover:bg-[#2E368F] hover:text-white"
            >
              Book Another Time
            </motion.button>
          </motion.div>
        ) : (
          <motion.form
            key="booking-form"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: EASE_OUT_EXPO }}
            onSubmit={handleBookCall}
            noValidate
            className="space-y-5"
          >
          {error && (
            <div
              role="alert"
              className="rounded-xl border border-[#EE1119]/40 bg-[#EE1119]/5 dark:bg-[#EE1119]/10 p-3.5 text-xs font-semibold text-[#1A1464] dark:text-[#F4F6FC]"
            >
              {error}
            </div>
          )}

          {/* Date Picker */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#1A1464] dark:text-[#F4F6FC] flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-[#EE1119]" aria-hidden="true" />
              <span>1. Select Date</span>
            </p>
            <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {businessDays.map((day) => {
                const active = slotDate === day.iso;
                return (
                  <button
                    key={day.iso}
                    type="button"
                    onClick={() => setSlotDate(day.iso)}
                    className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-all tabular-nums ${
                      active
                        ? 'border-[#1A1464] dark:border-[#4F59B8] bg-[#1A1464] dark:bg-[#2E368F] text-white'
                        : 'border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#101530] text-[#1A1464] dark:text-[#C2C9E0] hover:border-[#1A1464]/40 dark:hover:border-[#4F59B8]'
                    }`}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Time Slot Picker */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#1A1464] dark:text-[#F4F6FC] flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-[#EE1119]" aria-hidden="true" />
              <span>2. Select Time (Local Time · Kabale EAT)</span>
            </p>
            <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {EAT_SLOTS.map((slot) => {
                const active = slotTimeEat === slot.id;
                const localFormatted = convertEatToVisitorLocal(
                  slotDate,
                  slot.hourEat,
                  slot.minute,
                  visitorTz
                );
                return (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => setSlotTimeEat(slot.id)}
                    className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-left transition-all ${
                      active
                        ? 'border-[#EE1119] bg-[#EE1119]/10 dark:bg-[#EE1119]/15 text-[#1A1464] dark:text-white'
                        : 'border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#101530] text-[#1A1464] dark:text-[#C2C9E0] hover:border-[#1A1464]/40 dark:hover:border-[#4F59B8]'
                    }`}
                  >
                    <span className="font-display text-xs font-bold tabular-nums">
                      {localFormatted} (Your Time)
                    </span>
                    <span className="text-[11px] font-semibold text-[#6B7188] dark:text-[#8E97B8] tabular-nums">
                      {slot.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Meeting Channel */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#1A1464] dark:text-[#F4F6FC] flex items-center gap-1.5">
              <Video className="h-3.5 w-3.5 text-[#EE1119]" aria-hidden="true" />
              <span>3. Call Format</span>
            </p>
            <div className="mt-2.5 grid grid-cols-1 gap-2 sm:grid-cols-3">
              {CHANNELS.map((ch) => {
                const active = channel === ch.id;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => setChannel(ch.id)}
                    className={`rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${
                      active
                        ? 'border-[#1A1464] dark:border-[#4F59B8] bg-[#1A1464] dark:bg-[#2E368F] text-white'
                        : 'border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#101530] text-[#1A1464] dark:text-[#C2C9E0]'
                    }`}
                  >
                    {ch.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="booking-name"
                className="block text-xs font-bold uppercase tracking-wider text-[#1A1464] dark:text-[#F4F6FC]"
              >
                Your Name
              </label>
              <input
                id="booking-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="mt-1.5 w-full rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB]/50 dark:bg-[#101530] px-3.5 py-2.5 text-sm text-[#1A1464] dark:text-white placeholder:text-[#6B7188]/70 dark:placeholder:text-[#8E97B8]/70 focus:bg-white dark:focus:bg-[#182044] focus:border-[#1A1464] dark:focus:border-[#7C8CFF]"
              />
            </div>
            <div>
              <label
                htmlFor="booking-email"
                className="block text-xs font-bold uppercase tracking-wider text-[#1A1464] dark:text-[#F4F6FC]"
              >
                Email for Invite
              </label>
              <input
                id="booking-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email address"
                className="mt-1.5 w-full rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB]/50 dark:bg-[#101530] px-3.5 py-2.5 text-sm text-[#1A1464] dark:text-white placeholder:text-[#6B7188]/70 dark:placeholder:text-[#8E97B8]/70 focus:bg-white dark:focus:bg-[#182044] focus:border-[#1A1464] dark:focus:border-[#7C8CFF]"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="booking-topic"
              className="block text-xs font-bold uppercase tracking-wider text-[#1A1464] dark:text-[#F4F6FC]"
            >
              What should we prepare for this call?
            </label>
            <textarea
              id="booking-topic"
              rows={2}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Briefly describe what you want to cover on the call"
              className="mt-1.5 w-full rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB]/50 dark:bg-[#101530] px-3.5 py-2.5 text-sm text-[#1A1464] dark:text-white placeholder:text-[#6B7188]/70 dark:placeholder:text-[#8E97B8]/70 focus:bg-white dark:focus:bg-[#182044] focus:border-[#1A1464] dark:focus:border-[#7C8CFF]"
            />
          </div>

          {!user ? (
            <motion.button
              type="button"
              whileTap={{ scale: 0.985 }}
              transition={SPRING_SNAPPY}
              onClick={onRequestAuth}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1A1464] dark:bg-[#2E368F] px-6 py-3.5 text-sm font-bold text-white hover:bg-[#120D4A] dark:hover:bg-[#3A43A8]"
            >
              <Lock className="h-4 w-4 text-[#EE1119]" aria-hidden="true" />
              <span>Sign In / Register Free to Book This Slot</span>
            </motion.button>
          ) : (
            <motion.button
              type="submit"
              whileTap={{ scale: 0.985 }}
              transition={SPRING_SNAPPY}
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#EE1119] px-6 py-3.5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(238,17,25,0.22)] hover:bg-[#D00D14] disabled:opacity-60"
            >
              <Calendar className="h-4 w-4" aria-hidden="true" />
              <span>{submitting ? 'Confirming Slot...' : 'Confirm 30-Min Discovery Call'}</span>
            </motion.button>
          )}
          </motion.form>
        )}
      </AnimatePresence>

      {/* Existing Bookings List */}
      {bookings.length > 0 && (
        <div className="border-t border-[#E5E7F0] dark:border-[#242C54] pt-5 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-[#1A1464] dark:text-[#F4F6FC]">
            {isPrimaryAdmin ? `Scheduled Discovery Calls (${bookings.length})` : 'Your Discovery Calls'}
          </p>
          <div className="space-y-2.5">
            {bookings.map((bk) => (
              <div
                key={bk.bookingId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#101530] p-3.5 text-xs"
              >
                <div>
                  <p className="font-bold text-[#1A1464] dark:text-[#F4F6FC]">
                    {bk.slotDate} · {bk.slotTimeEat}{' '}
                    <span className="font-normal text-[#6B7188] dark:text-[#8E97B8]">({bk.channel.replace('_', ' ')})</span>
                  </p>
                  <p className="mt-0.5 text-[#4A4F63] dark:text-[#C2C9E0]">
                    {isPrimaryAdmin ? `${bk.name} (${bk.email}) · ` : ''}
                    {bk.topic}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold uppercase text-[#EE1119]">{bk.status}</span>
                  {isPrimaryAdmin && bk.status === 'requested' && (
                    <button
                      type="button"
                      onClick={() => void handleUpdateBookingStatus(bk.bookingId, 'confirmed')}
                      className="rounded-lg bg-[#1A1464] dark:bg-[#2E368F] px-2.5 py-1 text-[11px] font-bold text-white hover:bg-[#120D4A] dark:hover:bg-[#3A43A8]"
                    >
                      Confirm
                    </button>
                  )}
                  {!isPrimaryAdmin && bk.status === 'requested' && (
                    <button
                      type="button"
                      onClick={() => void handleUpdateBookingStatus(bk.bookingId, 'cancelled')}
                      className="rounded-lg border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-2.5 py-1 text-[11px] font-semibold text-[#6B7188] dark:text-[#8E97B8] hover:text-[#EE1119]"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
