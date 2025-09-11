import { FC, useEffect, useState } from 'react';
import { View } from 'react-native';

import PasswordRequirements from '@/components/auth/PasswordRequirements';
import ButtonCustom from '@/components/ui/ButtonCustom';
import InputCustom from '@/components/ui/InputCustom';
import { TextCustom } from '@/components/ui/TextCustom';
import { useUser } from '@/providers/UserProvider';

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
  const [isPasswordValid, setIsPasswordValid] = useState(false);
  const isConfirmValid =
    confirmPassword.length > 0 && confirmPassword === password;

  const handleSetupPassword = async () => {
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

  //const handleClose = () => {
  //  if (!isLoading) {
  //    setPassword('');
  //    setConfirmPassword('');
  //    setPasswordError('');
  //    setConfirmPasswordError('');
  //  }
  //};

  // Update confirm error when password changes
  useEffect(() => {
    if (confirmPassword.length > 0) {
      setConfirmPasswordError(
        confirmPassword === password ? '' : 'Passwords do not match'
      );
    }
  }, [password, confirmPassword]);

  return (
    <View className="flex-1 gap-4">
      <View>
        <TextCustom>Create a password for account</TextCustom>
        <TextCustom type="bold">{userEmail}</TextCustom>
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
      />

      {/* Password requirements */}
      <PasswordRequirements
        password={password}
        onValidationChange={setIsPasswordValid}
      />

      {/* Submit Button */}
      <ButtonCustom
        title="Setup password"
        size="lg"
        loading={isLoading}
        onPress={handleSetupPassword}
        fullWidth
        disabled={isLoading || !isPasswordValid || !isConfirmValid}
      />
    </View>
  );
};

export default SetupPassword;
