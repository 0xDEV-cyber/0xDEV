import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  Award,
  Check,
  Coins,
  Copy,
  Download,
  Flame,
  Lock,
  Sparkles,
  Terminal,
  Unlock,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  computeNextStreak,
  DAILY_STREAK_LADDER,
  EXCLUSIVE_TECH_RESOURCES,
  ExclusiveTechResource,
  getRewardCreditsForStreakDay,
  getUtcDateKey,
} from '../data/dailyRewardsData';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { EASE_OUT_EXPO, Reveal, SPRING_SNAPPY } from './MotionPrimitives';

interface UserRewardsState {
  devCredits: number;
  lifetimeCredits: number;
  streakDays: number;
  longestStreak: number;
  lastClaimDay: string | null;
  totalClaims: number;
  unlockedResourceIds: string[];
  referralsCount: number;
  referralCreditsEarned: number;
  inviteeBonusApplied: boolean;
}

const DEFAULT_REWARDS: UserRewardsState = {
  devCredits: 0,
  lifetimeCredits: 0,
  streakDays: 0,
  longestStreak: 0,
  lastClaimDay: null,
  totalClaims: 0,
  unlockedResourceIds: [],
  referralsCount: 0,
  referralCreditsEarned: 0,
  inviteeBonusApplied: false,
};

function buildMarkdownPlaybook(res: ExclusiveTechResource): string {
  return [
    `# ${res.title}`,
    `Category: ${res.category} (${res.formatLabel})`,
    ``,
    `## Overview`,
    res.summary,
    ``,
    `## Production Implementation Steps`,
    ...res.steps.map((s, idx) => `${idx + 1}. ${s}`),
    ``,
    `## Reference Implementation (${res.codeFilename})`,
    `\`\`\`${res.codeLanguage}`,
    res.codeSnippet,
    `\`\`\``,
    ``,
    `---`,
    `Curated by 0xDEV Engineering Vault`,
  ].join('\n');
}

export const DailyRewardsPanel: React.FC = () => {
  const { user } = useAuth();
  const [rewards, setRewards] = useState<UserRewardsState>(DEFAULT_REWARDS);
  const [hasDoc, setHasDoc] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeResource, setActiveResource] = useState<ExclusiveTechResource | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const todayKey = getUtcDateKey();

  useEffect(() => {
    if (!user) {
      setRewards(DEFAULT_REWARDS);
      setHasDoc(false);
      setLoading(false);
      return;
    }

    const ref = doc(db, 'users', user.uid, 'preferences', 'rewards');
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setRewards(DEFAULT_REWARDS);
          setHasDoc(false);
          setLoading(false);
          return;
        }
        const data = snap.data();
        setRewards({
          devCredits: Number(data.devCredits || 0),
          lifetimeCredits: Number(data.lifetimeCredits || 0),
          streakDays: Number(data.streakDays || 0),
          longestStreak: Number(data.longestStreak || 0),
          lastClaimDay:
            typeof data.lastClaimDay === 'string' && data.lastClaimDay !== '1970-01-01'
              ? data.lastClaimDay
              : null,
          totalClaims: Number(data.totalClaims || 0),
          unlockedResourceIds: Array.isArray(data.unlockedResourceIds)
            ? data.unlockedResourceIds.filter((id): id is string => typeof id === 'string')
            : [],
          referralsCount: Number(data.referralsCount || 0),
          referralCreditsEarned: Number(data.referralCreditsEarned || 0),
          inviteeBonusApplied: Boolean(data.inviteeBonusApplied),
        });
        setHasDoc(true);
        setLoading(false);
      },
      (err) => {
        setLoading(false);
        handleFirestoreError(err, OperationType.GET, `users/${user.uid}/preferences/rewards`);
      }
    );

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!activeResource) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setActiveResource(null);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [activeResource]);

  const claimedToday = rewards.lastClaimDay === todayKey;

  const projectedClaimDay = useMemo(
    () =>
      claimedToday
        ? Math.max(1, rewards.streakDays)
        : computeNextStreak(rewards.lastClaimDay, rewards.streakDays, todayKey),
    [claimedToday, rewards.lastClaimDay, rewards.streakDays, todayKey]
  );

  const projectedCredits = useMemo(
    () => getRewardCreditsForStreakDay(projectedClaimDay),
    [projectedClaimDay]
  );

  const tomorrowCredits = useMemo(
    () => getRewardCreditsForStreakDay((claimedToday ? rewards.streakDays : projectedClaimDay) + 1),
    [claimedToday, rewards.streakDays, projectedClaimDay]
  );

  const isResourceUnlocked = (res: ExclusiveTechResource): boolean =>
    rewards.unlockedResourceIds.includes(res.id) ||
    rewards.longestStreak >= res.requiredStreakDays;

  const handleClaimDailyReward = async () => {
    if (!user) return;
    if (!user.emailVerified) {
      setErrorMsg('Verify your email via the banner above before claiming DevCredits.');
      return;
    }
    if (claimedToday) return;

    setBusyAction('claim');
    setErrorMsg(null);
    setFeedback(null);

    const ref = doc(db, 'users', user.uid, 'preferences', 'rewards');
    const path = `users/${user.uid}/preferences/rewards`;

    try {
      if (!hasDoc) {
        // First claim creates the document matching exact Firestore creation invariants
        await setDoc(ref, {
          uid: user.uid,
          devCredits: 25,
          lifetimeCredits: 25,
          streakDays: 1,
          longestStreak: 1,
          lastClaimDay: todayKey,
          totalClaims: 1,
          unlockedResourceIds: [],
          referralsCount: 0,
          referralCreditsEarned: 0,
          inviteeBonusApplied: false,
          lastClaimedReferralId: '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        setFeedback('Day 1 check-in complete — +25 DevCredits added to your balance.');
      } else {
        const nextStreak = computeNextStreak(rewards.lastClaimDay, rewards.streakDays, todayKey);
        const bonusCredits = getRewardCreditsForStreakDay(nextStreak);
        const nextLongest = Math.max(rewards.longestStreak, nextStreak);

        // Unlock at most 1 newly reached streak milestone resource per claim (strict rule bound)
        const newlyReached = EXCLUSIVE_TECH_RESOURCES.find(
          (res) =>
            nextStreak >= res.requiredStreakDays &&
            !rewards.unlockedResourceIds.includes(res.id)
        );
        const nextUnlocked = newlyReached
          ? [...rewards.unlockedResourceIds, newlyReached.id]
          : rewards.unlockedResourceIds;

        await updateDoc(ref, {
          devCredits: rewards.devCredits + bonusCredits,
          lifetimeCredits: rewards.lifetimeCredits + bonusCredits,
          streakDays: nextStreak,
          longestStreak: nextLongest,
          lastClaimDay: todayKey,
          totalClaims: rewards.totalClaims + 1,
          unlockedResourceIds: nextUnlocked,
          updatedAt: serverTimestamp(),
        });

        setFeedback(
          newlyReached
            ? `Day ${nextStreak} check-in complete: +${bonusCredits} DevCredits & unlocked "${newlyReached.title}".`
            : `Day ${nextStreak} check-in complete: +${bonusCredits} DevCredits earned.`
        );
      }
    } catch (err) {
      setErrorMsg('Unable to claim today’s DevCredits right now.');
      handleFirestoreError(err, hasDoc ? OperationType.UPDATE : OperationType.CREATE, path);
    } finally {
      setBusyAction(null);
    }
  };

  const handleRedeemResource = async (res: ExclusiveTechResource) => {
    if (!user) return;
    if (!user.emailVerified) {
      setErrorMsg('Verify your email first to redeem DevCredits.');
      return;
    }
    if (!hasDoc || rewards.devCredits < res.unlockCostCredits || isResourceUnlocked(res)) {
      return;
    }

    setBusyAction(res.id);
    setErrorMsg(null);
    setFeedback(null);

    const ref = doc(db, 'users', user.uid, 'preferences', 'rewards');
    const path = `users/${user.uid}/preferences/rewards`;

    try {
      await updateDoc(ref, {
        devCredits: rewards.devCredits - res.unlockCostCredits,
        unlockedResourceIds: [...rewards.unlockedResourceIds, res.id],
        updatedAt: serverTimestamp(),
      });
      setFeedback(`Unlocked "${res.title}" using ${res.unlockCostCredits} DevCredits.`);
      setActiveResource(res);
    } catch (err) {
      setErrorMsg('Unable to unlock technical resource right now.');
      handleFirestoreError(err, OperationType.UPDATE, path);
    } finally {
      setBusyAction(null);
    }
  };

  const handleDownloadResource = (res: ExclusiveTechResource) => {
    const content = buildMarkdownPlaybook(res);
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${res.id}-0xdev.md`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const ladderActiveStep = claimedToday
    ? ((Math.max(1, rewards.streakDays) - 1) % 7) + 1
    : ((projectedClaimDay - 1) % 7) + 1;

  return (
    <Reveal
      delay={0.08}
      className="relative mt-10 rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] p-6 sm:p-8 shadow-[0_18px_45px_rgba(26,20,100,0.05)] dark:shadow-[0_18px_45px_rgba(0,0,0,0.35)]"
    >
      <div
        aria-hidden="true"
        className="absolute top-0 right-8 h-1.5 w-24 -skew-x-24 bg-[#EE1119]"
      />

      {/* Top Header & Daily Check-In Summary */}
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between border-b border-[#E5E7F0] dark:border-[#242C54] pb-6">
        <div>
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[#EE1119]">
            <Coins className="h-4 w-4" aria-hidden="true" />
            <span>Daily Login Rewards &amp; Engineering Vault</span>
          </p>
          <h2 className="mt-1.5 font-display text-2xl font-extrabold text-[#1A1464] dark:text-[#F4F6FC]">
            Earn DevCredits &amp; Unlock Exclusive Resources
          </h2>
          <p className="mt-1 text-sm text-[#4A4F63] dark:text-[#C2C9E0]">
            Check in daily on consecutive days to grow your DevCredits balance and unlock
            production SQL, sync, and security toolkits.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Metric Tiles */}
          <div className="rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#101530] px-4 py-2.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#6B7188] dark:text-[#8E97B8]">
              DevCredits
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 font-display text-xl font-extrabold text-[#1A1464] dark:text-[#F4F6FC] tabular-nums">
              <Coins className="h-4 w-4 text-[#EE1119]" aria-hidden="true" />
              <span>{loading ? '...' : rewards.devCredits}</span>
            </p>
          </div>

          <div className="rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#101530] px-4 py-2.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#6B7188] dark:text-[#8E97B8]">
              Consecutive Streak
            </p>
            <p className="mt-0.5 flex items-center gap-1.5 font-display text-xl font-extrabold text-[#1A1464] dark:text-[#F4F6FC] tabular-nums">
              <Flame className="h-4 w-4 text-[#EE1119]" aria-hidden="true" />
              <span>
                {loading ? '...' : `${rewards.streakDays} ${rewards.streakDays === 1 ? 'Day' : 'Days'}`}
              </span>
            </p>
          </div>

          {/* Primary Daily Claim CTA */}
          <motion.button
            type="button"
            disabled={loading || claimedToday || busyAction === 'claim'}
            onClick={() => void handleClaimDailyReward()}
            whileTap={{ scale: claimedToday ? 1 : 0.97 }}
            transition={SPRING_SNAPPY}
            className={`inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-5 py-3 text-xs sm:text-sm font-bold transition-colors whitespace-nowrap ${
              claimedToday
                ? 'border border-[#10B981]/35 bg-[#ECFDF5] dark:bg-[#0D2A24]/75 text-[#065F46] dark:text-[#A7F3D0] cursor-default'
                : 'bg-[#EE1119] text-white shadow-[0_10px_24px_rgba(238,17,25,0.22)] hover:bg-[#D00D14] disabled:opacity-60'
            }`}
          >
            {claimedToday ? (
              <>
                <Check className="h-4 w-4" aria-hidden="true" />
                <span>Checked In Today · Tomorrow +{tomorrowCredits}</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                <span>
                  {busyAction === 'claim'
                    ? 'Claiming...'
                    : `Claim Day ${projectedClaimDay} (+${projectedCredits} DevCredits)`}
                </span>
              </>
            )}
          </motion.button>
        </div>
      </div>

      {/* Feedback / Error Notices */}
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

      {/* 7-Day Escalating Reward Ladder */}
      <div className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-wider text-[#1A1464] dark:text-[#F4F6FC]">
            7-Day Streak Ladder
          </p>
          <p className="text-xs text-[#6B7188] dark:text-[#8E97B8] tabular-nums">
            Best streak: {rewards.longestStreak} {rewards.longestStreak === 1 ? 'day' : 'days'} ·{' '}
            {rewards.lifetimeCredits} lifetime DevCredits
          </p>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-7">
          {DAILY_STREAK_LADDER.map((step) => {
            const isCompleted =
              claimedToday
                ? step.day <= ladderActiveStep
                : step.day < ladderActiveStep && rewards.streakDays > 0;
            const isTodayTarget = !claimedToday && step.day === ladderActiveStep;

            return (
              <div
                key={step.day}
                className={`flex flex-col justify-between rounded-xl border p-3 transition-colors ${
                  isTodayTarget
                    ? 'border-[#EE1119] bg-[#EE1119]/5 dark:bg-[#EE1119]/12'
                    : isCompleted
                      ? 'border-[#10B981]/40 bg-[#ECFDF5]/60 dark:bg-[#0D2A24]/50'
                      : 'border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB]/70 dark:bg-[#101530]'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-mono text-[11px] font-bold uppercase text-[#6B7188] dark:text-[#8E97B8] tabular-nums">
                    Day {step.day}
                  </span>
                  {isCompleted ? (
                    <Check className="h-3.5 w-3.5 text-[#10B981]" aria-hidden="true" />
                  ) : isTodayTarget ? (
                    <Sparkles className="h-3.5 w-3.5 text-[#EE1119]" aria-hidden="true" />
                  ) : null}
                </div>

                <p className="mt-1.5 font-display text-base font-extrabold text-[#1A1464] dark:text-[#F4F6FC] tabular-nums">
                  +{step.credits}
                </p>

                <p className="mt-1 truncate text-[11px] font-medium text-[#6B7188] dark:text-[#8E97B8]">
                  {step.milestoneLabel || (isCompleted ? 'Claimed' : isTodayTarget ? 'Claim Today' : 'DevCredits')}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Exclusive Technical Resources Vault */}
      <div className="mt-8 border-t border-[#E5E7F0] dark:border-[#242C54] pt-7">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[#EE1119]">
              <Award className="h-4 w-4" aria-hidden="true" />
              <span>Exclusive Technical Resources</span>
            </p>
            <h3 className="mt-1 font-display text-xl font-extrabold text-[#1A1464] dark:text-[#F4F6FC]">
              Engineering Playbooks &amp; Code Kits
            </h3>
          </div>
          <p className="text-xs text-[#6B7188] dark:text-[#8E97B8]">
            Unlock automatically at streak milestones or redeem anytime with DevCredits
          </p>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          {EXCLUSIVE_TECH_RESOURCES.map((res) => {
            const unlocked = isResourceUnlocked(res);
            const canAfford = hasDoc && rewards.devCredits >= res.unlockCostCredits;
            const redeeming = busyAction === res.id;

            return (
              <div
                key={res.id}
                className={`flex flex-col justify-between rounded-xl border p-5 transition-colors ${
                  unlocked
                    ? 'border-[#1A1464]/30 dark:border-[#4F59B8] bg-[#F6F7FB] dark:bg-[#101530]'
                    : 'border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#101530]/60'
                }`}
              >
                <div>
                  <p className="font-mono text-[11px] font-semibold text-[#6B7188] dark:text-[#8E97B8] tabular-nums">
                    <span className="font-bold text-[#EE1119]">{res.category}</span>
                    <span className="mx-1.5" aria-hidden="true">·</span>
                    <span>{res.formatLabel}</span>
                    <span className="mx-1.5" aria-hidden="true">·</span>
                    <span className={unlocked ? 'font-bold text-[#10B981]' : ''}>
                      {unlocked
                        ? 'Unlocked'
                        : `Day ${res.requiredStreakDays} Streak or ${res.unlockCostCredits} Credits`}
                    </span>
                  </p>

                  <h4 className="mt-2 font-display text-base font-bold text-[#1A1464] dark:text-[#F4F6FC]">
                    {res.title}
                  </h4>
                  <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-[#4A4F63] dark:text-[#C2C9E0]">
                    {res.summary}
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#E5E7F0] dark:border-[#242C54] pt-4">
                  {unlocked ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setCopiedCode(false);
                          setActiveResource(res);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#1A1464] dark:bg-[#2E368F] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#EE1119]"
                      >
                        <Unlock className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Open Resource Kit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadResource(res)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] px-3 py-2 text-xs font-semibold text-[#1A1464] dark:text-[#F4F6FC] hover:border-[#1A1464]/40 dark:hover:border-[#4F59B8]"
                      >
                        <Download className="h-3.5 w-3.5 text-[#EE1119]" aria-hidden="true" />
                        <span>Download .md</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6B7188] dark:text-[#8E97B8] tabular-nums">
                        <Lock className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>
                          {canAfford
                            ? 'Ready to unlock'
                            : `Need ${Math.max(0, res.unlockCostCredits - rewards.devCredits)} more DevCredits`}
                        </span>
                      </span>
                      <button
                        type="button"
                        disabled={!canAfford || redeeming || !user?.emailVerified}
                        onClick={() => void handleRedeemResource(res)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#EE1119] px-3.5 py-2 text-xs font-bold text-white transition-colors hover:bg-[#D00D14] disabled:bg-[#E5E7F0] dark:disabled:bg-[#242C54] disabled:text-[#6B7188] dark:disabled:text-[#8E97B8] disabled:cursor-not-allowed tabular-nums"
                      >
                        <Coins className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>
                          {redeeming ? 'Unlocking...' : `Unlock (${res.unlockCostCredits} Credits)`}
                        </span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Exclusive Resource Reader Modal */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {activeResource && (
              <div
                className="fixed inset-0 z-[90] flex items-center justify-center p-3 sm:p-6"
                role="dialog"
                aria-modal="true"
                aria-labelledby="resource-reader-title"
              >
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setActiveResource(null)}
                  className="fixed inset-0 bg-[#090D1F]/70 backdrop-blur-sm"
                />

                <motion.div
                  initial={{ opacity: 0, y: 16, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 12, scale: 0.98 }}
                  transition={{ duration: 0.22, ease: EASE_OUT_EXPO }}
                  className="relative z-10 flex max-h-[88dvh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] shadow-2xl"
                >
                  <div className="flex items-start justify-between gap-3 border-b border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#101530] px-5 py-4 sm:px-6">
                    <div>
                      <p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[#EE1119]">
                        {activeResource.category} · {activeResource.formatLabel}
                      </p>
                      <h3
                        id="resource-reader-title"
                        className="mt-1 font-display text-lg sm:text-xl font-extrabold text-[#1A1464] dark:text-[#F4F6FC]"
                      >
                        {activeResource.title}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveResource(null)}
                      aria-label="Close resource kit"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-white dark:bg-[#141A38] text-[#1A1464] dark:text-[#F4F6FC] hover:text-[#EE1119]"
                    >
                      <X className="h-5 w-5" aria-hidden="true" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
                    <p className="text-sm leading-relaxed text-[#4A4F63] dark:text-[#C2C9E0]">
                      {activeResource.summary}
                    </p>

                    <div>
                      <h4 className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-[#1A1464] dark:text-[#9FA8FF]">
                        Implementation Checklist
                      </h4>
                      <ol className="mt-3 space-y-2.5">
                        {activeResource.steps.map((step, idx) => (
                          <li
                            key={step}
                            className="flex items-start gap-3 rounded-xl border border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#101530] p-3.5 text-sm text-[#4A4F63] dark:text-[#C2C9E0]"
                          >
                            <span className="font-mono text-xs font-bold text-[#EE1119] tabular-nums pt-0.5">
                              0{idx + 1}
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-[#1A1464]/20 dark:border-[#2B3466] bg-[#120D4A] text-white">
                      <div className="flex items-center justify-between border-b border-white/15 px-4 py-3">
                        <div className="flex items-center gap-2 font-mono text-xs text-white/85">
                          <Terminal className="h-3.5 w-3.5 text-[#EE1119]" aria-hidden="true" />
                          <span>{activeResource.codeFilename}</span>
                        </div>
                        <button
                          type="button"
                          onClick={async () => {
                            await navigator.clipboard.writeText(activeResource.codeSnippet);
                            setCopiedCode(true);
                            window.setTimeout(() => setCopiedCode(false), 2000);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-2.5 py-1 font-mono text-[11px] font-semibold text-white hover:bg-white/20"
                        >
                          {copiedCode ? (
                            <>
                              <Check className="h-3 w-3 text-[#EE1119]" aria-hidden="true" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" aria-hidden="true" />
                              <span>Copy Snippet</span>
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="overflow-x-auto p-4 font-mono text-xs leading-relaxed text-white/90">
                        <code>{activeResource.codeSnippet}</code>
                      </pre>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E5E7F0] dark:border-[#242C54] bg-[#F6F7FB] dark:bg-[#101530] px-5 py-3.5 sm:px-6">
                    <button
                      type="button"
                      onClick={() => handleDownloadResource(activeResource)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#EE1119] px-4 py-2 text-xs font-bold text-white hover:bg-[#D00D14]"
                    >
                      <Download className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Download Playbook (.md)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveResource(null)}
                      className="rounded-xl bg-[#1A1464] dark:bg-[#2E368F] px-5 py-2 text-xs font-bold text-white hover:bg-[#120D4A] dark:hover:bg-[#3A43A8]"
                    >
                      Done
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </Reveal>
  );
};
