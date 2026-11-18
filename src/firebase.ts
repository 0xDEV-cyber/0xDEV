import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, User } from 'firebase/auth';
import {
  doc,
  getDoc,
  getDocFromServer,
  getFirestore,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// Critical: pass firebaseConfig.firestoreDatabaseId so Firestore targets the provisioned database
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

void testConnection();

export const MAX_PROFILE_PHOTO_LENGTH = 150000;
const SAFE_PROFILE_PHOTO_REGEX =
  /^(|https:\/\/.*|data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+)$/;

export function isValidProfilePhotoUrl(value: string): boolean {
  return value.length <= MAX_PROFILE_PHOTO_LENGTH && SAFE_PROFILE_PHOTO_REGEX.test(value);
}

export type PreferredContactChannel = 'email' | 'whatsapp' | 'phone' | 'google_meet';

export interface UserProfileDetails {
  bio: string;
  country: string;
  phone: string;
  preferredChannel: PreferredContactChannel;
  projectUpdatesOptIn: boolean;
  marketingOptIn: boolean;
}

export interface UserProfileExtra {
  displayName?: string;
  photoUrl?: string;
  bio?: string;
  country?: string;
  phone?: string;
  preferredChannel?: PreferredContactChannel;
  projectUpdatesOptIn?: boolean;
  marketingOptIn?: boolean;
}

const syncQueueByUid = new Map<string, Promise<void>>();

async function performVerifiedUserProfileSync(
  user: User,
  extra?: UserProfileExtra
): Promise<void> {
  if (!user.emailVerified) return;

  const displayName = (
    extra?.displayName ||
    user.displayName ||
    user.email?.split('@')[0] ||
    'Visitor'
  )
    .trim()
    .slice(0, 100);
  const email = (user.email || '').trim().slice(0, 200);
  if (!email) return;

  let sanitizedPhotoUrl: string | undefined;
  if (extra?.photoUrl !== undefined) {
    const trimmedPhoto = extra.photoUrl.trim();
    if (!isValidProfilePhotoUrl(trimmedPhoto)) {
      throw new Error(
        'Profile picture must be a valid HTTPS image URL or compressed PNG/JPEG/WebP image under 110 KB.'
      );
    }
    sanitizedPhotoUrl = trimmedPhoto;
  }

  const sanitizedBio =
    extra?.bio !== undefined ? extra.bio.trim().slice(0, 300) : undefined;

  const publicPath = `users/${user.uid}`;
  const publicRef = doc(db, 'users', user.uid);
  try {
    const existingPublic = await getDoc(publicRef);
    if (!existingPublic.exists()) {
      const fallbackAuthPhoto =
        user.photoURL && isValidProfilePhotoUrl(user.photoURL)
          ? user.photoURL.slice(0, MAX_PROFILE_PHOTO_LENGTH)
          : undefined;
      const initialPhoto =
        sanitizedPhotoUrl !== undefined ? sanitizedPhotoUrl : fallbackAuthPhoto;

      const createPayload: Record<string, unknown> = {
        uid: user.uid,
        displayName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (initialPhoto !== undefined) {
        createPayload.photoUrl = initialPhoto;
      }
      if (sanitizedBio !== undefined) {
        createPayload.bio = sanitizedBio;
      }
      await setDoc(publicRef, createPayload);
    } else {
      const existingData = existingPublic.data();
      const needsNameUpdate =
        Boolean(extra?.displayName) && extra?.displayName?.trim() !== existingData?.displayName;
      const needsPhotoUpdate =
        sanitizedPhotoUrl !== undefined && sanitizedPhotoUrl !== existingData?.photoUrl;
      const needsBioUpdate =
        sanitizedBio !== undefined && sanitizedBio !== (existingData?.bio ?? '');

      if (needsNameUpdate || needsPhotoUpdate || needsBioUpdate) {
        const updatePayload: Record<string, unknown> = {
          updatedAt: serverTimestamp(),
        };
        if (needsNameUpdate) {
          updatePayload.displayName = displayName;
        }
        if (needsPhotoUpdate) {
          updatePayload.photoUrl = sanitizedPhotoUrl;
        }
        if (needsBioUpdate) {
          updatePayload.bio = sanitizedBio;
        }
        await updateDoc(publicRef, updatePayload);
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, publicPath);
  }

  const privatePath = `users/${user.uid}/private/info`;
  const privateRef = doc(db, 'users', user.uid, 'private', 'info');
  try {
    const existingPrivate = await getDoc(privateRef);
    const hasCountry = extra?.country !== undefined;
    const hasPhone = extra?.phone !== undefined;
    const hasChannel = extra?.preferredChannel !== undefined;
    const hasProjectOptIn = extra?.projectUpdatesOptIn !== undefined;
    const hasMarketingOptIn = extra?.marketingOptIn !== undefined;

    const country = (extra?.country || '').trim().slice(0, 100);
    const phone = (extra?.phone || '').trim().slice(0, 40);

    if (!existingPrivate.exists()) {
      const payload: Record<string, unknown> = {
        uid: user.uid,
        email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (country) payload.country = country;
      if (phone) payload.phone = phone;
      if (hasChannel) payload.preferredChannel = extra!.preferredChannel;
      if (hasProjectOptIn) payload.projectUpdatesOptIn = Boolean(extra!.projectUpdatesOptIn);
      if (hasMarketingOptIn) payload.marketingOptIn = Boolean(extra!.marketingOptIn);
      await setDoc(privateRef, payload);
    } else if (hasCountry || hasPhone || hasChannel || hasProjectOptIn || hasMarketingOptIn) {
      const updates: Record<string, unknown> = {
        updatedAt: serverTimestamp(),
      };
      if (hasCountry) updates.country = country;
      if (hasPhone) updates.phone = phone;
      if (hasChannel) updates.preferredChannel = extra!.preferredChannel;
      if (hasProjectOptIn) updates.projectUpdatesOptIn = Boolean(extra!.projectUpdatesOptIn);
      if (hasMarketingOptIn) updates.marketingOptIn = Boolean(extra!.marketingOptIn);
      await updateDoc(privateRef, updates);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, privatePath);
  }
}

/**
 * Syncs the authenticated, email-verified user's public display doc
 * and isolated private PII doc in Firestore, serialized per UID.
 */
export async function syncVerifiedUserProfile(
  user: User,
  extra?: UserProfileExtra
): Promise<void> {
  if (!user.emailVerified) return;

  const previous = syncQueueByUid.get(user.uid) ?? Promise.resolve();
  const next = previous
    .catch(() => undefined)
    .then(() => performVerifiedUserProfileSync(user, extra));

  syncQueueByUid.set(user.uid, next);
  try {
    await next;
  } finally {
    if (syncQueueByUid.get(user.uid) === next) {
      syncQueueByUid.delete(user.uid);
    }
  }
}

export function subscribeUserPublicProfile(
  uid: string,
  onChange: (data: { displayName?: string; photoUrl?: string; bio?: string } | null) => void
): () => void {
  const path = `users/${uid}`;
  const ref = doc(db, 'users', uid);
  return onSnapshot(
    ref,
    (snapshot) => {
      if (!snapshot.exists()) {
        onChange(null);
        return;
      }
      const data = snapshot.data();
      onChange({
        displayName: typeof data.displayName === 'string' ? data.displayName : undefined,
        photoUrl: typeof data.photoUrl === 'string' ? data.photoUrl : undefined,
        bio: typeof data.bio === 'string' ? data.bio : undefined,
      });
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export function subscribeUserPrivateProfile(
  uid: string,
  onChange: (
    data: {
      country?: string;
      phone?: string;
      preferredChannel?: PreferredContactChannel;
      projectUpdatesOptIn?: boolean;
      marketingOptIn?: boolean;
    } | null
  ) => void
): () => void {
  const path = `users/${uid}/private/info`;
  const ref = doc(db, 'users', uid, 'private', 'info');
  return onSnapshot(
    ref,
    (snapshot) => {
      if (!snapshot.exists()) {
        onChange(null);
        return;
      }
      const data = snapshot.data();
      const channel = data.preferredChannel;
      const validChannel: PreferredContactChannel | undefined =
        channel === 'email' ||
        channel === 'whatsapp' ||
        channel === 'phone' ||
        channel === 'google_meet'
          ? channel
          : undefined;
      onChange({
        country: typeof data.country === 'string' ? data.country : undefined,
        phone: typeof data.phone === 'string' ? data.phone : undefined,
        preferredChannel: validChannel,
        projectUpdatesOptIn:
          typeof data.projectUpdatesOptIn === 'boolean' ? data.projectUpdatesOptIn : undefined,
        marketingOptIn:
          typeof data.marketingOptIn === 'boolean' ? data.marketingOptIn : undefined,
      });
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}
