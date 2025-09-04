module.exports = () => ({
  expo: {
    name: 'deezeroom',
    owner: 'jesuisstan',
    slug: 'deezeroom',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './src/assets/images/icon.png',
    scheme: 'deezeroom',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.krivtsoff.deezeroom'
      //googleServicesFile: './credentials/ios/GoogleService-Info.plist'
    },
    android: {
      package: 'com.krivtsoff.deezeroom',
      adaptiveIcon: {
        foregroundImage: './src/assets/images/adaptive-icon.png',
        backgroundColor: '#0f0d13'
      },
      googleServicesFile:
        process.env.GOOGLE_SERVICES_JSON ||
        './credentials/android/google-services.json'
    },
    web: {
      bundler: 'metro',
      output: 'server',
      favicon: './src/assets/images/favicon.png'
    },
    plugins: [
      [
        'expo-font',
        {
          fonts: [
            './src/assets/fonts/LeagueGothic/LeagueGothic-Regular-VariableFont_wdth.ttf',
            './src/assets/fonts/Inter/Inter-VariableFont_opsz,wght.ttf',
            './src/assets/fonts/Inter/Inter-Italic-VariableFont_opsz,wght.ttf'
          ]
        }
      ],
      [
        'expo-router',
        {
          origin:
            process.env.NODE_ENV === 'development'
              ? 'http://localhost:8081'
              : 'https://deezeroom.expo.app'
        }
      ],
      [
        'expo-splash-screen',
        {
          image: './src/assets/images/splash-icon.png',
          backgroundColor: '#0f0d13',
          imageWidth: 100
        }
      ],
      ['expo-audio'],
      [
        'expo-video',
        {
          supportsBackgroundPlayback: true,
          supportsPictureInPicture: true
        }
      ]
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      eas: {
        projectId: '18bc0796-aebe-48d1-b5c5-60f8c3ace65f'
      },
      router: {
        origin: false
      }
    }
  }
});
