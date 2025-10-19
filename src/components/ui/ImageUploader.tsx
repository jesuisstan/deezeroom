import { FC, useState, forwardRef, useImperativeHandle } from 'react';
import { ActivityIndicator, Image, Pressable, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import LineButton from '@/components/ui/buttons/LineButton';
import Divider from '@/components/ui/Divider';
import SwipeModal from '@/components/ui/SwipeModal';
import { TextCustom } from '@/components/ui/TextCustom';
import { Alert } from '@/modules/alert';
import { Logger } from '@/modules/logger';
import { Notifier } from '@/modules/notifier';
import { useTheme } from '@/providers/ThemeProvider';
import { themeColors } from '@/style/color-theme';

interface ImageUploaderProps {
  currentImageUrl?: string;
  onImageUploaded: (imageUrl: string) => void;
  placeholder?: string;
  size?: 'sm' | 'md' | 'lg';
  shape?: 'circle' | 'square';
  disabled?: boolean;
  onUploadStart?: () => void; // Callback when upload starts
  onUploadEnd?: () => void; // Callback when upload ends
}

export type ImageUploaderHandle = {
  open: () => void;
  remove: () => void;
};

const ImageUploader = forwardRef<ImageUploaderHandle, ImageUploaderProps>(
  ({
    currentImageUrl,
    onImageUploaded,
    placeholder = 'Add Picture',
    size = 'md',
    shape = 'square',
    disabled = false,
    onUploadStart,
    onUploadEnd
  }, ref) => {
    const { theme } = useTheme();
    const [isUploading, setIsUploading] = useState(false);
    const [showOptions, setShowOptions] = useState(false);

    useImperativeHandle(ref, () => ({
      open: () => setShowOptions(true),
      remove: () => {
        if (currentImageUrl) {
          onImageUploaded('');
          setShowOptions(false);
        }
      }
    }), [currentImageUrl, onImageUploaded]);

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
        Alert.error(
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
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: shape === 'circle' ? [1, 1] : [4, 3],
          quality: 0.5, // ~50% quality compression
          base64: false,
          presentationStyle:
            ImagePicker.UIImagePickerPresentationStyle.PAGE_SHEET,
          allowsMultipleSelection: false,
          exif: false
        });

        if (!result.canceled && result.assets[0]) {
          await uploadImage(result.assets[0].uri);
        }
      } catch (error) {
        Logger.error('Error picking image:', error, '🖼️ ImageUploader');
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
        Alert.error(
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
        Logger.error('Error taking photo:', error, '🖼️ ImageUploader');
        Notifier.shoot({
          type: 'error',
          title: 'Error',
          message: 'Failed to take photo'
        });
      }
    };

    const uploadImage = async (imageUri: string) => {
      setIsUploading(true);
      onUploadStart?.();

      try {
        // Just pass the local URI to the callback
        // Business logic for uploading is in the parent component
        onImageUploaded(imageUri);
        setShowOptions(false);
      } catch (error) {
        Logger.error(
          'Error handling image selection:',
          error,
          '🖼️ ImageUploader'
        );
        Notifier.shoot({
          type: 'error',
          title: 'Error',
          message: 'Failed to process image selection'
        });
      } finally {
        setIsUploading(false);
        onUploadEnd?.();
      }
    };

    const showImageOptions = () => {
      if (disabled) return;
      setShowOptions(true);
    };

    const removeImage = () => {
      Alert.delete(
        'Remove Image',
        'Are you sure you want to remove this image?',
        () => {
          onImageUploaded('');
          setShowOptions(false);
        }
      );
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
              backgroundColor: themeColors[theme]['bg-secondary'],
              borderWidth: 2,
              borderColor: themeColors[theme]['border'],
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
        <SwipeModal
          title="Choose Image Source"
          modalVisible={showOptions}
          setVisible={setShowOptions}
          onClose={() => setShowOptions(false)}
          size="half"
        >
          <View className="flex-1 gap-4 pb-4">
            <View className="gap-0">
              <LineButton onPress={pickImage} className="py-4">
                <View className="flex-row items-center gap-4 px-4">
                  <MaterialCommunityIcons
                    name="image-multiple"
                    size={24}
                    color={themeColors[theme]['primary']}
                  />
                  <TextCustom>Choose from Gallery</TextCustom>
                </View>
              </LineButton>

              <Divider inset />

              <LineButton onPress={takePhoto} className="py-4">
                <View className="flex-row items-center gap-4 px-4">
                  <MaterialCommunityIcons
                    name="camera"
                    size={24}
                    color={themeColors[theme]['primary']}
                  />
                  <TextCustom>Take Photo</TextCustom>
                </View>
              </LineButton>

              <Divider inset />

              {currentImageUrl && (
                <>
                  <LineButton onPress={removeImage} className="py-4">
                    <View className="flex-row items-center gap-4 px-4">
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
                    </View>
                  </LineButton>
                  <Divider inset />
                </>
              )}
            </View>
          </View>
        </SwipeModal>
      </>
    );
  }
);

export default ImageUploader;
