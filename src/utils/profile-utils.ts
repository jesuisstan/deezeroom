import { Logger } from '@/modules/logger';
import {
  UserProfile,
  UserService
} from '@/utils/firebase/firebase-service-user';

export const updateAvatar = async (
  imageUrl: string,
  profile: UserProfile,
  updateProfile: (data: Partial<UserProfile>) => Promise<void>
) => {
  try {
    // If this is an empty string, delete the avatar
    if (!imageUrl) {
      const result = await UserService.deleteUserAvatar(profile.uid);
      if (result.success) {
        // Update local state
        updateProfile({ photoURL: '' });
      } else {
        Logger.error('Failed to delete avatar', result.error, 'ProfileScreen');
      }
      return;
    }

    // Upload new image using UserService
    const result = await UserService.uploadUserAvatar(profile.uid, imageUrl);
    if (result.success && result.photoURL) {
      // Update local state with the Firebase Storage URL
      updateProfile({ photoURL: result.photoURL });
    } else {
      Logger.error('Failed to upload avatar', result.error, '🗿 ProfileScreen');
    }
  } catch (error) {
    Logger.error('Error handling image upload', error, '🗿 ProfileScreen');
  }
};
