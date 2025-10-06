# Logger Module

A simple and efficient logging module for the DEEZERoom application that replaces primitive `console.log` and `console.error` with structured logging including platform, device, and context information.

## Features

- **Structured logging** with platform, device, and app version information
- **Log levels**: debug, info, warn, error with emoji indicators
- **Log source** (component/module where the log came from)
- **Ready for server logging** (TODO for future implementation)
- **Specialized methods** for API and navigation
- **TypeScript support**
- **No circular dependencies** - autonomous module

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

// Navigation
Logger.navigation.back('RouterBackButton');
Logger.navigation.to('/profile', 'MenuButton');
```

## User context

For user-related logs, pass user information explicitly in the data parameter:

```tsx
// In UserProvider or components with user context
Logger.info('User logged in', { userId: currentUser.uid }, '👤 UserProvider');
Logger.info('User action', { userId: user.uid, action: 'play_song' }, 'Player');
Logger.info('Profile updated', { userId: user.uid, changes: data }, 'Profile');
```

## Log format

### Timestamp format

Timestamps are formatted with timezone information and time before date for better readability:

- **Old format**: `2024-01-15T10:30:00.000Z` (ISO string)
- **New format**: `11:30:00 GMT+1 01/15/2024` (time before date with timezone)

The timestamp automatically adjusts to the user's local timezone and uses 24-hour format.

### Log format with emojis

Logs now use emojis instead of text levels for better visual identification:

- **Debug**: `🐛` - Bug/debug information
- **Info**: `ℹ️` - General information
- **Warn**: `⚠️` - Warnings
- **Error**: `❌` - Errors

**Log block order:**

1. **Emoji** - Log level indicator
2. **App version** - Application version (without "v" prefix)
3. **Timestamp** - Time before date with timezone
4. **Platform** - Operating system (android/ios)
5. **Device** - Device name (if available)
6. **Source** - Component/module name (if specified)
7. **Message** - Log message content

Example log output:

```
ℹ️ [1.0.0] [11:30:00 GMT+1 01/15/2024] [android] [SM-S908B] [👤 UserProvider] User logged in
```

### Log structure

Each log contains:

```json
{
  "level": "info",
  "message": "User logged in",
  "data": { "userId": "user123" },
  "context": {
    "platform": "android",
    "deviceName": "SM-S908B",
    "appVersion": "1.0.0",
    "buildVersion": "1",
    "timestamp": "11:30:00 GMT+1 01/15/2024"
  },
  "source": "👤 UserProvider"
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
  Logger.info('Playback started', { songId: currentSong.id }, 'Player');
};

const handleUserAction = (action: string, data: any) => {
  Logger.info(
    'User action',
    { userId: user.uid, action, data },
    'UserInterface'
  );
};
```

### In error handlers

```tsx
const handleError = (error: Error) => {
  Logger.error('Unexpected error', error, 'ErrorHandler');
};
```

## Advantages of simplified approach

The Logger module follows the KISS principle (Keep It Simple, Stupid):

- ✅ **No circular dependencies** - Logger is autonomous and doesn't depend on other modules
- ✅ **Flexible** - can write any custom messages without being limited to predefined methods
- ✅ **Consistent** - all logs use the same base methods (info, error, warn, debug)
- ✅ **Easy to test** - fewer methods to cover in tests
- ✅ **Maintainable** - less code to maintain and debug
- ✅ **Explicit** - user context is passed explicitly when needed, making logs more transparent

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
