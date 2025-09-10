import { FC, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import ButtonCustom from '@/components/ui/ButtonCustom';
import ButtonIcon from '@/components/ui/ButtonIcon';
import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { useUser } from '@/providers/UserProvider';
import { themeColors } from '@/utils/color-theme';

interface SetupPasswordProps {
  userEmail: string;
}

const SetupPassword: FC<SetupPasswordProps> = ({ userEmail }) => {
  const { linkWithEmailPassword } = useUser();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const { theme } = useTheme();

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
    }
  };

  return (
    <>
      {/*<View className="bg-black/50 flex-1 items-center justify-center border border-border">*/}
      <View className="w-full">
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

        <ButtonCustom
          title="Setup Password"
          onPress={handleSetupPassword}
          disabled={isLoading}
          loading={isLoading}
        />
      </View>
      {/*</View>*/}
    </>
  );
};

export default SetupPassword;
