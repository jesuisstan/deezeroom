import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  View
} from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { TextCustom } from '@/components/ui/TextCustom';
import { Notifier } from '@/modules/notifier';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';

interface ImageUploadProps {
  currentImageUrl?: string;
  onImageUploaded: (imageUrl: string) => void;
  placeholder?: string;
  size?: 'sm' | 'md' | 'lg';
  shape?: 'circle' | 'square';
  disabled?: boolean;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  currentImageUrl,
  onImageUploaded,
  placeholder = 'Add Image',
  size = 'md',
  shape = 'square',
  disabled = false
}) => {
  const { theme } = useTheme();
  const [isUploading, setIsUploading] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return { width: 60, height: 60 };
      case 'lg':
        return { width: 120, height: 120 };
      default:
        return { width: 80, height: 80 };
    }
  };

  const getBorderRadius = () => {
    return shape === 'circle' ? 999 : 8;
  };

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please grant camera roll permissions to upload images.'
      );
      return false;
    }
    return true;
  };

  const pickImage = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: shape === 'circle' ? [1, 1] : [4, 3],
        quality: 0.8,
        base64: false
      });

      if (!result.canceled && result.assets[0]) {
        await uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Notifier.shoot({
        type: 'error',
        title: 'Error',
        message: 'Failed to pick image'
      });
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please grant camera permissions to take photos.'
      );
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: shape === 'circle' ? [1, 1] : [4, 3],
        quality: 0.8,
        base64: false
      });

      if (!result.canceled && result.assets[0]) {
        await uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Notifier.shoot({
        type: 'error',
        title: 'Error',
        message: 'Failed to take photo'
      });
    }
  };

  const uploadImage = async (imageUri: string) => {
    setIsUploading(true);
    try {
      // This will be implemented in the parent component
      // For now, we'll just call the callback with the local URI
      onImageUploaded(imageUri);
      setShowOptions(false);
    } catch (error) {
      console.error('Error uploading image:', error);
      Notifier.shoot({
        type: 'error',
        title: 'Error',
        message: 'Failed to upload image'
      });
    } finally {
      setIsUploading(false);
    }
  };

  const showImageOptions = () => {
    if (disabled) return;
    setShowOptions(true);
  };

  const removeImage = () => {
    Alert.alert('Remove Image', 'Are you sure you want to remove this image?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          onImageUploaded('');
          setShowOptions(false);
        }
      }
    ]);
  };

  const sizeStyles = getSizeStyles();
  const borderRadius = getBorderRadius();

  return (
    <>
      <Pressable
        onPress={showImageOptions}
        disabled={disabled}
        style={[
          {
            width: sizeStyles.width,
            height: sizeStyles.height,
            borderRadius,
            backgroundColor:
              theme === 'dark'
                ? themeColors.dark['bg-secondary']
                : themeColors.light['bg-secondary'],
            borderWidth: 2,
            borderColor:
              theme === 'dark'
                ? themeColors.dark['border']
                : themeColors.light['border'],
            borderStyle: 'dashed',
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'hidden'
          },
          disabled && { opacity: 0.5 }
        ]}
      >
        {isUploading ? (
          <ActivityIndicator
            size="small"
            color={themeColors[theme]['primary']}
          />
        ) : currentImageUrl ? (
          <Image
            source={{ uri: currentImageUrl }}
            style={{
              width: '100%',
              height: '100%',
              borderRadius: shape === 'circle' ? borderRadius : 0
            }}
            resizeMode="cover"
          />
        ) : (
          <View className="items-center">
            <MaterialCommunityIcons
              name="camera-plus"
              size={size === 'sm' ? 20 : size === 'lg' ? 32 : 24}
              color={themeColors[theme]['text-secondary']}
            />
            <TextCustom
              size="xs"
              className="mt-1 text-center opacity-70"
              style={{ color: themeColors[theme]['text-secondary'] }}
            >
              {placeholder}
            </TextCustom>
          </View>
        )}
      </Pressable>

      {/* Options Modal */}
      <Modal
        visible={showOptions}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOptions(false)}
      >
        <View
          className="flex-1 items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <View
            className="mx-4 rounded-lg p-6"
            style={{
              backgroundColor:
                theme === 'dark'
                  ? themeColors.dark['bg-secondary']
                  : themeColors.light['bg-secondary'],
              minWidth: 280
            }}
          >
            <TextCustom type="subtitle" className="mb-4 text-center">
              Choose Image Source
            </TextCustom>

            <View className="gap-3">
              <Pressable
                onPress={pickImage}
                className="flex-row items-center gap-3 rounded-lg p-3"
                style={{
                  backgroundColor:
                    theme === 'dark'
                      ? themeColors.dark['bg-main']
                      : themeColors.light['bg-main']
                }}
              >
                <MaterialCommunityIcons
                  name="image-multiple"
                  size={24}
                  color={themeColors[theme]['primary']}
                />
                <TextCustom>Choose from Gallery</TextCustom>
              </Pressable>

              <Pressable
                onPress={takePhoto}
                className="flex-row items-center gap-3 rounded-lg p-3"
                style={{
                  backgroundColor:
                    theme === 'dark'
                      ? themeColors.dark['bg-main']
                      : themeColors.light['bg-main']
                }}
              >
                <MaterialCommunityIcons
                  name="camera"
                  size={24}
                  color={themeColors[theme]['primary']}
                />
                <TextCustom>Take Photo</TextCustom>
              </Pressable>

              {currentImageUrl && (
                <Pressable
                  onPress={removeImage}
                  className="flex-row items-center gap-3 rounded-lg p-3"
                  style={{
                    backgroundColor:
                      theme === 'dark'
                        ? themeColors.dark['bg-main']
                        : themeColors.light['bg-main']
                  }}
                >
                  <MaterialCommunityIcons
                    name="delete"
                    size={24}
                    color={themeColors[theme]['intent-error']}
                  />
                  <TextCustom
                    style={{ color: themeColors[theme]['intent-error'] }}
                  >
                    Remove Image
                  </TextCustom>
                </Pressable>
              )}

              <Pressable
                onPress={() => setShowOptions(false)}
                className="mt-2 flex-row items-center gap-3 rounded-lg p-3"
                style={{
                  backgroundColor:
                    theme === 'dark'
                      ? themeColors.dark['bg-main']
                      : themeColors.light['bg-main']
                }}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={24}
                  color={themeColors[theme]['text-secondary']}
                />
                <TextCustom
                  style={{ color: themeColors[theme]['text-secondary'] }}
                >
                  Cancel
                </TextCustom>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default ImageUpload;
