import { FC, useEffect } from 'react';
import { View } from 'react-native';

import { MaterialIcons } from '@expo/vector-icons';

import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';

interface PasswordRequirementsProps {
  password: string;
  onValidationChange?: (isValid: boolean) => void;
}

const PasswordRequirements: FC<PasswordRequirementsProps> = ({
  password,
  onValidationChange
}) => {
  const { theme } = useTheme();

  const passwordHasMinLength = password.length >= 8;
  const passwordHasLetter = /[A-Za-z]/.test(password);
  const passwordHasUppercase = /[A-Z]/.test(password);
  const passwordHasNumber = /\d/.test(password);
  // Allowed special characters (safe for routing contexts): ! @ $ % ^ * ( ) _ + - = [ ] { } : ; , .
  const passwordHasAllowedSpecial = /[!@\$%\^\*\(\)_\+\-\=\[\]\{\}:;\.,]/.test(
    password
  );
  const passwordHasForbidden =
    /[^A-Za-z0-9!@\$%\^\*\(\)_\+\-\=\[\]\{\}:;\.,]/.test(password);
  const passwordHasLetterAndUppercase =
    passwordHasLetter && passwordHasUppercase;
  const isPasswordValid =
    passwordHasMinLength &&
    passwordHasLetterAndUppercase &&
    passwordHasNumber &&
    passwordHasAllowedSpecial &&
    !passwordHasForbidden;

  // Notify parent component about validation status
  useEffect(() => {
    onValidationChange?.(isPasswordValid);
  }, [isPasswordValid, onValidationChange]);

  return (
    <View className="gap-2 rounded-xl bg-bg-secondary p-4">
      <TextCustom type="bold" size="s">
        Your password must include
      </TextCustom>
      <View className="gap-2">
        <View className="flex-row items-center gap-3">
          <MaterialIcons
            name={'check-circle'}
            size={20}
            color={
              themeColors[theme][
                passwordHasMinLength ? 'intent-success' : 'text-disabled'
              ]
            }
          />
          <TextCustom className="flex-1" size="s">
            At least 8 characters
          </TextCustom>
        </View>
        <View className="flex-row items-center gap-3">
          <MaterialIcons
            name={'check-circle'}
            size={20}
            color={
              themeColors[theme][
                passwordHasLetterAndUppercase
                  ? 'intent-success'
                  : 'text-disabled'
              ]
            }
          />
          <TextCustom className="flex-1" size="s">
            At least 1 letter (including 1 uppercase)
          </TextCustom>
        </View>
        <View className="flex-row items-center gap-3">
          <MaterialIcons
            name={'check-circle'}
            size={20}
            color={
              passwordHasNumber
                ? themeColors[theme]['intent-success']
                : themeColors[theme]['text-disabled']
            }
          />
          <TextCustom className="flex-1" size="s">
            At least 1 number
          </TextCustom>
        </View>
        <View className="flex-row items-center gap-3">
          <MaterialIcons
            name={'check-circle'}
            size={20}
            color={
              themeColors[theme][
                passwordHasAllowedSpecial ? 'intent-success' : 'text-disabled'
              ]
            }
          />
          <TextCustom className="flex-1" size="s">
            At least 1 of special characters ! @ $ % ^ * ( ) _ + - = [ ] {} : ;
            , .
          </TextCustom>
        </View>
      </View>
    </View>
  );
};

export default PasswordRequirements;
