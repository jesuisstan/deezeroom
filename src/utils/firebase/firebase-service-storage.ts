import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes
} from 'firebase/storage';

import { storage } from '@/utils/firebase/firebase-init';

export class StorageService {
  // Upload image to Firebase Storage
  static async uploadImage(
    fileUri: string,
    path: string,
    fileName?: string
  ): Promise<string> {
    try {
      // Convert file URI to blob
      const response = await fetch(fileUri);
      const blob = await response.blob();

      // Generate unique filename if not provided
      const finalFileName =
        fileName ||
        `${Date.now()}_${Math.random().toString(36).substring(2)}.jpg`;

      // Create storage reference
      const storageRef = ref(storage, `${path}/${finalFileName}`);

      // Upload file
      const snapshot = await uploadBytes(storageRef, blob);

      // Get download URL
      const downloadURL = await getDownloadURL(snapshot.ref);

      return downloadURL;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw new Error('Failed to upload image');
    }
  }

  // Upload playlist cover image
  static async uploadPlaylistCover(
    playlistId: string,
    fileUri: string
  ): Promise<string> {
    return this.uploadImage(fileUri, `playlists/${playlistId}`, 'cover.jpg');
  }

  // Upload user avatar
  static async uploadUserAvatar(
    userId: string,
    fileUri: string
  ): Promise<string> {
    return this.uploadImage(fileUri, `avatars/${userId}`, 'avatar.jpg');
  }

  // Delete image from Firebase Storage
  static async deleteImage(imageUrl: string): Promise<void> {
    try {
      // Extract path from URL
      const url = new URL(imageUrl);
      const pathMatch = url.pathname.match(/\/o\/(.+)\?/);

      if (!pathMatch) {
        throw new Error('Invalid image URL');
      }

      const imagePath = decodeURIComponent(pathMatch[1]);
      const imageRef = ref(storage, imagePath);

      await deleteObject(imageRef);
    } catch (error) {
      console.error('Error deleting image:', error);
      throw new Error('Failed to delete image');
    }
  }

  // Get file size from URI
  static async getFileSize(fileUri: string): Promise<number> {
    try {
      const response = await fetch(fileUri);
      const blob = await response.blob();
      return blob.size;
    } catch (error) {
      console.error('Error getting file size:', error);
      return 0;
    }
  }

  // Validate image file
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
      } catch (error) {
        console.error('Error validating image:', error);
        resolve(false);
      }
    });
  }
}
