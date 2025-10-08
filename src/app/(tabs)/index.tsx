import { ScrollView, View } from 'react-native';

import { useQuery } from 'urql';

import RippleButton from '@/components/ui/buttons/RippleButton';
import Divider from '@/components/ui/Divider';
import { TextCustom } from '@/components/ui/TextCustom';
import { GetRandomJoke } from '@/graphql/queries';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';

const HomeScreen = () => {
  const { theme } = useTheme();

  const [{ data, fetching, error }, refetch] = useQuery({
    query: GetRandomJoke
  });

  return (
    <ScrollView
      showsVerticalScrollIndicator={true}
      contentContainerStyle={{
        flexGrow: 1,
        paddingBottom: 16,
        paddingHorizontal: 16,
        paddingTop: 16,
        gap: 16,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        backgroundColor:
          theme === 'dark'
            ? themeColors.dark['bg-main']
            : themeColors.light['bg-main'],
        flexDirection: 'column',
        alignSelf: 'center'
      }}
    >
      <View className="w-full flex-1 gap-4">
        <TextCustom type="subtitle" className="text-center">
          DEEZEROOM APP with GraphQL
        </TextCustom>
        <Divider />
        <View className="w-full flex-col gap-2 rounded-xl border border-border bg-bg-secondary p-4 text-center">
          <TextCustom type="semibold" className="text-center">
            {data?.randomJoke?.question}
          </TextCustom>
          <TextCustom className="text-center">
            {data?.randomJoke?.answer}
          </TextCustom>
          <RippleButton
            title="Get another joke"
            size="sm"
            onPress={() => refetch({ requestPolicy: 'network-only' })}
            loading={fetching}
            fullWidth={true}
          />
          {error && (
            <TextCustom color={themeColors.dark['intent-error']}>
              Error: {error.message}
            </TextCustom>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

export default HomeScreen;
