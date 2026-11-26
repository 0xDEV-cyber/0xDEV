import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
} from 'firebase/firestore';
import {
  Check,
  Coins,
  Copy,
  Gift,
  Link2,
  Share2,
  Sparkles,
  UserPlus,
  Users,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  buildReferralShareUrl,
  claimReferrerBonus,
  ensureUserReferralCode,
  getPendingReferralCode,
  INVITEE_REFERRAL_BONUS_CREDITS,
  mapReferralDocToRecord,
  normalizeReferralCode,
  redeemReferralCodeAsInvitee,
  REFERRAL_TIER_MILESTONES,
  ReferralRecord,
  REFERRER_PAYOUT_BONUS_CREDITS,
} from '../utils/referralUtils';
import { Reveal, SPRING_SNAPPY } from './MotionPrimitives';

function formatShortDate(ms: number): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(ms));
}

export const ReferralProgramPanel: React.FC = () => {
  const { user } = useAuth();

  const [myCode, setMyCode] = useState<string>('');
  const [loadingCode, setLoadingCode] = useState<boolean>(true);
  const [referrals, setReferrals] = useState<ReferralRecord[]>([]);
  const [inviteeReferral, setInviteeReferral] = useState<ReferralRecord | null>(null);
  const [friendCodeInput, setFriendCodeInput] = useState<string>(
    () => getPendingReferralCode() || ''
  );

  const [copiedTarget, setCopiedTarget] = useState<'code' | 'link' | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [redeemingCode, setRedeemingCode] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const userEmailVerified = Boolean(user?.emailVerified);
  const userDisplayName = user?.displayName || '';

  // Ensure verified user has a persistent non-PII referral code document
  useEffect(() => {
    let active = true;
    if (!user || !userEmailVerified) {
      setMyCode('');
      setLoadingCode(false);
      return;
    }

    setLoadingCode(true);
    ensureUserReferralCode(user)
      .then((res) => {
        if (!active) return;
        setMyCode(res?.code || '');
      })
      .catch(() => {
        // Error surfaced cleanly via handleFirestoreError logs
      })
      .finally(() => {
        if (active) setLoadingCode(false);
      });

    return () => {
      active = false;
    };
  }, [user, userEmailVerified, userDisplayName]);

  // Listen to referrals where current user is referrer
  useEffect(() => {
    if (!user) {
      setReferrals([]);
      return;
    }

    const q = query(collection(db, 'referrals'), where('referrerUid', '==', user.uid));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs
          .map((d) => mapReferralDocToRecord(d.id, d.data() as Record<string, unknown>))
          .sort((a, b) => b.createdAtMs - a.createdAtMs);
        setReferrals(list);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'referrals');
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Listen to current user's own invitee referral document (/referrals/{user.uid})
  useEffect(() => {
    if (!user) {
      setInviteeReferral(null);
      return;
    }

    const ref = doc(db, 'referrals', user.uid);
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setInviteeReferral(null);
          return;
        }
        setInviteeReferral(
          mapReferralDocToRecord(snap.id, snap.data() as Record<string, unknown>)
        );
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, `referrals/${user.uid}`);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const shareUrl = useMemo(
    () => (myCode ? buildReferralShareUrl(myCode) : ''),
    [myCode]
  );

  const unclaimedReferrals = useMemo(
    () => referrals.filter((r) => !r.referrerBonusClaimed),
    [referrals]
  );

  const rewardedCount = useMemo(
    () => referrals.filter((r) => r.referrerBonusClaimed).length,
    [referrals]
  );

  const totalEarnedFromReferrals = useMemo(
    () =>
      referrals.reduce(
        (sum, r) => sum + (r.referrerBonusClaimed ? r.referrerBonusCredits : 0),
        0
      ) + (inviteeReferral?.inviteeBonusClaimed ? inviteeReferral.inviteeBonusCredits : 0),
    [referrals, inviteeReferral]
  );

  const handleCopy = async (text: string, target: 'code' | 'link') => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedTarget(target);
      window.setTimeout(() => setCopiedTarget(null), 2200);
    } catch {
      setErrorMsg('Clipboard access unavailable. Highlight and copy the code manually.');
    }
  };

  const handleNativeShare = async () => {
    if (!myCode || !shareUrl) return;
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: 'Join 0xDEV & Claim +50 DevCredits',
          text: `Use my invite code ${myCode} on 0xDEV to unlock +50 bonus DevCredits after verifying your account.`,
          url: shareUrl,
        });
        return;
      } catch {
        // User cancelled or share unsupported — fallback to clipboard
      }
    }
    await handleCopy(shareUrl, 'link');
  };

  const handleClaimPayout = async (referral: ReferralRecord) => {
    if (!user || !user.emailVerified || referral.referrerBonusClaimed) return;
    setBusyId(referral.referralId);
    setErrorMsg(null);
    setFeedback(null);

    try {
      const claimed = await claimReferrerBonus({ user, referral });
      if (claimed) {
        setFeedback(
          `Claimed +${REFERRER_PAYOUT_BONUS_CREDITS} DevCredits for referring ${referral.inviteeName}!`
        );
      }
    } catch {
      setErrorMsg('Unable to claim referral bonus right now. Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  const handleApplyFriendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setErrorMsg(null);
    setFeedback(null);
    setRedeemingCode(true);

    try {
      const result = await redeemReferralCodeAsInvitee({
        user,
        rawCode: friendCodeInput,
      });
      if (result.ok) {
        setFeedback(result.message);
        setFriendCodeInput('');
      } else {
        setErrorMsg(result.message);
      }
    } catch {
      setErrorMsg('Unable to apply referral code right now. Please try again.');
    } finally {
      setRedeemingCode(false);
    }
  };

  return (
    <div id="referral-program">
      <Reveal
        delay={0.1}
        className="relative mt-10 rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] p-6 sm:p-8 shadow-[0_18px_45px_rgba(26,20,100,0.05)] dark:shadow-[0_18px_45px_rgba(0,0,0,0.35)]"
      >
      <div
        aria-hidden="true"
        className="absolute top-0 right-8 h-1.5 w-24 -skew-x-24 bg-[#1A1464] dark:bg-[#4F59B8]"
      />

      {/* Header & Metrics */}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between border-b border-[#E5E7F0] dark:border-[#242C54] pb-6">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#EE1119]">
            <Users className="h-4 w-4" aria-hidden="true" />
            <span>Referral Program · Earn Together</span>
          </p>
          <h2 className="mt-1.5 font-display text-2xl font-extrabold text-[#1A1464] dark:text-[#F4F6FC]">
            Invite Friends &amp; Multiply Your DevCredits
          </h2>
          <p className="mt-1 text-sm text-[#4A4F63] dark:text-[#C2C9E0]">
            Every verified friend who signs up with your invite link gets{' '}
            <strong className="text-[#1A1464] dark:text-white">
              +{INVITEE_REFERRAL_BONUS_CREDITS} DevCredits
            </strong>{' '}
            immediately, and you earn{' '}
            <strong className="text-[#1A1464] dark:text-white">
              +{REFERRER_PAYOUT_BONUS_CREDITS} DevCredits
            </strong>{' '}
            per invite.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#101530] px-4 py-2.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#6B7188] dark:text-[#8E97B8]">
              Verified Invites
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 font-display text-xl font-extrabold text-[#1A1464] dark:text-[#F4F6FC] tabular-nums">
              <UserPlus className="h-4 w-4 text-[#EE1119]" aria-hidden="true" />
              <span>{referrals.length}</span>
            </p>
          </div>

          <div className="rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#101530] px-4 py-2.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#6B7188] dark:text-[#8E97B8]">
              Referral Earned
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 font-display text-xl font-extrabold text-[#1A1464] dark:text-[#F4F6FC] tabular-nums">
              <Coins className="h-4 w-4 text-[#EE1119]" aria-hidden="true" />
              <span>+{totalEarnedFromReferrals}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Notices */}
      {errorMsg && (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-[#EE1119]/40 bg-[#EE1119]/5 dark:bg-[#EE1119]/10 px-4 py-3 text-xs sm:text-sm font-semibold text-[#1A1464] dark:text-[#F4F6FC]"
        >
          {errorMsg}
        </div>
      )}
      {feedback && (
        <div
          role="status"
          className="mt-4 flex items-center gap-2.5 rounded-xl border border-[#10B981]/35 bg-[#ECFDF5]/85 dark:bg-[#0D2A24]/75 px-4 py-3 text-xs sm:text-sm font-semibold text-[#065F46] dark:text-[#A7F3D0]"
        >
          <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Share Code + Redeem Invitee Bonus Grid */}
      <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Left: Your Personal Invite Code & Link */}
        <div className="lg:col-span-7 rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#101530] p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-[#1A1464] dark:text-[#F4F6FC]">
            Your Personal Invite Code &amp; Link
          </p>

          {!user?.emailVerified ? (
            <p className="mt-3 text-xs sm:text-sm text-[#4A4F63] dark:text-[#C2C9E0]">
              Verify your email via the banner at the top of the portal to generate your
              shareable 0xDEV referral code and start earning +100 DevCredits per friend.
            </p>
          ) : (
            <>
              <div className="mt-3 flex flex-wrap items-center gap-2.5">
                <div className="flex-1 min-w-[180px] rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-4 py-2.5">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-[#6B7188] dark:text-[#8E97B8]">
                    Referral Code
                  </span>
                  <span className="font-mono text-base sm:text-lg font-extrabold tracking-widest text-[#1A1464] dark:text-[#F4F6FC] tabular-nums">
                    {loadingCode ? 'Generating...' : myCode || 'Unavailable'}
                  </span>
                </div>

                <button
                  type="button"
                  disabled={!myCode}
                  onClick={() => void handleCopy(myCode, 'code')}
                  className="inline-flex min-h-[46px] items-center gap-1.5 rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-4 py-2.5 text-xs font-bold text-[#1A1464] dark:text-[#F4F6FC] transition-colors hover:border-[#EE1119] hover:text-[#EE1119] disabled:opacity-50"
                >
                  {copiedTarget === 'code' ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-[#10B981]" aria-hidden="true" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-[#EE1119]" aria-hidden="true" />
                      <span>Copy Code</span>
                    </>
                  )}
                </button>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2.5">
                <div className="flex flex-1 min-w-[200px] items-center gap-2 rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-3.5 py-2.5">
                  <Link2 className="h-3.5 w-3.5 shrink-0 text-[#6B7188] dark:text-[#8E97B8]" aria-hidden="true" />
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    aria-label="Your shareable 0xDEV invite link"
                    onFocus={(e) => e.currentTarget.select()}
                    className="w-full bg-transparent font-mono text-xs text-[#4A4F63] dark:text-[#C2C9E0] focus:outline-none"
                  />
                </div>

                <button
                  type="button"
                  disabled={!shareUrl}
                  onClick={() => void handleCopy(shareUrl, 'link')}
                  className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl bg-[#1A1464] dark:bg-[#2E368F] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#EE1119] disabled:opacity-50"
                >
                  {copiedTarget === 'link' ? (
                    <>
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Link Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={!shareUrl}
                  onClick={() => void handleNativeShare()}
                  className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl bg-[#EE1119] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#D00D14] disabled:opacity-50"
                >
                  <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Invite Friend</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Right: Invitee Welcome Code Redemption */}
        <div className="lg:col-span-5 rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#101530]/75 p-5 flex flex-col justify-between">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#EE1119]">
              <Gift className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Were You Invited?</span>
            </p>
            <h3 className="mt-1 font-display text-base font-extrabold text-[#1A1464] dark:text-[#F4F6FC]">
              Redeem Friend&apos;s Referral Code
            </h3>

            {inviteeReferral ? (
              <div className="mt-3 rounded-xl border border-[#10B981]/35 bg-[#ECFDF5]/60 dark:bg-[#0D2A24]/50 p-3.5 text-xs text-[#065F46] dark:text-[#A7F3D0]">
                <p className="font-bold">
                  +{inviteeReferral.inviteeBonusCredits} DevCredits Welcome Bonus Applied
                </p>
                <p className="mt-1">
                  Referred by <span className="font-semibold">{inviteeReferral.referrerName}</span> ·{' '}
                  <span className="font-mono">{inviteeReferral.referralCode}</span>
                </p>
              </div>
            ) : (
              <>
                <p className="mt-1 text-xs leading-relaxed text-[#4A4F63] dark:text-[#C2C9E0]">
                  Enter a friend&apos;s 0xDEV code once per account to receive{' '}
                  <strong>+{INVITEE_REFERRAL_BONUS_CREDITS} DevCredits</strong> and credit their
                  referral.
                </p>
                <form onSubmit={handleApplyFriendCode} className="mt-3 flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={friendCodeInput}
                    onChange={(e) => {
                      setFriendCodeInput(normalizeReferralCode(e.target.value));
                      if (errorMsg) setErrorMsg(null);
                    }}
                    placeholder="e.g. 0X9K4M2P7Q"
                    aria-label="Friend referral code"
                    maxLength={24}
                    className="flex-1 rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#141A38] px-3.5 py-2.5 font-mono text-xs font-bold uppercase tracking-wider text-[#1A1464] dark:text-white placeholder:text-[#6B7188]/70 dark:placeholder:text-[#8E97B8]/70 focus:border-[#1A1464] dark:focus:border-[#7C8CFF]"
                  />
                  <button
                    type="submit"
                    disabled={
                      redeemingCode || !user?.emailVerified || friendCodeInput.trim().length < 6
                    }
                    className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-xl bg-[#EE1119] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#D00D14] disabled:opacity-50 whitespace-nowrap"
                  >
                    <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>{redeemingCode ? 'Applying...' : `+${INVITEE_REFERRAL_BONUS_CREDITS} Bonus`}</span>
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Referral Tiers */}
      <div className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-wider text-[#1A1464] dark:text-[#F4F6FC]">
            Referral Milestones
          </p>
          <p className="text-xs text-[#6B7188] dark:text-[#8E97B8] tabular-nums">
            {rewardedCount} paid · {unclaimedReferrals.length} ready to claim
          </p>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {REFERRAL_TIER_MILESTONES.map((tier) => {
            const reached = rewardedCount >= tier.count;
            return (
              <div
                key={tier.count}
                className={`rounded-xl border p-3.5 transition-colors ${
                  reached
                    ? 'border-[#10B981]/40 bg-[#ECFDF5]/60 dark:bg-[#0D2A24]/50'
                    : 'border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB]/70 dark:bg-[#101530]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] font-bold uppercase text-[#6B7188] dark:text-[#8E97B8] tabular-nums">
                    {tier.count} {tier.count === 1 ? 'Friend' : 'Friends'}
                  </span>
                  {reached && <Check className="h-3.5 w-3.5 text-[#10B981]" aria-hidden="true" />}
                </div>
                <p className="mt-1 font-display text-sm font-extrabold text-[#1A1464] dark:text-[#F4F6FC]">
                  {tier.label}
                </p>
                <p className="mt-0.5 text-[11px] font-semibold text-[#EE1119] tabular-nums">
                  {tier.perk}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pending Claims & Activity Feed */}
      <div className="mt-6 border-t border-[#E5E7F0] dark:border-[#242C54] pt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-base font-extrabold text-[#1A1464] dark:text-[#F4F6FC]">
            Invited Friends &amp; Payouts
          </h3>
          {unclaimedReferrals.length > 0 && (
            <span className="font-mono text-xs font-bold text-[#EE1119] tabular-nums">
              +{unclaimedReferrals.length * REFERRER_PAYOUT_BONUS_CREDITS} DevCredits Ready to Claim
            </span>
          )}
        </div>

        {referrals.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-[#E5E7F0] dark:border-[#242C54] px-4 py-6 text-center text-xs sm:text-sm text-[#6B7188] dark:text-[#8E97B8]">
            No verified referrals yet. Share your invite link above — each friend receives +50
            DevCredits and unlocks a +100 DevCredits payout for you.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-[#E5E7F0] dark:divide-[#242C54] rounded-xl border border-[#E5E7F0] dark:border-[#242C54] overflow-hidden">
            {referrals.map((r) => {
              const claiming = busyId === r.referralId;
              return (
                <li
                  key={r.referralId}
                  className="flex flex-wrap items-center justify-between gap-3 bg-[#F6F7FB]/50 dark:bg-[#101530]/60 px-4 py-3.5"
                >
                  <div className="min-w-0">
                    <p className="font-display text-sm font-bold text-[#1A1464] dark:text-[#F4F6FC] truncate">
                      {r.inviteeName}
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] font-medium text-[#6B7188] dark:text-[#8E97B8] tabular-nums">
                      {formatShortDate(r.createdAtMs)}
                      <span className="mx-1.5" aria-hidden="true">·</span>
                      <span>Code {r.referralCode}</span>
                      <span className="mx-1.5" aria-hidden="true">·</span>
                      <span className={r.referrerBonusClaimed ? 'text-[#10B981] font-bold' : 'text-[#EE1119] font-bold'}>
                        {r.referrerBonusClaimed ? 'Paid' : 'Bonus Ready'}
                      </span>
                    </p>
                  </div>

                  {r.referrerBonusClaimed ? (
                    <span className="inline-flex items-center gap-1.5 rounded-xl border border-[#10B981]/35 bg-[#ECFDF5] dark:bg-[#0D2A24]/75 px-3 py-1.5 text-xs font-bold text-[#065F46] dark:text-[#A7F3D0] tabular-nums">
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>+{r.referrerBonusCredits} Credited</span>
                    </span>
                  ) : (
                    <motion.button
                      type="button"
                      disabled={claiming || !user?.emailVerified}
                      onClick={() => void handleClaimPayout(r)}
                      whileTap={{ scale: 0.97 }}
                      transition={SPRING_SNAPPY}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#EE1119] px-4 py-2 text-xs font-bold text-white shadow-[0_8px_20px_rgba(238,17,25,0.2)] transition-colors hover:bg-[#D00D14] disabled:opacity-60 tabular-nums"
                    >
                      <Coins className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>
                        {claiming
                          ? 'Claiming...'
                          : `Claim +${r.referrerBonusCredits} DevCredits`}
                      </span>
                    </motion.button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      </Reveal>
    </div>
  );
};
