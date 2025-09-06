import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import FontAwesome6 from '@expo/vector-icons/FontAwesome6';

import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/utils/color-theme';

const HelpModal = () => {
  const [modalVisible, setModalVisible] = useState(false);
  const { theme } = useTheme();

  return (
    <>
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(!modalVisible);
        }}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
            <Text style={styles.modalText}>Hello World!</Text>
            <Pressable
              style={[styles.button, styles.buttonClose]}
              onPress={() => setModalVisible(!modalVisible)}
            >
              <Text style={styles.textStyle}>Hide Modal</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Pressable
        onPress={() => setModalVisible(true)}
        className="items-center justify-center rounded-full bg-transparent"
      >
        <FontAwesome6
          name="circle-question"
          size={24}
          color={themeColors[theme]['text-main']}
        />
      </Pressable>
    </>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5
  },
  button: {
    borderRadius: 20,
    padding: 10,
    elevation: 2
  },
  buttonOpen: {
    backgroundColor: '#F194FF'
  },
  buttonClose: {
    backgroundColor: '#2196F3'
  },
  textStyle: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center'
  },
  modalText: {
    marginBottom: 15,
    textAlign: 'center'
  }
});

export default HelpModal;
