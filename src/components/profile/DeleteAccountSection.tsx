import { FC, useState } from 'react';
import { View } from 'react-native';

import AntDesign from '@expo/vector-icons/AntDesign';

import SetupPassword from '@/components/profile/SetupPassword';
import ButtonCustom from '@/components/ui/ButtonCustom';
import Divider from '@/components/ui/Divider';
import InputCustom from '@/components/ui/InputCustom';
import SwipeModal from '@/components/ui/SwipeModal';
import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';
import {
  UserProfile,
  UserService
} from '@/utils/firebase/firebase-service-user';

interface DeleteAccountSectionProps {
  profile: UserProfile;
}

const DeleteAccountSection: FC<DeleteAccountSectionProps> = ({ profile }) => {
  const { theme } = useTheme();
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [result, setResult] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const emailsMatch =
    emailInput.trim().toLowerCase() ===
    (profile?.email || '').trim().toLowerCase();

  const needsPasswordSetup = !profile?.authProviders?.emailPassword?.linked;

  const clearInputs = () => {
    setEmailInput('');
    setPasswordInput('');
    setResult(null);
  };

  const handleDeleteAccount = async () => {
    try {
      setIsDeleting(true);
      setResult(null);
      const response = await UserService.deleteAccountWithPassword(
        emailInput,
        passwordInput
      );
      setResult(response);
      if (response.success) {
        clearInputs();
        setShowDeleteAccountModal(false);
      }
    } catch {
      setResult({ success: false, message: 'Failed to delete account' });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <View>
      <ButtonCustom
        title="Delete my account"
        variant="ghost"
        leftIcon={
          <AntDesign
            name="delete"
            size={24}
            color={themeColors[theme]['text-main']}
          />
        }
        onPress={() => setShowDeleteAccountModal(true)}
      />
      <TextCustom className="text-center">
        This action cannot be undone and you will lose all your favorites,
        playlists, rooms, and all your progress.
      </TextCustom>

      {/* Delete Account Modal */}
      {showDeleteAccountModal && (
        <SwipeModal
          title="Delete Account"
          modalVisible={showDeleteAccountModal}
          setVisible={setShowDeleteAccountModal}
          onClose={clearInputs}
        >
          <View className="flex-1 gap-4">
            <View className="items-center">
              <TextCustom>We are sad to see you go 😢</TextCustom>
              <TextCustom type="bold">
                Are you sure? This action cannot be undone.
              </TextCustom>
            </View>

            {needsPasswordSetup ? (
              <View className="gap-4">
                <Divider />
                <TextCustom className="text-center">
                  To delete your account, please first set up a password for
                  your Google account.
                </TextCustom>
                <SetupPassword userEmail={profile.email} />
                <ButtonCustom
                  title="Cancel"
                  variant="outline"
                  onPress={() => {
                    clearInputs();
                    setShowDeleteAccountModal(false);
                  }}
                />
              </View>
            ) : (
              <>
                <InputCustom
                  placeholder="Confirm your email"
                  value={emailInput}
                  onChangeText={setEmailInput}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                <InputCustom
                  placeholder="Enter your password"
                  value={passwordInput}
                  onChangeText={setPasswordInput}
                  secureTextEntry
                  autoCapitalize="none"
                />
                <ButtonCustom
                  title="Delete Account"
                  color={themeColors[theme]['intent-error']}
                  disabled={!emailInput.trim() || !passwordInput.trim()}
                  loading={isDeleting}
                  onPress={() => {
                    // Pre-submit validation
                    if (!emailInput.trim()) {
                      setResult({
                        success: false,
                        message: 'Please enter your email'
                      });
                      return;
                    }
                    if (!emailsMatch) {
                      setResult({
                        success: false,
                        message:
                          'Entered email does not match your profile email'
                      });
                      return;
                    }
                    if (!passwordInput.trim()) {
                      setResult({
                        success: false,
                        message: 'Please enter your password'
                      });
                      return;
                    }
                    void handleDeleteAccount();
                    setResult(null);
                  }}
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
                <ButtonCustom
                  title="Cancel"
                  variant="outline"
                  onPress={() => {
                    clearInputs();
                    setShowDeleteAccountModal(false);
                  }}
                />
              </>
            )}
          </View>
        </SwipeModal>
      )}
    </View>
  );
};

export default DeleteAccountSection;
