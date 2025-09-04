import { Image, TouchableOpacity } from 'react-native';

import { useRouter } from 'expo-router';

import { useUser } from '@/providers/UserProvider';

const ProfileButton = () => {
  const { user } = useUser();
  const router = useRouter();

  return (
    <TouchableOpacity
      onPress={() => {
        console.log('Route to Profile screen'); // debug
        router.push('/profile');
      }}
      style={{ marginRight: 16 }}
    >
      <Image
        source={{ uri: user?.photoURL || 'https://via.placeholder.com/32' }}
        className="w-12 h-12 rounded-full border-2 border-accent"
      />
    </TouchableOpacity>
  );
};

export default ProfileButton;
