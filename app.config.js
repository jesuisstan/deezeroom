module.exports = () => ({
  expo: {
    name: 'deezeroom',
    owner: 'jesuisstan',
    slug: 'deezeroom',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'deezeroom',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    ios: {
      supportsTablet: true
      //googleServicesFile: './credentials/ios/GoogleService-Info.plist'
    },
    android: {
      package: 'com.krivtsoff.deezeroom',
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#0f0d13'
      },
      googleServicesFile:
        process.env.GOOGLE_SERVICES_JSON ||
        './credentials/android/google-services.json'
    },
    web: {
      bundler: 'metro',
      output: 'server',
      favicon: './assets/images/favicon.ico'
    },
    plugins: [
      [
        'expo-font',
        {
          fonts: [
            './assets/fonts/LeagueGothic-Regular.ttf',
            './assets/fonts/LeagueGothic_Italic-Regular.ttf'
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
          image: './assets/images/splash.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#0f0d13'
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
