import { ScrollView, View } from 'react-native';

import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';

import RippleButton from '@/components/ui/buttons/RippleButton';
import { TextCustom } from '@/components/ui/TextCustom';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';
import { containerWidthStyle } from '@/style/container-width-style';

const AboutScreen = () => {
  const { theme } = useTheme();

  return (
    <ScrollView
      className="flex-1 p-4"
      style={{ backgroundColor: themeColors[theme]['bg-main'] }}
    >
      <View style={containerWidthStyle} className="gap-4">
        <TextCustom size="xl" color={themeColors[theme]['text-main']}>
          About
        </TextCustom>
        <View className="flex-row gap-2">
          <View className="flex-1">
            <RippleButton
              title="Events"
              variant="outline"
              onPress={() => router.push('/events')}
              size="sm"
              leftIcon={
                <MaterialCommunityIcons
                  name="party-popper"
                  size={20}
                  color={themeColors[theme]['text-main']}
                />
              }
            />
          </View>
          <View className="flex-1">
            <RippleButton
              title="Playlists"
              variant="outline"
              onPress={() => router.push('/playlists')}
              size="sm"
              leftIcon={
                <MaterialCommunityIcons
                  name="playlist-music"
                  size={20}
                  color={themeColors[theme]['text-main']}
                />
              }
            />
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

export default AboutScreen;
