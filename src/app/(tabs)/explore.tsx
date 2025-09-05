import { View } from 'react-native';

import DeezerPreviewPlayer from '@/components/DeezerPreviewPlayer';
import { IconSymbol } from '@/components/ui/IconSymbol';
import ParallaxScrollView from '@/components/ui/ParallaxScrollView';
import { TextCustom } from '@/components/ui/TextCustom';
import shootAlert from '@/utils/shoot-alert';

export default function TabTwoScreen() {
  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }}
      headerImage={
        <IconSymbol
          size={310}
          color="#808080"
          name="chevron.left.forwardslash.chevron.right"
          style={{ position: 'absolute', bottom: -90, left: -35 }}
        />
      }
    >
      <View className="flex-row gap-2">
        <TextCustom
          type="title"
          onPress={() => shootAlert('dialog', 'Hello', 'Hello')}
          className="text-text-main"
        >
          THIS APP gonna BE AWESOME
        </TextCustom>
      </View>
      <TextCustom>
        <DeezerPreviewPlayer />
      </TextCustom>
    </ParallaxScrollView>
  );
}
