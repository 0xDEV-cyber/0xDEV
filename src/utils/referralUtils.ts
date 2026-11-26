import { User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

export const INVITEE_REFERRAL_BONUS_CREDITS = 50;
export const REFERRER_PAYOUT_BONUS_CREDITS = 100;
export const PENDING_REFERRAL_STORAGE_KEY = '0xdev_pending_referral_code';

export interface ReferralCodeDoc {
  code: string;
  ownerUid: string;
  ownerDisplayName: string;
}

export interface ReferralRecord {
  referralId: string;
  referralCode: string;
  referrerUid: string;
  referrerName: string;
  inviteeUid: string;
  inviteeName: string;
  inviteeBonusCredits: number;
  referrerBonusCredits: number;
  inviteeBonusClaimed: boolean;
  referrerBonusClaimed: boolean;
  status: 'verified' | 'rewarded';
  createdAtMs: number;
}

export interface ReferralTierMilestone {
  count: number;
  label: string;
  perk: string;
}

export const REFERRAL_TIER_MILESTONES: ReferralTierMilestone[] = [
  { count: 1, label: 'First Invite', perk: '+100 DevCredits' },
  { count: 3, label: 'Studio Connector', perk: '+300 DevCredits total' },
  { count: 5, label: 'Engineering Advocate', perk: '+500 DevCredits total' },
  { count: 10, label: 'Founding Partner', perk: '+1,000 DevCredits total' },
];

export function normalizeReferralCode(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .slice(0, 24);
}

export function isValidReferralCodeFormat(code: string): boolean {
  return code.length >= 6 && code.length <= 24 && /^[A-Z0-9-]+$/.test(code);
}

function fnv1a32(input: string, seed = 0x811c9dc5): number {
  let hash = seed >>> 0;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/**
 * Generates a deterministic non-PII shareable code (10 chars, e.g. `0X9K4M2P7Q`)
 * derived strictly from Firebase Auth UID so emails/phones are never exposed.
 */
export function generateReferralCode(uid: string, salt = 0): string {
  const input = salt === 0 ? uid : `${uid}:${salt}`;
  const partA = fnv1a32(input, 0x811c9dc5).toString(36).toUpperCase().padStart(4, '0').slice(-4);
  const partB = fnv1a32(input, 0x9e3779b9).toString(36).toUpperCase().padStart(4, '0').slice(-4);
  return `0X${partA}${partB}`;
}

export function buildReferralShareUrl(code: string): string {
  if (typeof window === 'undefined') {
    return `https://0xdev.studio/?ref=${encodeURIComponent(code)}`;
  }
  return `${window.location.origin}/?ref=${encodeURIComponent(code)}`;
}

export function getPendingReferralCode(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(PENDING_REFERRAL_STORAGE_KEY);
    if (!raw) return null;
    const normalized = normalizeReferralCode(raw);
    return isValidReferralCodeFormat(normalized) ? normalized : null;
  } catch {
    return null;
  }
}

export function setPendingReferralCode(rawCode: string): string | null {
  if (typeof window === 'undefined') return null;
  const normalized = normalizeReferralCode(rawCode);
  try {
    if (!isValidReferralCodeFormat(normalized)) {
      window.localStorage.removeItem(PENDING_REFERRAL_STORAGE_KEY);
      return null;
    }
    window.localStorage.setItem(PENDING_REFERRAL_STORAGE_KEY, normalized);
    return normalized;
  } catch {
    return isValidReferralCodeFormat(normalized) ? normalized : null;
  }
}

export function clearPendingReferralCode(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(PENDING_REFERRAL_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

export function captureReferralCodeFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const refParam = params.get('ref');
  if (!refParam) return getPendingReferralCode();
  return setPendingReferralCode(refParam);
}

function getSafeUserLabel(user: User): string {
  const fromName = (user.displayName || '').trim();
  if (fromName.length >= 1) return fromName.slice(0, 100);
  const fromEmail = (user.email?.split('@')[0] || '').trim();
  if (fromEmail.length >= 1) return fromEmail.slice(0, 100);
  return '0xDEV Member';
}

export async function ensureUserReferralCode(user: User): Promise<ReferralCodeDoc | null> {
  if (!user.emailVerified) return null;

  const ownerDisplayName = getSafeUserLabel(user);
  const q = query(collection(db, 'referralCodes'), where('ownerUid', '==', user.uid));

  try {
    const existingSnap = await getDocs(q);
    if (!existingSnap.empty) {
      const firstDoc = existingSnap.docs[0];
      const data = firstDoc.data();
      const code = String(data.code || firstDoc.id);
      const currentName = String(data.ownerDisplayName || '');

      if (currentName !== ownerDisplayName) {
        await updateDoc(doc(db, 'referralCodes', code), {
          ownerDisplayName,
          updatedAt: serverTimestamp(),
        });
      }

      return {
        code,
        ownerUid: user.uid,
        ownerDisplayName,
      };
    }

    for (let salt = 0; salt < 4; salt += 1) {
      const candidate = generateReferralCode(user.uid, salt);
      const codeRef = doc(db, 'referralCodes', candidate);
      const snap = await getDoc(codeRef);

      if (!snap.exists()) {
        await setDoc(codeRef, {
          code: candidate,
          ownerUid: user.uid,
          ownerDisplayName,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        return {
          code: candidate,
          ownerUid: user.uid,
          ownerDisplayName,
        };
      }

      if (snap.data()?.ownerUid === user.uid) {
        return {
          code: candidate,
          ownerUid: user.uid,
          ownerDisplayName: String(snap.data()?.ownerDisplayName || ownerDisplayName),
        };
      }
    }

    return null;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'referralCodes');
  }
}

export interface RedeemInviteeResult {
  ok: boolean;
  status:
    | 'applied'
    | 'already_referred'
    | 'invalid_code'
    | 'self_referral'
    | 'unverified'
    | 'error';
  message: string;
  referrerName?: string;
}

export async function redeemReferralCodeAsInvitee(params: {
  user: User;
  rawCode: string;
}): Promise<RedeemInviteeResult> {
  const { user, rawCode } = params;

  if (!user.emailVerified) {
    return {
      ok: false,
      status: 'unverified',
      message: 'Verify your email address first to unlock your +50 DevCredits invite bonus.',
    };
  }

  const code = normalizeReferralCode(rawCode);
  if (!isValidReferralCodeFormat(code)) {
    return {
      ok: false,
      status: 'invalid_code',
      message: 'Please enter a valid 0xDEV referral code (e.g. 0X4F9A12BC).',
    };
  }

  const referralRef = doc(db, 'referrals', user.uid);
  const codeRef = doc(db, 'referralCodes', code);
  const rewardsRef = doc(db, 'users', user.uid, 'preferences', 'rewards');

  try {
    const existingRefSnap = await getDoc(referralRef);
    if (existingRefSnap.exists()) {
      clearPendingReferralCode();
      return {
        ok: false,
        status: 'already_referred',
        message: 'Your account has already claimed its one-time referral welcome bonus.',
      };
    }

    const codeSnap = await getDoc(codeRef);
    if (!codeSnap.exists()) {
      return {
        ok: false,
        status: 'invalid_code',
        message: `Referral code "${code}" was not found. Double-check with your friend.`,
      };
    }

    const codeData = codeSnap.data();
    const referrerUid = String(codeData.ownerUid || '');
    const referrerName = String(codeData.ownerDisplayName || '0xDEV Member').slice(0, 100);

    if (!referrerUid || referrerUid === user.uid) {
      return {
        ok: false,
        status: 'self_referral',
        message: 'Self-referrals are not allowed. Share your code with a friend instead.',
      };
    }

    const rewardsSnap = await getDoc(rewardsRef);
    const inviteeName = getSafeUserLabel(user);
    const batch = writeBatch(db);

    batch.set(referralRef, {
      referralId: user.uid,
      referralCode: code,
      referrerUid,
      referrerName,
      inviteeUid: user.uid,
      inviteeName,
      inviteeBonusCredits: INVITEE_REFERRAL_BONUS_CREDITS,
      referrerBonusCredits: REFERRER_PAYOUT_BONUS_CREDITS,
      inviteeBonusClaimed: true,
      referrerBonusClaimed: false,
      status: 'verified',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    if (!rewardsSnap.exists()) {
      batch.set(rewardsRef, {
        uid: user.uid,
        devCredits: INVITEE_REFERRAL_BONUS_CREDITS,
        lifetimeCredits: INVITEE_REFERRAL_BONUS_CREDITS,
        streakDays: 0,
        longestStreak: 0,
        lastClaimDay: '1970-01-01',
        totalClaims: 0,
        unlockedResourceIds: [],
        referralsCount: 0,
        referralCreditsEarned: 0,
        inviteeBonusApplied: true,
        lastClaimedReferralId: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      const rData = rewardsSnap.data();
      if (Boolean(rData.inviteeBonusApplied)) {
        clearPendingReferralCode();
        return {
          ok: false,
          status: 'already_referred',
          message: 'Your account has already applied an invite bonus.',
        };
      }
      const currentDevCredits = Number(rData.devCredits || 0);
      const currentLifetime = Number(rData.lifetimeCredits || 0);
      batch.update(rewardsRef, {
        devCredits: currentDevCredits + INVITEE_REFERRAL_BONUS_CREDITS,
        lifetimeCredits: currentLifetime + INVITEE_REFERRAL_BONUS_CREDITS,
        inviteeBonusApplied: true,
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
    clearPendingReferralCode();

    return {
      ok: true,
      status: 'applied',
      referrerName,
      message: `Referral code ${code} applied! +${INVITEE_REFERRAL_BONUS_CREDITS} DevCredits added from ${referrerName}.`,
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `referrals/${user.uid}`);
  }
}

export async function claimReferrerBonus(params: {
  user: User;
  referral: ReferralRecord;
}): Promise<boolean> {
  const { user, referral } = params;
  if (!user.emailVerified) return false;
  if (referral.referrerUid !== user.uid || referral.referrerBonusClaimed) return false;

  const referralRef = doc(db, 'referrals', referral.referralId);
  const rewardsRef = doc(db, 'users', user.uid, 'preferences', 'rewards');

  try {
    const rewardsSnap = await getDoc(rewardsRef);
    const batch = writeBatch(db);

    batch.update(referralRef, {
      referrerBonusClaimed: true,
      status: 'rewarded',
      updatedAt: serverTimestamp(),
    });

    if (!rewardsSnap.exists()) {
      batch.set(rewardsRef, {
        uid: user.uid,
        devCredits: REFERRER_PAYOUT_BONUS_CREDITS,
        lifetimeCredits: REFERRER_PAYOUT_BONUS_CREDITS,
        streakDays: 0,
        longestStreak: 0,
        lastClaimDay: '1970-01-01',
        totalClaims: 0,
        unlockedResourceIds: [],
        referralsCount: 1,
        referralCreditsEarned: REFERRER_PAYOUT_BONUS_CREDITS,
        inviteeBonusApplied: false,
        lastClaimedReferralId: referral.referralId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      const rData = rewardsSnap.data();
      batch.update(rewardsRef, {
        devCredits: Number(rData.devCredits || 0) + REFERRER_PAYOUT_BONUS_CREDITS,
        lifetimeCredits: Number(rData.lifetimeCredits || 0) + REFERRER_PAYOUT_BONUS_CREDITS,
        referralsCount: Number(rData.referralsCount || 0) + 1,
        referralCreditsEarned:
          Number(rData.referralCreditsEarned || 0) + REFERRER_PAYOUT_BONUS_CREDITS,
        lastClaimedReferralId: referral.referralId,
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();
    return true;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `referrals/${referral.referralId}`);
  }
}

export function mapReferralDocToRecord(
  id: string,
  data: Record<string, unknown>
): ReferralRecord {
  const createdAtMs =
    data.createdAt instanceof Timestamp ? data.createdAt.toMillis() : Date.now();
  return {
    referralId: String(data.referralId || id),
    referralCode: String(data.referralCode || ''),
    referrerUid: String(data.referrerUid || ''),
    referrerName: String(data.referrerName || '0xDEV Member'),
    inviteeUid: String(data.inviteeUid || id),
    inviteeName: String(data.inviteeName || '0xDEV Member'),
    inviteeBonusCredits: Number(data.inviteeBonusCredits || INVITEE_REFERRAL_BONUS_CREDITS),
    referrerBonusCredits: Number(data.referrerBonusCredits || REFERRER_PAYOUT_BONUS_CREDITS),
    inviteeBonusClaimed: Boolean(data.inviteeBonusClaimed),
    referrerBonusClaimed: Boolean(data.referrerBonusClaimed),
    status: data.status === 'rewarded' ? 'rewarded' : 'verified',
    createdAtMs,
  };
}
