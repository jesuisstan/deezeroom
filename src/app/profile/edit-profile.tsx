import { FC } from 'react';
import { ScrollView, View } from 'react-native';

import ActivityIndicatorScreen from '@/components/ui/ActivityIndicatorScreen';
import LineButton from '@/components/ui/buttons/LineButton';
import Divider from '@/components/ui/Divider';
import ImageUploader from '@/components/ui/ImageUploader';
import { TextCustom } from '@/components/ui/TextCustom';
import { useUser } from '@/providers/UserProvider';
import { updateAvatar } from '@/utils/profile-utils';

const EditProfileScreen: FC = () => {
  const { user, profile, updateProfile } = useUser();

  const handleImageUploaded = async (imageUrl: string) => {
    if (!user || !profile) return;
    await updateAvatar(imageUrl, profile, updateProfile);
  };

  return !profile ? (
    <ActivityIndicatorScreen />
  ) : (
    <ScrollView className="flex-1 bg-bg-main px-4 py-4">
      <View className="w-full flex-row items-center gap-4 px-4 py-4">
        <ImageUploader
          currentImageUrl={profile?.photoURL}
          onImageUploaded={handleImageUploaded}
          shape="circle"
          placeholder="Add Photo"
          size="sm"
        />
        <TextCustom type="semibold">Change profile picture</TextCustom>
      </View>
      <Divider />
      <LineButton onPress={() => console.log('to be implemented')}>
        <View className="w-full items-start py-4">
          <TextCustom size="m" type="semibold">
            to be implemented
          </TextCustom>
        </View>
      </LineButton>
    </ScrollView>
  );
};

export default EditProfileScreen;
