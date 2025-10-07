import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';

import RippleButton from '@/components/ui/buttons/RippleButton';
import { TextCustom } from '@/components/ui/TextCustom';
import { Notifier } from '@/modules/notifier';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';
import { DeezerService } from '@/utils/api/deezer-service';

const ApiTestComponent = () => {
  const { theme } = useTheme();
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);

  const runTest = async (
    testName: string,
    testFunction: () => Promise<any>
  ) => {
    setIsLoading(true);
    try {
      const result = await testFunction();
      setTestResults({ testName, result, success: true });
      Notifier.shoot({
        type: 'success',
        title: 'Test Passed',
        message: `${testName} completed successfully`
      });
    } catch (error) {
      setTestResults({
        testName,
        error: error instanceof Error ? error.message : String(error),
        success: false
      });
      Notifier.shoot({
        type: 'error',
        title: 'Test Failed',
        message: `${testName} failed: ${error instanceof Error ? error.message : String(error)}`
      });
    } finally {
      setIsLoading(false);
    }
  };

  const tests = [
    {
      name: 'Get Track (Daft Punk - Harder Better Faster Stronger)',
      function: () => DeezerService.getTrack('3135556')
    },
    {
      name: 'Get Artist (Daft Punk)',
      function: () => DeezerService.getArtist('27')
    },
    {
      name: 'Get Album (Discovery)',
      function: () => DeezerService.getAlbum('302127')
    },
    {
      name: 'Search Tracks (Daft Punk)',
      function: () => DeezerService.searchTracks('Daft Punk', 5)
    },
    {
      name: 'Search Artists (Radiohead)',
      function: () => DeezerService.searchArtists('Radiohead', 5)
    },
    {
      name: 'Search Playlists (Electronic)',
      function: () => DeezerService.searchPlaylists('Electronic', 5)
    }
  ];

  return (
    <ScrollView className="flex-1 p-4">
      <TextCustom type="title" className="mb-6 text-center">
        Deezer API Test Suite
      </TextCustom>

      <View className="gap-3">
        {tests.map((test, index) => (
          <RippleButton
            key={index}
            title={test.name}
            variant="outline"
            onPress={() => runTest(test.name, test.function)}
            disabled={isLoading}
            className="w-full"
            size="sm"
          />
        ))}
      </View>

      {isLoading && (
        <View className="mt-6 items-center">
          <ActivityIndicator
            size="large"
            color={themeColors[theme]['primary']}
          />
          <TextCustom className="mt-2">Running test...</TextCustom>
        </View>
      )}

      {testResults && (
        <View
          className="mt-6 rounded-xl border p-4"
          style={{
            backgroundColor: themeColors[theme]['bg-secondary'],
            borderColor: testResults.success
              ? themeColors[theme]['intent-success']
              : themeColors[theme]['intent-error']
          }}
        >
          <TextCustom
            type="subtitle"
            style={{
              color: testResults.success
                ? themeColors[theme]['intent-success']
                : themeColors[theme]['intent-error']
            }}
          >
            {testResults.testName}
          </TextCustom>

          {testResults.success ? (
            <TextCustom size="s" className="mt-2 opacity-70">
              Success! Check console for full response.
            </TextCustom>
          ) : (
            <TextCustom
              size="s"
              className="mt-2"
              style={{ color: themeColors[theme]['intent-error'] }}
            >
              Error: {testResults.error}
            </TextCustom>
          )}
        </View>
      )}

      <View
        className="mt-6 rounded-xl border p-4"
        style={{ backgroundColor: themeColors[theme]['bg-secondary'] }}
      >
        <TextCustom type="subtitle" className="mb-2">
          API Information
        </TextCustom>
        <TextCustom size="s" className="opacity-70">
          • GraphQL endpoint: /api/graphql
        </TextCustom>
        <TextCustom size="s" className="opacity-70">
          • Base URL:{' '}
          {process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8081/api'}
        </TextCustom>
        <TextCustom size="s" className="opacity-70">
          • Deezer API: https://api.deezer.com
        </TextCustom>
      </View>
    </ScrollView>
  );
};

export default ApiTestComponent;
