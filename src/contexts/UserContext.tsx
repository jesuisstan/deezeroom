import {
  FC,
  createContext,
  ReactNode,
  useContext,
  useState,
  useEffect
} from 'react';
import {
  User,
  onAuthStateChanged,
  signOut as firebaseSignOut
} from 'firebase/auth';
import { auth } from '@/utils/firebase';
import shootAlert from '@/utils/shoot-alert';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

type TUserContextType = {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
};

type TUserProviderProps = {
  children: React.ReactNode;
};

const initialUserContext: TUserContextType = {
  user: null,
  loading: true,
  signOut: async () => {}
};

const UserContext = createContext<TUserContextType>(initialUserContext);

export const UserProvider: FC<TUserProviderProps> = ({
  children
}: {
  children: ReactNode;
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Configure Google Sign-In when app loads
    GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_WEB_CLIENT_ID,
      iosClientId: process.env.EXPO_PUBLIC_IOS_CLIENT_ID,
      offlineAccess: true
    });

    // Track authentication state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
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
    } catch (error) {
      console.error('Sign out error:', error);
      shootAlert('Error', 'Failed to sign out', 'error', true);
    }
  };

  return (
    <UserContext.Provider value={{ user, loading, signOut }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
