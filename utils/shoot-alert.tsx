import { Alert, Platform } from 'react-native';

const shootAlert = (headerText: string, messageText: string) => {
  Platform.OS === 'web'
    ? alert(messageText)
    : Alert.alert(headerText, messageText);
};

export default shootAlert;
