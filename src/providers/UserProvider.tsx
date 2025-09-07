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

import { auth } from '@/utils/firebase-init';
import { UserProfile, UserService } from '@/utils/firebase-services';
import shootAlert from '@/utils/shoot-alert';

type TUserContextType = {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  profileLoading: boolean;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
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
  refreshProfile: async () => {}
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
        // Keep emailVerified in sync with Firebase user state
        const merged = {
          ...userProfile,
          emailVerified: !!currentUser.emailVerified
        } as UserProfile;
        setProfile(merged);
        // Persist to Firestore if changed
        if (userProfile.emailVerified !== merged.emailVerified) {
          await UserService.updateUserProfile(currentUser.uid, {
            emailVerified: merged.emailVerified
          });
        }
      } else {
        // If profile does not exist, create it
        console.log('Creating new user profile...');
        await UserService.createOrUpdateUser(currentUser, {
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
      // Sign out from Firebase
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
        refreshProfile
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
