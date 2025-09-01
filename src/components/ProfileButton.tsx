import { Image, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useUser } from '@/contexts/UserContext';

const ProfileButton = () => {
  const { user } = useUser();
  const router = useRouter();

  return (
    <TouchableOpacity
      onPress={() => router.push('/profile')}
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
