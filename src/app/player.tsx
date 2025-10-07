import { Image, ScrollView, View } from 'react-native';

import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import IconButton from '@/components/ui/buttons/IconButton';
import RippleButton from '@/components/ui/buttons/RippleButton';
import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';

const MOCK_TRACK = {
  title: 'The best track in the world',
  artist: "Stan's favourite Artist",
  album: 'Average album',
  artwork: require('@/assets/images/logo/logo-heart-transparent.png')
};

const PlayerScreen = () => {
  const router = useRouter();
  const { theme } = useTheme();

  return (
    <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
      <LinearGradient
        colors={[
          themeColors[theme]['bg-main'],
          themeColors[theme]['bg-secondary']
        ]}
        style={{ flex: 1 }}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, padding: 24, gap: 24 }}
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-row items-center justify-between">
            <IconButton
              accessibilityLabel="Close player"
              onPress={() => router.back()}
            >
              <TextCustom type="bold" size="xl">
                ✕
              </TextCustom>
            </IconButton>
            <View className="items-center">
              <TextCustom type="subtitle" size="xl">
                MIX
              </TextCustom>
              <TextCustom
                type="semibold"
                size="s"
                color={themeColors[theme]['text-secondary']}
              >
                {MOCK_TRACK.title}
              </TextCustom>
            </View>
            <View style={{ width: 48 }} />
          </View>

          <View className="items-center gap-4">
            <View className="aspect-square w-full overflow-hidden rounded-3xl bg-bg-secondary">
              <Image
                source={MOCK_TRACK.artwork}
                style={{ width: '100%', height: '100%' }}
                resizeMode="contain"
                accessibilityLabel={`${MOCK_TRACK.album} cover art`}
              />
            </View>
            <View className="items-center gap-1">
              <TextCustom type="title" size="3xl">
                {MOCK_TRACK.title}
              </TextCustom>
              <TextCustom
                type="semibold"
                color={themeColors[theme]['text-secondary']}
              >
                {MOCK_TRACK.artist}
              </TextCustom>
              <TextCustom size="s" color={themeColors[theme]['text-secondary']}>
                {MOCK_TRACK.album}
              </TextCustom>
            </View>
          </View>

          <View className="gap-2">
            <View className="flex-row justify-between">
              <TextCustom
                size="xs"
                color={themeColors[theme]['text-secondary']}
              >
                0:00
              </TextCustom>
              <TextCustom
                size="xs"
                color={themeColors[theme]['text-secondary']}
              >
                3:30
              </TextCustom>
            </View>
            <View className="h-2 rounded-full bg-bg-tertiary">
              <View
                className="h-2 rounded-full"
                style={{
                  width: '25%',
                  backgroundColor: themeColors[theme]['primary']
                }}
              />
            </View>
          </View>

          <View className="flex-row items-center justify-around">
            <RippleButton title="Prev" variant="ghost" />
            <RippleButton title="Play" variant="secondary" className="w-32" />
            <RippleButton title="Next" variant="ghost" />
          </View>

          <View className="gap-3">
            <TextCustom type="semibold">Queue</TextCustom>
            <View className="gap-2">
              {[1, 2, 3].map((track) => (
                <View
                  key={track}
                  className="flex-row items-center justify-between rounded-2xl bg-bg-secondary px-4 py-3"
                >
                  <View>
                    <TextCustom type="bold">How you remind me</TextCustom>
                    <TextCustom
                      size="xs"
                      color={themeColors[theme]['text-secondary']}
                    >
                      Nickelback · 3:30
                    </TextCustom>
                  </View>
                  <RippleButton title="Play" size="sm" variant="outline" />
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
};

export default PlayerScreen;
