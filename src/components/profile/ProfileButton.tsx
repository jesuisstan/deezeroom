import { Image, Pressable, View } from 'react-native';

import { useRouter } from 'expo-router';

import { TextCustom } from '@/components/ui/TextCustom';
import { useUser } from '@/providers/UserProvider';

const ProfileButton = () => {
  const { profile } = useUser();
  const router = useRouter();

  return (
    <Pressable
      className="items-center rounded-full"
      onPress={() => {
        router.push('/profile');
      }}
      hitSlop={8}
    >
      {profile?.photoURL ? (
        <Image
          source={{ uri: profile.photoURL }}
          className="h-10 w-10 rounded-full border border-border"
          accessibilityRole="button"
          alt="Profile"
        />
      ) : (
        <View className="h-10 w-10 items-center justify-center rounded-full border border-border bg-primary">
          <TextCustom type="title">
            {(profile?.displayName || profile?.email || '?')
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
