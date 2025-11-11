import { FC, useEffect, useState } from 'react';
import { View } from 'react-native';

import PasswordRequirements from '@/components/auth/PasswordRequirements';
import { Logger } from '@/components/modules/logger';
import { Notifier } from '@/components/modules/notifier';
import RippleButton from '@/components/ui/buttons/RippleButton';
import InputCustom from '@/components/ui/InputCustom';
import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { useUser } from '@/providers/UserProvider';
import { themeColors } from '@/style/color-theme';

interface SetupPasswordProps {
  userEmail: string;
}

const SetupPassword: FC<SetupPasswordProps> = ({ userEmail }) => {
  const { theme } = useTheme();
  const { linkWithEmailPassword } = useUser();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [isPasswordValid, setIsPasswordValid] = useState(false);
  const isConfirmValid =
    confirmPassword.length > 0 && confirmPassword === password;
  const [result, setResult] = useState<any>(null);

  const handleSetupPassword = async () => {
    setIsLoading(true);
    try {
      const result = await linkWithEmailPassword(userEmail, password);
      setResult(result);
      if (result.success) {
        // Reset form
        setPassword('');
        setConfirmPassword('');
      }
    } catch (error) {
      Logger.error(
        'Error setting up password COMPONENT:',
        error,
        'SetupPassword'
      );

      Notifier.shoot({
        type: 'error',
        title: 'Error',
        message: 'Failed to set up password'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Update confirm error when password changes
  useEffect(() => {
    if (confirmPassword.length > 0) {
      setConfirmPasswordError(
        confirmPassword === password ? '' : 'Passwords do not match'
      );
    }
  }, [password, confirmPassword]);

  return (
    <View className="flex-1 gap-4 px-4 pb-4">
      <View>
        <TextCustom>Create a password for account</TextCustom>
        <TextCustom type="bold">{userEmail}</TextCustom>
        <TextCustom>and then verify your email address.</TextCustom>
      </View>

      {/* Password */}
      <InputCustom
        placeholder="Create password"
        value={password}
        onChangeText={(text) => {
          setPassword(text);
          const invalid = text.match(
            /[^A-Za-z0-9!@\$%\^\*\(\)_\+\-\=\[\]\{\}:;\.,]/
          );
          setPasswordError(
            invalid ? `Unsupported character: ${invalid[0]}` : ''
          );
        }}
        onClear={() => setPassword('')}
        secureTextEntry
        leftIconName="lock"
        errorText={passwordError}
        //autoFocus={true}
        keyboardType="default"
      />

      {/* Repeat password */}
      <InputCustom
        placeholder="Repeat password"
        value={confirmPassword}
        onChangeText={(text) => {
          setConfirmPassword(text);
          setConfirmPasswordError(
            text.length === 0 || text === password
              ? ''
              : 'Passwords do not match'
          );
        }}
        onClear={() => {
          setConfirmPassword('');
          setConfirmPasswordError('');
        }}
        secureTextEntry
        returnKeyType="done"
        onSubmitEditing={handleSetupPassword}
        leftIconName="lock"
        onBlur={() => {
          if (confirmPassword.length > 0 && confirmPassword !== password) {
            setConfirmPasswordError('Passwords do not match');
          }
        }}
        errorText={confirmPasswordError}
        keyboardType="default"
      />

      {/* Password requirements */}
      <PasswordRequirements
        password={password}
        onValidationChange={setIsPasswordValid}
      />

      {/* Submit Button */}
      <RippleButton
        width="full"
        title="Setup password"
        size="lg"
        loading={isLoading}
        onPress={handleSetupPassword}
        disabled={isLoading || !isPasswordValid || !isConfirmValid}
      />

      {result && (
        <View className="flex-1">
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
    </View>
  );
};

export default SetupPassword;
