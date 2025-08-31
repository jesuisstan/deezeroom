import { ALERT_TYPE, Dialog, Toast } from 'react-native-alert-notification';

type AlertType = 'success' | 'error' | 'warning' | 'info';

const shootAlert = (
  headerText: string,
  messageText: string,
  type: AlertType = 'info',
  useToast: boolean = false
) => {
  const alertType =
    type === 'success'
      ? ALERT_TYPE.SUCCESS
      : type === 'error'
        ? ALERT_TYPE.DANGER
        : type === 'warning'
          ? ALERT_TYPE.WARNING
          : ALERT_TYPE.SUCCESS;

  if (useToast) {
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
