import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, User } from 'firebase/auth';
import {
  doc,
  getDoc,
  getDocFromServer,
  getFirestore,
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

export interface UserProfileExtra {
  displayName?: string;
  country?: string;
  phone?: string;
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

  const publicPath = `users/${user.uid}`;
  const publicRef = doc(db, 'users', user.uid);
  try {
    const existingPublic = await getDoc(publicRef);
    if (!existingPublic.exists()) {
      await setDoc(publicRef, {
        uid: user.uid,
        displayName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else if (
      extra?.displayName &&
      extra.displayName.trim() !== existingPublic.data()?.displayName
    ) {
      await updateDoc(publicRef, {
        displayName,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, publicPath);
  }

  const privatePath = `users/${user.uid}/private/info`;
  const privateRef = doc(db, 'users', user.uid, 'private', 'info');
  try {
    const existingPrivate = await getDoc(privateRef);
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
      await setDoc(privateRef, payload);
    } else if (country || phone) {
      const updates: Record<string, unknown> = {
        updatedAt: serverTimestamp(),
      };
      if (country) updates.country = country;
      if (phone) updates.phone = phone;
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
