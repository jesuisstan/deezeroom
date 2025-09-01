import { Image, Platform } from 'react-native';

import { Collapsible } from '@/components/ui/Collapsible';
import { ExternalLink } from '@/components/ui/ExternalLink';
import ParallaxScrollView from '@/components/ui/ParallaxScrollView';
import { ThemedText } from '@/components/ui/ThemedText';
import { ThemedView } from '@/components/ui/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import shootAlert from '@/utils/shoot-alert';
import { useUser } from '@/contexts/UserContext';
import DeezerPreviewPlayer from '@/components/DeezerPreviewPlayer';


export default function TabTwoScreen() {
  const { user, profile, profileLoading, updateProfile } = useUser();

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
        >
          THIS APP GONNA BE AWESOME
        </ThemedText>
      </ThemedView>
      <ThemedText>
        <DeezerPreviewPlayer />
      </ThemedText>
    </ParallaxScrollView>
  );
}
