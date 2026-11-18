import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  User,
} from 'firebase/auth';
import {
  auth,
  googleProvider,
  isValidProfilePhotoUrl,
  PreferredContactChannel,
  subscribeUserPrivateProfile,
  subscribeUserPublicProfile,
  syncVerifiedUserProfile,
  UserProfileDetails,
  UserProfileExtra,
} from '../firebase';

interface AuthContextValue {
  user: User | null;
  profilePhotoUrl: string | null;
  profileDetails: UserProfileDetails;
  loading: boolean;
  authError: string | null;
  emailProviderDisabled: boolean;
  verificationSent: boolean;
  clearAuthError: () => void;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (params: {
    name: string;
    email: string;
    password: string;
    country: string;
    phone: string;
  }) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  refreshUserStatus: () => Promise<boolean>;
  updateUserDisplayName: (newName: string) => Promise<void>;
  updateUserProfilePhoto: (photoUrl: string) => Promise<void>;
  updateUserProfileDetails: (params: {
    displayName: string;
    bio: string;
    country: string;
    phone: string;
    preferredChannel: PreferredContactChannel;
    projectUpdatesOptIn: boolean;
    marketingOptIn: boolean;
  }) => Promise<void>;
  signOutUser: () => Promise<void>;
}

const DEFAULT_PROFILE_DETAILS: UserProfileDetails = {
  bio: '',
  country: '',
  phone: '',
  preferredChannel: 'email',
  projectUpdatesOptIn: true,
  marketingOptIn: false,
};

const AuthContext = createContext<AuthContextValue | null>(null);

const PENDING_PROFILE_KEY = '0xdev_pending_profile';

function mapFirebaseAuthError(error: unknown): { message: string; providerDisabled: boolean } {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code: string }).code)
      : '';

  switch (code) {
    case 'auth/operation-not-allowed':
      return {
        message:
          'Email & password sign-in is not yet enabled in Firebase Authentication for this project. Enable "Email/Password" in Firebase Console -> Authentication -> Sign-in method, or use Continue with Google below.',
        providerDisabled: true,
      };
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return {
        message: 'Incorrect email address or password. Please check your credentials and try again.',
        providerDisabled: false,
      };
    case 'auth/email-already-in-use':
      return {
        message: 'An account with this email already exists. Please switch to Sign In instead.',
        providerDisabled: false,
      };
    case 'auth/weak-password':
      return {
        message: 'Please choose a stronger password with at least 8 characters.',
        providerDisabled: false,
      };
    case 'auth/invalid-email':
      return {
        message: 'Please enter a valid email address.',
        providerDisabled: false,
      };
    case 'auth/too-many-requests':
      return {
        message: 'Too many attempts. Please wait a moment before trying again.',
        providerDisabled: false,
      };
    case 'auth/popup-closed-by-user':
      return {
        message: 'Google sign-in popup was closed before completing. Please try again.',
        providerDisabled: false,
      };
    default:
      return {
        message: 'Unable to complete authentication right now. Please try again.',
        providerDisabled: false,
      };
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [emailProviderDisabled, setEmailProviderDisabled] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [firestorePhotoUrl, setFirestorePhotoUrl] = useState<string | undefined>(undefined);
  const [profileDetails, setProfileDetails] = useState<UserProfileDetails>(DEFAULT_PROFILE_DETAILS);

  const clearAuthError = useCallback(() => {
    setAuthError(null);
    setEmailProviderDisabled(false);
  }, []);

  const [, setRefreshTick] = useState(0);

  const consumeAndSyncPendingProfile = useCallback(async (targetUser: User) => {
    let extra: UserProfileExtra | undefined;
    try {
      const cached = window.localStorage.getItem(PENDING_PROFILE_KEY);
      if (cached) {
        extra = JSON.parse(cached) as UserProfileExtra;
      }
    } catch {
      // Ignore storage parsing errors
    }

    await syncVerifiedUserProfile(targetUser, extra);

    if (extra) {
      try {
        window.localStorage.removeItem(PENDING_PROFILE_KEY);
      } catch {
        // Ignore storage errors
      }
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (!currentUser) {
        setFirestorePhotoUrl(undefined);
        setProfileDetails(DEFAULT_PROFILE_DETAILS);
      }

      if (currentUser && currentUser.emailVerified) {
        try {
          await consumeAndSyncPendingProfile(currentUser);
        } catch (err) {
          console.error('Failed to sync user profile:', err);
        }
      }
    });

    return () => unsubscribe();
  }, [consumeAndSyncPendingProfile]);

  useEffect(() => {
    if (!user || !user.emailVerified) {
      setFirestorePhotoUrl(undefined);
      setProfileDetails(DEFAULT_PROFILE_DETAILS);
      return;
    }

    const unsubPublic = subscribeUserPublicProfile(user.uid, (profile) => {
      setFirestorePhotoUrl(profile?.photoUrl);
      setProfileDetails((prev) => ({
        ...prev,
        bio: profile?.bio ?? '',
      }));
    });

    const unsubPrivate = subscribeUserPrivateProfile(user.uid, (priv) => {
      setProfileDetails((prev) => ({
        ...prev,
        country: priv?.country ?? '',
        phone: priv?.phone ?? '',
        preferredChannel: priv?.preferredChannel ?? 'email',
        projectUpdatesOptIn:
          priv?.projectUpdatesOptIn !== undefined ? priv.projectUpdatesOptIn : true,
        marketingOptIn: priv?.marketingOptIn !== undefined ? priv.marketingOptIn : false,
      }));
    });

    return () => {
      unsubPublic();
      unsubPrivate();
    };
  }, [user]);

  const signInWithGoogle = useCallback(async () => {
    clearAuthError();
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      const mapped = mapFirebaseAuthError(error);
      setAuthError(mapped.message);
      setEmailProviderDisabled(mapped.providerDisabled);
      throw error;
    }
  }, [clearAuthError]);

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      clearAuthError();
      try {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      } catch (error) {
        const mapped = mapFirebaseAuthError(error);
        setAuthError(mapped.message);
        setEmailProviderDisabled(mapped.providerDisabled);
        throw error;
      }
    },
    [clearAuthError]
  );

  const registerWithEmail = useCallback(
    async (params: {
      name: string;
      email: string;
      password: string;
      country: string;
      phone: string;
    }) => {
      clearAuthError();
      try {
        const cred = await createUserWithEmailAndPassword(
          auth,
          params.email.trim(),
          params.password
        );
        await updateProfile(cred.user, { displayName: params.name.trim() });
        await cred.user.reload();
        setUser(auth.currentUser);
        setRefreshTick((n) => n + 1);

        try {
          window.localStorage.setItem(
            PENDING_PROFILE_KEY,
            JSON.stringify({
              displayName: params.name.trim(),
              country: params.country,
              phone: params.phone,
            })
          );
        } catch {
          // Ignore storage availability issues
        }

        try {
          try {
            await sendEmailVerification(cred.user, {
              url: `${window.location.origin}/`,
            });
          } catch {
            await sendEmailVerification(cred.user);
          }
          setVerificationSent(true);
        } catch {
          // Do not block sign-in if email sending throttles
        }
      } catch (error) {
        const mapped = mapFirebaseAuthError(error);
        setAuthError(mapped.message);
        setEmailProviderDisabled(mapped.providerDisabled);
        throw error;
      }
    },
    [clearAuthError]
  );

  const sendPasswordReset = useCallback(
    async (email: string) => {
      clearAuthError();
      const targetEmail = email.trim();
      try {
        try {
          await sendPasswordResetEmail(auth, targetEmail, {
            url: `${window.location.origin}/login`,
          });
        } catch (err) {
          const code =
            typeof err === 'object' && err !== null && 'code' in err
              ? String((err as { code: string }).code)
              : '';
          if (code === 'auth/unauthorized-continue-uri') {
            await sendPasswordResetEmail(auth, targetEmail);
          } else {
            throw err;
          }
        }
      } catch (error) {
        const code =
          typeof error === 'object' && error !== null && 'code' in error
            ? String((error as { code: string }).code)
            : '';
        // Preserve privacy when user is not found unless it's invalid-email/rate-limit
        if (code === 'auth/user-not-found') {
          return;
        }
        const mapped = mapFirebaseAuthError(error);
        setAuthError(mapped.message);
        setEmailProviderDisabled(mapped.providerDisabled);
        throw error;
      }
    },
    [clearAuthError]
  );

  const resendVerificationEmail = useCallback(async () => {
    if (!auth.currentUser) return;
    try {
      await sendEmailVerification(auth.currentUser, {
        url: `${window.location.origin}/`,
      });
    } catch {
      await sendEmailVerification(auth.currentUser);
    }
    setVerificationSent(true);
  }, []);

  const refreshUserStatus = useCallback(async () => {
    if (!auth.currentUser) return false;
    await auth.currentUser.reload();
    const updated = auth.currentUser;
    setUser(updated);
    setRefreshTick((n) => n + 1);
    if (updated?.emailVerified) {
      await consumeAndSyncPendingProfile(updated);
      return true;
    }
    return false;
  }, [consumeAndSyncPendingProfile]);

  const updateUserDisplayName = useCallback(async (newName: string) => {
    if (!auth.currentUser) {
      throw new Error('No authenticated user found.');
    }
    const trimmed = newName.trim().slice(0, 100);
    if (trimmed.length < 2) {
      throw new Error('Profile name must be at least 2 characters.');
    }
    await updateProfile(auth.currentUser, { displayName: trimmed });
    await auth.currentUser.reload();
    const updated = auth.currentUser;
    setUser(updated);
    setRefreshTick((n) => n + 1);
    if (updated?.emailVerified) {
      await syncVerifiedUserProfile(updated, { displayName: trimmed });
    }
  }, []);

  const updateUserProfilePhoto = useCallback(async (photoUrl: string) => {
    if (!auth.currentUser) {
      throw new Error('No authenticated user found.');
    }
    if (!auth.currentUser.emailVerified) {
      throw new Error('Please verify your email address before saving a profile picture.');
    }

    const trimmed = photoUrl.trim();
    if (!isValidProfilePhotoUrl(trimmed)) {
      throw new Error(
        'Please upload a PNG, JPEG, WebP, or GIF image, or enter a valid https:// image URL.'
      );
    }

    // Sync to Firebase Auth when empty (clear) or short HTTPS URL
    if (trimmed === '' || (trimmed.startsWith('https://') && trimmed.length <= 2000)) {
      await updateProfile(auth.currentUser, { photoURL: trimmed });
      await auth.currentUser.reload();
      setUser(auth.currentUser);
    }

    setFirestorePhotoUrl(trimmed);
    setRefreshTick((n) => n + 1);
    await syncVerifiedUserProfile(auth.currentUser, { photoUrl: trimmed });
  }, []);

  const updateUserProfileDetails = useCallback(
    async (params: {
      displayName: string;
      bio: string;
      country: string;
      phone: string;
      preferredChannel: PreferredContactChannel;
      projectUpdatesOptIn: boolean;
      marketingOptIn: boolean;
    }) => {
      if (!auth.currentUser) {
        throw new Error('No authenticated user found.');
      }
      if (!auth.currentUser.emailVerified) {
        throw new Error('Please verify your email address before saving profile updates.');
      }

      const trimmedName = params.displayName.trim().slice(0, 100);
      if (trimmedName.length < 2) {
        throw new Error('Display name must be at least 2 characters.');
      }

      const trimmedBio = params.bio.trim().slice(0, 300);
      const trimmedCountry = params.country.trim().slice(0, 100);
      const trimmedPhone = params.phone.trim().slice(0, 40);

      if (trimmedName !== (auth.currentUser.displayName || '').trim()) {
        await updateProfile(auth.currentUser, { displayName: trimmedName });
        await auth.currentUser.reload();
        setUser(auth.currentUser);
      }

      const nextDetails: UserProfileDetails = {
        bio: trimmedBio,
        country: trimmedCountry,
        phone: trimmedPhone,
        preferredChannel: params.preferredChannel,
        projectUpdatesOptIn: Boolean(params.projectUpdatesOptIn),
        marketingOptIn: Boolean(params.marketingOptIn),
      };
      setProfileDetails(nextDetails);
      setRefreshTick((n) => n + 1);

      await syncVerifiedUserProfile(auth.currentUser, {
        displayName: trimmedName,
        ...nextDetails,
      });
    },
    []
  );

  const signOutUser = useCallback(async () => {
    clearAuthError();
    setVerificationSent(false);
    setFirestorePhotoUrl(undefined);
    setProfileDetails(DEFAULT_PROFILE_DETAILS);
    await signOut(auth);
  }, [clearAuthError]);

  const profilePhotoUrl =
    firestorePhotoUrl === ''
      ? null
      : firestorePhotoUrl || (user?.photoURL ? user.photoURL : null);

  return (
    <AuthContext.Provider
      value={{
        user,
        profilePhotoUrl,
        profileDetails,
        loading,
        authError,
        emailProviderDisabled,
        verificationSent,
        clearAuthError,
        signInWithGoogle,
        signInWithEmail,
        registerWithEmail,
        sendPasswordReset,
        resendVerificationEmail,
        refreshUserStatus,
        updateUserDisplayName,
        updateUserProfilePhoto,
        updateUserProfileDetails,
        signOutUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
