import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes
} from 'firebase/storage';

import { Logger } from '@/components/modules/logger';
import { auth, storage } from '@/utils/firebase/firebase-init';

/**
 * Firebase Storage Service
 * @description Service for uploading, deleting and getting images from Firebase Storage
 */
export class StorageService {
  /**
   * Upload image to Firebase Storage
   * @param fileUri - The URI of the file to upload
   * @param path - The path to upload the file to
   * @param fileName - The name of the file to upload
   * @returns The URL of the uploaded file
   */
  static async uploadImage(
    fileUri: string,
    path: string,
    fileName?: string
  ): Promise<string> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Convert file URI to blob
      const response = await fetch(fileUri);
      const blob = await response.blob();

      // Generate unique filename if not provided
      const finalFileName =
        fileName ||
        `${Date.now()}_${Math.random().toString(36).substring(2)}.jpg`;

      // Create storage reference
      const storageRef = ref(storage, `${path}/${finalFileName}`);

      Logger.info(
        'Storage reference path:',
        `${path}/${finalFileName}`,
        '🔥 Firebase Storage Service'
      );

      // Upload file
      const snapshot = await uploadBytes(storageRef, blob);

      // Get download URL
      const downloadURL = await getDownloadURL(snapshot.ref);

      return downloadURL;
    } catch (error: any) {
      Logger.error(
        'Error uploading image:',
        error,
        '🔥 Firebase Storage Service'
      );
      throw new Error('Failed to upload image');
    }
  }

  /**
   * Upload playlist cover image
   * @param playlistId - The ID of the playlist
   * @param fileUri - The URI of the file to upload
   * @returns The URL of the uploaded file
   */
  static async uploadPlaylistCover(
    playlistId: string,
    fileUri: string
  ): Promise<string> {
    return this.uploadImage(fileUri, `playlists/${playlistId}`, 'cover.jpg');
  }

  static async uploadEventCover(
    eventId: string,
    fileUri: string
  ): Promise<string> {
    return this.uploadImage(fileUri, `events/${eventId}`, 'cover.jpg');
  }

  /**
   * Upload user avatar
   * @param userId - The ID of the user
   * @param fileUri - The URI of the file to upload
   * @returns The URL of the uploaded file
   */
  static async uploadUserAvatar(
    userId: string,
    fileUri: string
  ): Promise<string> {
    return this.uploadImage(fileUri, `avatars/${userId}`, 'avatar.jpg');
  }

  /**
   * Delete image from Firebase Storage
   * @param imageUrl - The URL of the image to delete
   */
  static async deleteImage(imageUrl: string): Promise<void> {
    try {
      // Check authentication
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('User not authenticated');
      }

      // Extract path from URL
      const url = new URL(imageUrl);

      // Trying different ways to extract the path
      let imagePath: string | null = null;

      // Method 1: standard Firebase Storage URL
      const pathMatch = url.pathname.match(/\/o\/(.+)\?/);
      if (pathMatch) {
        imagePath = decodeURIComponent(pathMatch[1]);
        Logger.info(
          'Method 1 - Extracted path:',
          imagePath,
          '🔥 Firebase Storage Service'
        );
      } else {
        // Method 2: alternative format
        const altMatch = url.pathname.match(/\/o%2F(.+)/);
        if (altMatch) {
          imagePath = decodeURIComponent(altMatch[1]);
          Logger.info(
            'Method 2 - Extracted path:',
            imagePath,
            '🔥 Firebase Storage Service'
          );
        } else {
          // Method 3: simple extraction from pathname
          const simpleMatch = url.pathname.split('/o/')[1];
          if (simpleMatch) {
            imagePath = decodeURIComponent(simpleMatch.split('?')[0]);
            Logger.info(
              'Method 3 - Extracted path:',
              imagePath,
              '🔥 Firebase Storage Service'
            );
          }
        }
      }

      if (!imagePath) {
        Logger.error(
          'Could not extract path from URL:',
          imageUrl,
          '🔥 Firebase Storage Service'
        );
        throw new Error('Invalid image URL format - cannot extract path');
      }

      const imageRef = ref(storage, imagePath);

      await deleteObject(imageRef);
      Logger.info(
        'Image deleted successfully from Storage',
        '🔥 Firebase Storage Service'
      );
    } catch (error: any) {
      Logger.error(
        'Error deleting image:',
        error,
        '🔥 Firebase Storage Service'
      );
      throw new Error('Failed to delete image');
    }
  }

  /**
   * Get file size from URI
   * @param fileUri - The URI of the file to get the size of
   * @returns The size of the file
   */
  static async getFileSize(fileUri: string): Promise<number> {
    try {
      const response = await fetch(fileUri);
      const blob = await response.blob();
      return blob.size;
    } catch (error: any) {
      Logger.error(
        'Error getting file size:',
        error,
        '🔥 Firebase Storage Service'
      );
      return 0;
    }
  }

  /**
   * Validate image file
   * @param fileUri - The URI of the file to validate
   * @param maxSizeMB - The maximum size of the file in MB
   * @returns The result of the validation
   */
  static validateImage(
    fileUri: string,
    maxSizeMB: number = 10
  ): Promise<boolean> {
    return new Promise(async (resolve) => {
      try {
        const size = await this.getFileSize(fileUri);
        const sizeMB = size / (1024 * 1024);

        if (sizeMB > maxSizeMB) {
          resolve(false);
          return;
        }

        // Check if it's an image by trying to load it
        const response = await fetch(fileUri);
        const blob = await response.blob();

        resolve(blob.type.startsWith('image/'));
      } catch (error: any) {
        Logger.error(
          'Error validating image:',
          error,
          '🔥 Firebase Storage Service'
        );
        resolve(false);
      }
    });
  }
}
