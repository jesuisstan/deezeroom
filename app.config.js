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
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#ffffff'
      }
    },
    web: {
      bundler: 'metro',
      output: 'server',
      favicon: './assets/images/favicon.png'
    },
    plugins: [
      'expo-font',
      [
        'expo-router',
        {
          origin:
            process.env.NODE_ENV === 'development'
              ? 'http://localhost:8081'
              : 'https://hosting-example.expo.app'
        }
      ],
      [
        'expo-splash-screen',
        {
          image: './assets/images/splash-icon.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#ffffff'
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
