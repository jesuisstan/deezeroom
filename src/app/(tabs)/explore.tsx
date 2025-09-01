import ParallaxScrollView from '@/components/ui/ParallaxScrollView';
import { ThemedText } from '@/components/ui/ThemedText';
import { ThemedView } from '@/components/ui/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import shootAlert from '@/utils/shoot-alert';
import DeezerPreviewPlayer from '@/components/DeezerPreviewPlayer';

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
      <ThemedView className="flex-row gap-2">
        <ThemedText
          type="title"
          onPress={() => shootAlert('dialog', 'Hello', 'Hello')}
          className="text-primary-main"
        >
          THIS APP gonna BE AWESOME
        </ThemedText>
      </ThemedView>
      <ThemedText>
        <DeezerPreviewPlayer />
      </ThemedText>
    </ParallaxScrollView>
  );
}
