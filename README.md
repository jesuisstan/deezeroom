Get started with [EAS Hosting](https://docs.expo.dev/eas/hosting/introduction/).

## Usefull commands

### Creating builds

Create development build in cloud for Android:
```bash
npm run build:dev:android
```
or 
```bash
eas build --profile development --platform android
```

### Managing Environment Variables

Check cloud envirement:
```bash
eas env:list
```

Push secret file (like google-services.json) to cloud builder:
```bash
npx eas env:create --scope project --name GOOGLE_SERVICES_JSON --type file --value ./credentials/android/google-services.json
```
