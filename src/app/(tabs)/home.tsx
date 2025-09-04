import { Text, View } from 'react-native';

import { HelloWave } from '@/components/HelloWave';
import { IconSymbol } from '@/components/ui/IconSymbol';
import ParallaxScrollView from '@/components/ui/ParallaxScrollView';
import { TextCustom } from '@/components/ui/TextCustom';

export default function HomeScreen() {
  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <IconSymbol
          size={180}
          color="#0a7ea4"
          name="shippingbox.fill"
          style={{ position: 'absolute', bottom: 0, left: 0 }}
        />
      }
    >
      <View className="flex-row items-center gap-2">
        <TextCustom type="title">Hello TextCustom Title G g!</TextCustom>
        <HelloWave />
      </View>
      <View>
        <TextCustom type="subtitle">
          Some ordinary TextCustom, type - Subtitle
        </TextCustom>
        <TextCustom>Some ordinary TextCustom, type - default</TextCustom>
        <TextCustom className="font-bold">
          Some ordinary TextCustom, type - bold
        </TextCustom>
        <TextCustom type="bold">
          Some ordinary TextCustom, type - bold
        </TextCustom>
        <TextCustom type="link">
          Some ordinary TextCustom, type - link
        </TextCustom>
        <TextCustom type="italic">
          Some ordinary TextCustom, type - italic
        </TextCustom>

        <Text>
          Some ordinary Text from 'react-native', no style. DO NOT USE
        </Text>
        <TextCustom>{'\n'}</TextCustom>
        <View>
          <TextCustom>
            Some ordinary TextCustom default,{' '}
            <TextCustom type="bold">bold</TextCustom>,{' '}
            <TextCustom type="link">link</TextCustom>,{' '}
            <TextCustom className="text-intent-warning">
              text-intent-warning
            </TextCustom>
            <TextCustom>, use this styled textcustom to style text</TextCustom>
          </TextCustom>
        </View>
        <TextCustom>{'\n'}</TextCustom>
        <View>
          <TextCustom>
            Some ordinary TextCustom, default,{' '}
            <TextCustom className="font-bold">bold</TextCustom>,{' '}
            <TextCustom className="underline">link</TextCustom>,{' '}
            <TextCustom className="text-intent-warning">
              text-intent-warning
            </TextCustom>
            <TextCustom>, use this styled textcustom to style text</TextCustom>
          </TextCustom>
        </View>
      </View>
    </ParallaxScrollView>
  );
}
