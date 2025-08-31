import { ALERT_TYPE, Dialog, Toast } from 'react-native-alert-notification';
import { Platform } from 'react-native';

type AlertType = 'success' | 'error' | 'warning';
type NotificationType = 'toast' | 'dialog';

const shootAlert = (
  notificationType: NotificationType,
  headerText: string,
  messageText: string,
  type: AlertType = 'success'
) => {
  // For web use native alert, because AlertNotificationRoot is not available
  if (Platform.OS === 'web') {
    if (notificationType === 'dialog') {
      alert(`${headerText}\n\n${messageText}`);
    } else {
      // For toast on web use console.log
      console.log(`${headerText}: ${messageText}`);
    }
    return;
  }

  const alertType =
    type === 'success'
      ? ALERT_TYPE.SUCCESS
      : type === 'error'
        ? ALERT_TYPE.DANGER
        : type === 'warning'
          ? ALERT_TYPE.WARNING
          : ALERT_TYPE.INFO;

  if (notificationType === 'toast') {
    Toast.show({
      type: alertType,
      title: headerText,
      textBody: messageText,
      autoClose: 3000
    });
  } else {
    Dialog.show({
      type: alertType,
      title: headerText,
      textBody: messageText,
      button: 'OK',
      autoClose: false
    });
  }
};

export default shootAlert;
