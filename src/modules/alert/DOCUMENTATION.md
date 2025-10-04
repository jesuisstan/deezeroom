# AlertModule Documentation

Cross-platform module for displaying alerts in the application.

## Features

- **Android/iOS**: Uses native `Alert` from React Native
- **Web**: Shows custom modal dialog with RippleButton components
- **Unified API**: Single interface for all platforms
- **Responsive Design**: Adapts button layout based on count (>2 buttons = stacked layout)

## API Interface

```
┌─────────────────────────────────────────────────────────────┐
│                    Static API: Alert                        │
├─────────────────────────────────────────────────────────────┤
│  Alert.show()     - Show custom alert                       │
│  Alert.hide()     - Hide alert                             │
│  Alert.alert()    - Simple alert with one button           │
│  Alert.confirm()  - Confirmation (Cancel/Confirm)          │
│  Alert.delete()   - Deletion (Cancel/Delete - red)         │
└─────────────────────────────────────────────────────────────┘
```

## Usage

### Basic Usage

```tsx
import { Alert } from '@/modules/alert';

// Simple alert
Alert.alert('Title', 'Description');

// Alert with buttons
Alert.show({
  title: 'Confirmation',
  message: 'Are you sure?',
  buttons: [
    { text: 'Cancel', onPress: () => console.log('Cancelled') },
    { text: 'OK', onPress: () => console.log('Confirmed') }
  ]
});
```

### Convenient Methods

```tsx
// Confirmation
Alert.confirm(
  'Delete item?',
  'This action cannot be undone',
  () => console.log('Confirmed'),
  () => console.log('Cancelled')
);

// Deletion with red destructive button
Alert.delete('Delete item?', 'This action cannot be undone', () =>
  console.log('Deleted')
);
```

### Advanced Configuration

```tsx
Alert.show({
  title: 'Settings',
  message: 'Choose an action',
  buttons: [
    {
      text: 'Cancel',
      style: 'cancel',
      onPress: () => console.log('Cancelled')
    },
    {
      text: 'Save',
      style: 'default',
      onPress: () => console.log('Saved')
    },
    {
      text: 'Delete',
      style: 'destructive',
      onPress: () => console.log('Deleted')
    }
  ]
});
```

## Button Types & Styling

### Button Styles

- `default` - Primary button (uses theme primary color)
- `cancel` - Outline button (gray border, transparent background)
- `destructive` - Primary button (red error color)

### RippleButton Variants Used

- **Primary variant**: Used for `default` and `destructive` buttons
- **Outline variant**: Used for `cancel` buttons
- **Custom colors**: Each style gets appropriate theme colors

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     AlertModule.tsx                         │
├─────────────────────────────────────────────────────────────┤
│  Platform Check:                                           │
│  ┌─────────────────┐    ┌─────────────────────────────────┐ │
│  │    Mobile       │    │           Web                    │ │
│  │  (Android/iOS)  │    │                                 │ │
│  │                 │    │                                 │ │
│  │  Native Alert   │    │   Custom Modal Dialog           │ │
│  │  (React Native) │    │   - RippleButton components     │ │
│  │                 │    │   - Fixed positioning            │ │
│  │                 │    │   - Theme support                │ │
│  │                 │    │   - Responsive layout            │ │
│  └─────────────────┘    └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Module State

```
┌─────────────────────────────────────────────────────────────┐
│                   AlertState                                │
├─────────────────────────────────────────────────────────────┤
│  title?: string     - Alert title                          │
│  message?: string   - Alert message                        │
│  buttons?: AlertButton[] - Array of buttons with handlers  │
│  visible: boolean    - Modal visibility (web only)         │
└─────────────────────────────────────────────────────────────┘
```

## Button Configuration Helper

```tsx
// Web-specific button mapping to RippleButton
const getButtonProps = (button: AlertButton) => {
  switch (button.style) {
    case 'destructive':
      return {
        variant: 'primary',
        color: colors['intent-error'], // Red background
        title: button.text
      };
    case 'cancel':
      return {
        variant: 'outline', // Gray border
        title: button.text
      };
    default:
      return {
        variant: 'primary',
        color: colors.primary, // Theme primary
        title: button.text
      };
  }
};
```

## Platform Synchronization

### Mobile (Android/iOS)

- Uses system `Alert.alert()` - state managed automatically
- Native button styles preserved
- Auto-hides modal state after native alert shown

### Web

- Custom modal with `position: 'fixed'` overlay
- RippleButton components with theme-based colors
- Responsive layout: 2 buttons side-by-side, >2 buttons stacked
- Click-outside-to-close functionality

### Singleton Pattern

- Single access point via `alertRef` for static API
- Shared state across entire application
- Consistent behavior regardless of component tree

## Integration

1. **Add AlertModule to app root:**

```tsx
import { AlertModule } from '@/modules/alert';

export default function App() {
  return (
    <>
      <AlertModule />
      {/* Your app */}
    </>
  );
}
```

2. **Use anywhere in your app:**

```tsx
// In any component
import { Alert } from '@/modules/alert';

const handleAction = () => {
  Alert.confirm('Confirm Action', 'Proceed?', onConfirm);
};
```

## Visual Design - Web Modal

- **Overlay**: Semi-transparent black (`rgba(0, 0, 0, 0.5)`)
- **Modal**: Rounded corners (12px), centered, 300-400px width
- **Typography**: Theme-aware text colors
- **Buttons**: RippleButton with appropriate variants
- **Shadows**: Drop shadow for depth
- **Z-Index**: 9999 for overlay priority

## Theme Integration

The module automatically adapts to your app's theme:

- Dark/Light colors via `useTheme()`
- Proper contrast for accessibility
- Consistent with app-wide design system
- RippleButton inherits theme colors

---

**Note**: This module provides a consistent, accessible, and beautifully animated alert system across all platforms while maintaining platform-native behavior where appropriate.
