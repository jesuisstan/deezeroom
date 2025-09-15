import { FC, useState } from 'react';
import { View } from 'react-native';

import AntDesign from '@expo/vector-icons/AntDesign';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword
} from 'firebase/auth';

import ButtonRipple from '@/components/ui/ButtonRipple';
import InputCustom from '@/components/ui/InputCustom';
import SwipeModal from '@/components/ui/SwipeModal';
import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';
import { getFirebaseErrorMessage } from '@/utils/firebase/firebase-error-handler';
import { auth } from '@/utils/firebase/firebase-init';
import { UserProfile } from '@/utils/firebase/firebase-service-user';
import shootAlert from '@/utils/shoot-alert';

interface ChangePasswordSectionProps {
  profile: UserProfile;
}

const ChangePasswordSection: FC<ChangePasswordSectionProps> = ({ profile }) => {
  const { theme } = useTheme();
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [result, setResult] = useState<any>(null);
  const [isChanging, setIsChanging] = useState(false);

  const needsPasswordSetup = !profile?.authProviders?.emailPassword?.linked;

  const clearInputs = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setResult(null);
  };

  const validatePasswords = () => {
    if (newPassword.length < 6) {
      setResult({
        success: false,
        message: 'New password must be at least 6 characters'
      });
      return false;
    }
    if (newPassword !== confirmPassword) {
      setResult({ success: false, message: 'Passwords do not match' });
      return false;
    }
    return true;
  };

  const handleChangePassword = async () => {
    if (!validatePasswords()) return;
    if (!auth.currentUser?.email) return;

    try {
      setIsChanging(true);
      setResult(null);

      // Re-authenticate with current password
      const credential = EmailAuthProvider.credential(
        auth.currentUser.email,
        currentPassword
      );
      await reauthenticateWithCredential(auth.currentUser, credential);

      // Update password
      await updatePassword(auth.currentUser, newPassword);

      setResult({ success: true, message: 'Password changed successfully' });

      // Clear inputs and close modal after success
      setTimeout(() => {
        clearInputs();
        setShowChangePasswordModal(false);
        shootAlert(
          'toast',
          'Success',
          'Password changed successfully',
          'success'
        );
      }, 1500);
    } catch (error: any) {
      console.log('Change password error:', error);
      const errorMessage = getFirebaseErrorMessage(error);
      setResult({
        success: false,
        message: errorMessage || 'Failed to change password'
      });
    } finally {
      setIsChanging(false);
    }
  };

  // Don't show if user doesn't have email/password linked
  if (needsPasswordSetup) {
    return null;
  }

  return (
    <View>
      <ButtonRipple
        fullWidth
        title="Change password"
        variant="ghost"
        leftIcon={
          <AntDesign
            name="lock"
            size={24}
            color={themeColors[theme]['text-main']}
          />
        }
        onPress={() => setShowChangePasswordModal(true)}
      />
      <TextCustom className="text-center">
        Update your account password for better security.
      </TextCustom>

      {/* Change Password Modal */}
      {showChangePasswordModal && (
        <SwipeModal
          title="Change Password"
          modalVisible={showChangePasswordModal}
          setVisible={setShowChangePasswordModal}
          onClose={clearInputs}
          fade
        >
          <View className="flex-1 gap-4">
            <TextCustom>
              Enter your current password and choose a new one.
            </TextCustom>

            <InputCustom
              placeholder="Current password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
              leftIconName="lock"
            />

            <InputCustom
              placeholder="New password"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              leftIconName="lock"
            />

            <InputCustom
              placeholder="Confirm new password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              leftIconName="lock"
            />

            {result && (
              <View>
                <TextCustom
                  className="text-center"
                  color={
                    result.success
                      ? themeColors[theme]['intent-success']
                      : themeColors[theme]['intent-error']
                  }
                >
                  {result.message}
                </TextCustom>
              </View>
            )}

            <ButtonRipple
              fullWidth
              title="Change Password"
              onPress={handleChangePassword}
              loading={isChanging}
              disabled={
                isChanging ||
                !currentPassword ||
                !newPassword ||
                !confirmPassword
              }
            />

            <ButtonRipple
              fullWidth
              title="Cancel"
              variant="outline"
              onPress={() => {
                clearInputs();
                setShowChangePasswordModal(false);
              }}
            />
          </View>
        </SwipeModal>
      )}
    </View>
  );
};

export default ChangePasswordSection;
