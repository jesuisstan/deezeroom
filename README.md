Get started with [EAS Hosting](https://docs.expo.dev/eas/hosting/introduction/).

## Project Scripts

`package.json` includes several useful scripts for development, verification, cleaning, and building:

### 🛠 Development

`npm run start` → Start Expo development server (default).

`npm run start:clear` → Start Expo server with cache cleared.

`npm run start:tunnel` → Start server using a tunnel (for external devices).

`npm run start:tunnel:clear` → Start tunnel with cache cleared.

`npm run android` → Launch app on an Android device/emulator.

`npm run ios` → Launch app on an iOS simulator/device.

`npm run web` → Launch app in a web browser.

### ✅ Quality & Verification

`npm run lint` → Run ESLint to check code style and potential issues.

`npm run lint:fix` → Run ESLint with automatic fixes for code style issues.

`npm run format` → Format all files with Prettier (enforces LF line endings).

`npm run format:check` → Check if all files are properly formatted without making changes.

`npm run fix:line-endings` → Convert all files to use LF line endings (Unix-style).

`npm run verify:deps` → Verify that installed dependencies match Expo SDK requirements.

`npm run verify:lockfile` → Dry-run installation to ensure `package-lock.json` is valid and consistent.

### 🧹 Cleaning & Reinstall

`npm run clean` → Remove all generated folders (`node_modules`, lockfile, Expo, Android/iOS/web builds).

`npm run c:i` → Clean the project and reinstall dependencies from scratch.

### 📦 Building

`npm run build:dev:android` → Create a development build for Android in the cloud.

`npm run build:dev:ios` → Create a development build for iOS in the cloud.

`npm run build:dev:web` → Create a development build for Web in the cloud.

`npm run build:prod:android` → Create a production build for Android in the cloud.

## Usefull commands

### Ensure installation

`"preinstall":`

```bash
npm install -g eas-cli && npm install --global @expo/ngrok@^4.1.0
```

### Managing Environment Variables

Check cloud envirement:

```bash
eas env:list
```

Push secret file (like `google-services.json`) to cloud builder:

```bash
npx eas env:create --scope project --name GOOGLE_SERVICES_JSON --type file --value ./credentials/android/google-services.json
```

## 🏗 Application Architecture

### Navigation Flow

The application uses Expo Router with **Stack.Protected** screens for route-based authentication:

```mermaid
graph TD
    A["App Start"] --> B["RootLayout.tsx"]
    B --> C["DeezeroomApp.tsx"]
    C --> D["Stack Navigator<br/>with Protected Screens"]
    D --> E["UserProvider<br/>(Auth State)"]

    E --> F{"User State Check"}

    F -->|"Not Authenticated"| G["Stack.Protected guard={!isAuthenticated}"]
    F -->|"Authenticated + Email Verified"| H["Stack.Protected guard={isAuthenticated && isEmailVerified}"]
    F -->|"Authenticated + Email NOT Verified"| I["Stack.Protected guard={isAuthenticated && !isEmailVerified}"]

    G --> G1["auth/index.tsx<br/>(WelcomeScreen)"]
    G1 --> G2["Continue with Email"]
    G2 --> G3["auth/login.tsx<br/>(LoginScreen)"]
    G3 --> G4["Link: Create account"]
    G4 --> G5["auth/register.tsx<br/>(RegisterScreen)"]
    G3 --> G6["Link: Forgot password"]
    G6 --> G7["auth/reset-password.tsx<br/>(ResetPasswordScreen)"]
    G3 --> G8["Back Button"]
    G5 --> G8
    G7 --> G8

    G1 --> G9["Google Sign In"]
    G9 --> G10["Firebase Auth"]
    G10 --> E

    H --> H1["(tabs)/_layout.tsx<br/>(Main App)"]
    H1 --> H2["(tabs)/index.tsx"]
    H1 --> H3["(tabs)/home.tsx"]
    H1 --> H4["(tabs)/explore.tsx"]
    H1 --> H5["Profile Button"]
    H5 --> H6["profile/_layout.tsx"]
    H6 --> H7["profile/index.tsx"]
    H6 --> H8["profile/settings.tsx"]
    H7 --> H9["Sign Out Button"]
    H9 --> H10["UserProvider.signOut()"]
    H10 --> E

    I --> I1["verify-email.tsx<br/>(EmailVerificationScreen)"]
    I1 --> I2["Resend verification"]
    I2 --> I3["Firebase sendEmailVerification"]
    I1 --> I4["I have verified"]
    I4 --> I5["Firebase reload + check"]
    I5 --> E
    I1 --> I6["Back Button"]
    I6 --> I7["Sign out + redirect to auth"]
    I7 --> E

    style D fill:#ffeaa7
    style G1 fill:#fff3e0
    style G3 fill:#fff3e0
    style G5 fill:#fff3e0
    style G7 fill:#fff3e0
    style H1 fill:#e8f5e8
    style H7 fill:#e8f5e8
    style I1 fill:#e1f5fe
    style E fill:#fab1a0
```

### Key Components

- **DeezeroomApp**: Main navigation component with Stack.Protected screens
- **UserProvider**: Manages Firebase authentication state and user profile data
- **Stack Navigator**: Handles all screen transitions with route-based protection
- **WelcomeScreen**: Entry screen with Google Sign-In and "Continue with email"
- **LoginScreen**: Email/password login form (`/auth/login`)
- **RegisterScreen**: Email/password registration form (`/auth/register`)
- **ResetPasswordScreen**: Password reset form (`/auth/reset-password`)
- **VerifyEmailScreen**: Email verification screen (`/verify-email`)

### Authentication States & Protected Routes

1. **Loading**: Shows `ActivityIndicatorScreen` while checking auth state
2. **Unauthenticated**: Protected by `guard={!isAuthenticated}`
   - `/auth/*` - All authentication screens
3. **Authenticated + Email Verified**: Protected by `guard={isAuthenticated && isEmailVerified}`
   - `/(tabs)/*` - Main app with tab navigation
   - `/profile/*` - Profile screens with stack navigation
4. **Authenticated + Email NOT Verified**: Protected by `guard={isAuthenticated && !isEmailVerified}`
   - `/verify-email` - Email verification screen

### Navigation Rules

- **Stack.Protected** automatically handles route access based on authentication state
- **No manual redirects** - routes are protected at the component level
- **Email verification required** - users must verify email before accessing main app
- **Type-safe routing** - All navigation through Expo Router with TypeScript support
- **Fallback handling** - `+not-found` screen for invalid routes

### New Features

- **Password Reset**: Complete reset password flow with email verification
- **Email Verification**: Mandatory email verification before app access
- **Profile Settings**: Dedicated settings screen with stack navigation
- **Help System**: SwipeModal and SwipeDrawer components for help content
