# Logger Module

A logging module for the DEEZERoom application that replaces primitive `console.log` and `console.error` with structured logging including platform, device, and context information.

## Features

- **Structured logging** with platform, device, and app version information
- **Log levels**: debug, info, warn, error
- **Automatic user context** - user ID and display name from UserProvider
- **Log source** (component/module where the log came from)
- **Ready for server logging** (TODO for future implementation)
- **Specialized methods** for API, users, navigation
- **TypeScript support**

## Installation

The module is already integrated into the application via `_layout.tsx`:

```tsx
import LoggerModule from '@/modules/logger/LoggerModule';

// In app component
<LoggerModule />;
```

## Usage

### Basic usage

```tsx
import { Logger } from '@/modules/logger';

// Simple logs
Logger.info('App started');
Logger.debug('Debug information', { userId: '123' });
Logger.warn('Warning');
Logger.error('Error', { error: 'Network timeout' });

// With source specification
Logger.info('User clicked button', { buttonId: 'play' }, 'Player');
```

### Specialized methods

```tsx
// API logging
Logger.api.request('/api/songs', 'GET', { limit: 20 });
Logger.api.response('/api/songs', 200, { songs: [] });
Logger.api.error('/api/songs', { message: 'Server error' });

// User actions
Logger.user.login();
Logger.user.logout();
Logger.user.action('play_song', { songId: 'song456' });

// Navigation
Logger.navigation.navigate('Profile', { userId: '123' });
Logger.navigation.back('Home');
```

## Automatic user context

The Logger automatically includes user information from UserProvider in all logs:

```tsx
// When user is logged in, all logs automatically include:
// - userId: user.uid from Firebase Auth
// - userDisplayName: user.displayName or profile.displayName

Logger.info('User action', { buttonId: 'play' }, 'Player');
// Log will include: [User: user123 (John Doe)]

// Logger.user methods automatically add user context
Logger.user.login(); // userId is automatically added
Logger.user.action('play_song', { songId: '456' }); // userId is automatically added
```

## Log format

### Timestamp format

Timestamps are formatted with timezone information for better readability:

- **Old format**: `2024-01-15T10:30:00.000Z` (ISO string)
- **New format**: `01/15/2024, 10:30:00 GMT+2` (localized with timezone)

The timestamp automatically adjusts to the user's local timezone and uses 24-hour format.

### Log format with emojis

Logs now use emojis instead of text levels for better visual identification:

- **Debug**: `🐛` - Bug/debug information
- **Info**: `ℹ️` - General information
- **Warn**: `⚠️` - Warnings
- **Error**: `❌` - Errors

Example log output:

```
[ℹ️] [01/15/2024, 10:30:00 GMT+2] [App v1.0.0] [android] [SM-S908B] [RouterBackButton] [User: user123 (John Doe)] Navigate back from /auth/register
```

### Log structure

Each log contains:

```json
{
  "level": "info",
  "message": "User logged in",
  "data": { "userId": "123" },
  "context": {
    "platform": "ios",
    "deviceName": "iPhone 15",
    "appVersion": "1.0.0",
    "buildVersion": "1",
    "timestamp": "01/15/2024, 10:30:00 GMT+2",
    "userId": "user123",
    "userDisplayName": "John Doe"
  },
  "source": "Auth"
}
```

## Configuration

The module can be configured via props:

```tsx
<LoggerModule
  enableConsole={true} // Enable console logs
  logLevel="debug" // Minimum log level
/>
```

## Log levels

- `🐛 debug` - Debug information
- `ℹ️ info` - General information
- `⚠️ warn` - Warnings
- `❌ error` - Errors

## Usage examples in components

### In API requests

```tsx
const fetchSongs = async () => {
  try {
    Logger.api.request('/api/songs', 'GET');
    const response = await fetch('/api/songs');
    Logger.api.response('/api/songs', response.status);
    return await response.json();
  } catch (error) {
    Logger.api.error('/api/songs', error);
    throw error;
  }
};
```

### In event handlers

```tsx
const handlePlay = () => {
  Logger.user.action('play_song', { songId: currentSong.id });
  Logger.info('Playback started', { songId: currentSong.id }, 'Player');
};
```

### In error handlers

```tsx
const handleError = (error: Error) => {
  Logger.error('Unexpected error', error, 'ErrorHandler');
};
```

## Project requirements

According to the technical specification (IV.6), all actions in the mobile application must generate logs on the backend with information about:

- Platform (Android, iOS, etc.)
- Device (iPhone 6G, iPad Air, Samsung Edge, etc.)
- Application version

The Logger module automatically collects all this information and is ready for integration with the backend for log transmission.

## Future plans

When the backend API is ready, server logging can be easily added:

1. Add `enableRemoteLogging` and `remoteEndpoint` to props
2. Implement `sendToRemote` function
3. Add error handling for transmission
4. Configure log batching for optimization

For now, all logs are output to the console with full context information.
