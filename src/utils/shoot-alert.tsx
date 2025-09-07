import { Platform } from 'react-native';

import { ALERT_TYPE, Dialog, Toast } from 'react-native-alert-notification';

type AlertType = 'success' | 'error' | 'warning';
type NotificationType = 'toast' | 'dialog';

/**
 * shootAlert is used to show alerts to the user in the app.
 * @param notificationType - type of notification (toast or dialog, default is toast)
 * @param headerText - text to show in the header of the alert
 * @param messageText - text to show in the body of the alert
 * @param type - type of alert (success, error, warning)
 * @param sticky - if true, the Toast alert will not close automatically
 * @returns void
 */
const shootAlert = (
  notificationType: NotificationType = 'toast',
  headerText: string,
  messageText: string,
  type: AlertType = 'success',
  sticky: boolean = false
) => {
  // For web use native alert, because AlertNotificationRoot is not available
  if (Platform.OS === 'web') {
    if (notificationType === 'dialog') {
      alert(`${headerText}\n\n${messageText}`);
    } else {
      // For toast on web use console.log
      console.log(`${headerText}: ${messageText}`); // todo add WEB modal/toast or smth like that
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
      autoClose: sticky ? false : 3000
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
