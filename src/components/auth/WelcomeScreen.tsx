import { FC } from 'react';
import { ScrollView, View } from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import AuthGoogleButton from '@/components/auth/AuthGoogleButton';
import ThemeToggler from '@/components/ThemeToggler';
import Button from '@/components/ui/Button';
import { TextCustom } from '@/components/ui/TextCustom';
import VideoBanner from '@/components/VideoBanner';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/utils/color-theme';

const WelcomeScreen: FC = () => {
  const { theme } = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-black" edges={['top', 'bottom']}>
      <StatusBar
        style={theme === 'dark' ? 'light' : 'dark'}
        backgroundColor="transparent"
        hidden={true}
      />
      {/* Top half: banner/cover */}
      <View className="flex-1 bg-black">
        <VideoBanner
          videoSource={require('@/assets/videos/welcome-screen-construction.mp4')}
          className="bg-black"
        />
      </View>

      {/* Bottom half: authentication block in Deezer style */}
      <LinearGradient
        colors={[themeColors[theme].black, themeColors[theme]['bg-secondary']]}
        start={{ x: 0, y: 0.1 }}
        end={{ x: 0, y: 5 }}
        className="flex-1 justify-between p-4"
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <View className="gap-3">
            <TextCustom
              type="title"
              className="text-3xl leading-10 tracking-widest text-white"
            >
              {`WELCOME TO${'\n'}THE PARTY`}
            </TextCustom>
            <TextCustom className="text-lg text-white opacity-60">
              Sign up for free or log in
            </TextCustom>

            {/* Continue with email */}
            <Button
              title="Continue with email"
              onPress={() => router.push('/auth/login')}
              size="lg"
              variant="primary"
              fullWidth
              textClassName="tracking-wider"
            />

            {/* Divider */}
            <View className="items-center">
              <TextCustom className="text-lg text-white opacity-60">
                or
              </TextCustom>
            </View>

            {/* Google button */}
            <View className="flex-row items-center justify-center">
              <AuthGoogleButton />
            </View>
          </View>

          <View className="m-4 items-center">
            <ThemeToggler />
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

export default WelcomeScreen;
