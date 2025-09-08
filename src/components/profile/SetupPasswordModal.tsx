import { FC, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

import { TextCustom } from '@/components/ui/TextCustom';
import { useUser } from '@/providers/UserProvider';

interface SetupPasswordModalProps {
  visible: boolean;
  onClose: () => void;
  userEmail: string;
}

const SetupPasswordModal: FC<SetupPasswordModalProps> = ({
  visible,
  onClose,
  userEmail
}) => {
  const { linkWithEmailPassword } = useUser();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');

  const validateInputs = () => {
    let isValid = true;

    // Reset errors
    setPasswordError('');
    setConfirmPasswordError('');

    // Validate password
    if (!password) {
      setPasswordError('Password is required');
      isValid = false;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      isValid = false;
    }

    // Validate confirm password
    if (!confirmPassword) {
      setConfirmPasswordError('Please confirm your password');
      isValid = false;
    } else if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      isValid = false;
    }

    return isValid;
  };

  const handleSetupPassword = async () => {
    if (!validateInputs()) return;

    setIsLoading(true);
    try {
      const result = await linkWithEmailPassword(userEmail, password);
      if (result.success) {
        // Reset form
        setPassword('');
        setConfirmPassword('');
        onClose();
      }
    } catch (error) {
      console.error('Error setting up password:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setPassword('');
      setConfirmPassword('');
      setPasswordError('');
      setConfirmPasswordError('');
      onClose();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View className="bg-black/50 flex-1 items-center justify-center">
        <View className="mx-4 w-full max-w-sm rounded-lg bg-bg-main p-6">
          <TextCustom type="title" className="mb-4 text-center">
            Setup Password
          </TextCustom>

          <TextCustom className="mb-4 text-center text-accent">
            Create a password to enable email/password sign-in for your account
          </TextCustom>

          <View className="mb-4">
            <TextCustom className="mb-2">Email</TextCustom>
            <View className="rounded-lg border border-border bg-bg-secondary p-3">
              <TextCustom className="text-accent">{userEmail}</TextCustom>
            </View>
          </View>

          <View className="mb-4">
            <TextCustom className="mb-2">Password</TextCustom>
            <TextInput
              className="rounded-lg border border-border bg-bg-main p-3 text-text-main"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                setPasswordError('');
              }}
              placeholder="Enter password"
              secureTextEntry
              editable={!isLoading}
            />
            {passwordError ? (
              <TextCustom className="mt-1 text-xs text-red-500">
                {passwordError}
              </TextCustom>
            ) : null}
          </View>

          <View className="mb-6">
            <TextCustom className="mb-2">Confirm Password</TextCustom>
            <TextInput
              className="rounded-lg border border-border bg-bg-main p-3 text-text-main"
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                setConfirmPasswordError('');
              }}
              placeholder="Confirm password"
              secureTextEntry
              editable={!isLoading}
            />
            {confirmPasswordError ? (
              <TextCustom className="mt-1 text-xs text-red-500">
                {confirmPasswordError}
              </TextCustom>
            ) : null}
          </View>

          <View className="flex-row space-x-3">
            <TouchableOpacity
              onPress={handleClose}
              disabled={isLoading}
              className="flex-1 items-center rounded-lg border border-border p-3"
            >
              <TextCustom className="text-accent">Cancel</TextCustom>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSetupPassword}
              disabled={isLoading}
              className="flex-1 items-center rounded-lg bg-blue-500 p-3"
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <TextCustom className="font-bold text-white">
                  Setup Password
                </TextCustom>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default SetupPasswordModal;
