import { Image, Pressable, View } from 'react-native';

import { useRouter } from 'expo-router';

import { TextCustom } from '@/components/ui/TextCustom';
import { useUser } from '@/providers/UserProvider';

const ProfileButton = () => {
  const { user } = useUser();
  const router = useRouter();

  return (
    <Pressable
      className="mr-4 items-center rounded-full"
      onPress={() => {
        router.push('/profile');
      }}
      hitSlop={8}
    >
      {user?.photoURL ? (
        <Image
          source={{ uri: user.photoURL }}
          className="h-12 w-12 rounded-full border-2 border-border"
          accessibilityRole="button"
          alt="Profile"
        />
      ) : (
        <View className="h-12 w-12 items-center justify-center rounded-full border-2 border-border bg-primary">
          <TextCustom type="title">
            {(user?.displayName || user?.email || '?')
              .trim()
              .charAt(0)
              .toUpperCase()}
          </TextCustom>
        </View>
      )}
    </Pressable>
  );
};

export default ProfileButton;
