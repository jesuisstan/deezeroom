import {
  createContext,
  FC,
  ReactNode,
  useContext,
  useEffect,
  useState
} from 'react';

import { GoogleSignin } from '@react-native-google-signin/google-signin';
import {
  onAuthStateChanged,
  signOut as firebaseSignOut,
  User
} from 'firebase/auth';

import { auth } from '@/utils/firebase/firebase-init';
import {
  UserProfile,
  UserService
} from '@/utils/firebase/firebase-service-user';
import shootAlert from '@/utils/shoot-alert';

type TUserContextType = {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  profileLoading: boolean;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
  linkWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  linkWithEmailPassword: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  unlinkWithGoogle: () => Promise<{ success: boolean; error?: string }>;
};

type TUserProviderProps = {
  children: React.ReactNode;
};

const initialUserContext: TUserContextType = {
  user: null,
  profile: null,
  loading: true,
  profileLoading: false,
  signOut: async () => {},
  updateProfile: async () => {},
  refreshProfile: async () => {},
  linkWithGoogle: async () => ({ success: false }),
  linkWithEmailPassword: async () => ({ success: false }),
  unlinkWithGoogle: async () => ({ success: false })
};

const UserContext = createContext<TUserContextType>(initialUserContext);

export const UserProvider: FC<TUserProviderProps> = ({
  children
}: {
  children: ReactNode;
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Load user profile
  const loadUserProfile = async (currentUser: User) => {
    try {
      setProfileLoading(true);
      const userProfile = await UserService.getUserProfile(currentUser.uid);

      if (userProfile) {
        console.log('👤 User profile exists, updating auth providers...');

        // Always update the profile to sync auth providers and other data
        await UserService.createOrUpdateUser(currentUser, {
          emailVerified: !!currentUser.emailVerified
        });

        // Load updated profile
        const updatedProfile = await UserService.getUserProfile(
          currentUser.uid
        );
        setProfile(
          updatedProfile
            ? { ...updatedProfile, emailVerified: !!currentUser.emailVerified }
            : null
        );
      } else {
        // If profile does not exist, create it
        console.log('Creating new user profile...');
        await UserService.createOrUpdateUser(currentUser, {
          emailVerified: !!currentUser.emailVerified,
          musicPreferences: {
            favoriteGenres: [],
            favoriteArtists: []
          }
        });
        // Load created profile
        const newProfile = await UserService.getUserProfile(currentUser.uid);
        setProfile(
          newProfile
            ? { ...newProfile, emailVerified: !!currentUser.emailVerified }
            : null
        );
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  };

  // Update profile
  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;

    try {
      await UserService.updateUserProfile(user.uid, data);
      // Optimistically update local state
      if (profile) {
        setProfile({ ...profile, ...data, updatedAt: new Date() });
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  // Refresh profile from server
  const refreshProfile = async () => {
    if (!user) return;
    await loadUserProfile(user);
  };

  // Link current user with Google account
  const linkWithGoogle = async () => {
    try {
      const result = await UserService.linkWithGoogle();
      if (result.success) {
        // Refresh profile to show updated providers
        await refreshProfile();
        shootAlert(
          'toast',
          'Success',
          'Google account linked successfully',
          'success'
        );
      } else {
        shootAlert(
          'toast',
          'Oops!',
          result.message || 'Google account was not linked',
          'warning'
        );
      }
      return result;
    } catch (error) {
      console.log('Error in linkWithGoogle:', error);
      shootAlert('toast', 'Error', 'Failed to link Google account', 'error');
      return { success: false, message: 'Failed to link Google account' };
    }
  };

  // Unlink current user from Google account
  const unlinkWithGoogle = async () => {
    try {
      const result = await UserService.unlinkGoogle();
      if (result.success) {
        await refreshProfile();
        shootAlert('toast', 'Success', 'Google account unlinked', 'success');
      } else if (result.message) {
        shootAlert(
          'toast',
          'Error',
          result.message || 'Failed to unlink Google account',
          'error'
        );
      }
      return result;
    } catch (error) {
      console.log('Error in unlinkWithGoogle:', error);
      shootAlert('toast', 'Error', 'Failed to unlink Google account', 'error');
      return { success: false, message: 'Failed to unlink Google account' };
    }
  };

  // Link current user with email+password
  const linkWithEmailPassword = async (email: string, password: string) => {
    try {
      const result = await UserService.linkWithEmailPassword(email, password);
      if (result.success) {
        // Refresh profile to show updated providers and emailVerified status
        await refreshProfile();
      }
      return result;
    } catch (error) {
      console.error('Error in linkWithEmailPassword:', error);
      shootAlert('toast', 'Error', 'Failed to link email/password', 'error');
      return { success: false, error: 'Failed to link email/password' };
    }
  };

  useEffect(() => {
    // Configure Google Sign-In when app loads
    GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_WEB_CLIENT_ID,
      iosClientId: process.env.EXPO_PUBLIC_IOS_CLIENT_ID,
      offlineAccess: true
    });

    // Track authentication state changes
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      // Load user profile when user is signed in
      if (currentUser) {
        await loadUserProfile(currentUser);
      } else {
        setProfile(null);
        setProfileLoading(false);
      }
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      setLoading(true);
      // Sign out from Firebase (invalidate auth token, remove user from auth state)
      await firebaseSignOut(auth);

      // Sign out from Google (if possible)
      try {
        await GoogleSignin.signOut();
        console.log('Google sign out successful');
      } catch (googleError) {
        console.log('Google sign out error (non-critical):', googleError);
      }

      // Clear profile
      setProfile(null);
      setProfileLoading(false);
    } catch (error) {
      console.error('Sign out error:', error);
      shootAlert('toast', 'Error', 'Failed to sign out', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <UserContext.Provider
      value={{
        user,
        profile,
        loading,
        profileLoading,
        signOut,
        updateProfile,
        refreshProfile,
        linkWithGoogle,
        linkWithEmailPassword,
        unlinkWithGoogle
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
