import { Album, Artist } from '@/graphql/types-return';

export type ImageSize = 'small' | 'medium' | 'big' | 'xl';

/**
 * Get the best available image URL for an album cover
 * @param album Album object with all cover sizes
 * @param preferredSize Preferred image size
 * @returns Image URL or undefined if no cover available
 */
export const getAlbumCover = (
  album: Album,
  preferredSize: ImageSize = 'medium'
): string | undefined => {
  // Try preferred size first, then fallback to other sizes
  const sizeOrder: ImageSize[] = [
    preferredSize,
    'medium',
    'big',
    'xl',
    'small'
  ];

  for (const size of sizeOrder) {
    switch (size) {
      case 'small':
        if (album.coverSmall) return album.coverSmall;
        break;
      case 'medium':
        if (album.coverMedium) return album.coverMedium;
        break;
      case 'big':
        if (album.coverBig) return album.coverBig;
        break;
      case 'xl':
        if (album.coverXl) return album.coverXl;
        break;
    }
  }

  // Fallback to base cover if available
  return album.cover;
};

/**
 * Get the best available image URL for an artist picture
 * @param artist Artist object with all picture sizes
 * @param preferredSize Preferred image size
 * @returns Image URL or undefined if no picture available
 */
export const getArtistPicture = (
  artist: Artist,
  preferredSize: ImageSize = 'medium'
): string | undefined => {
  // Try preferred size first, then fallback to other sizes
  const sizeOrder: ImageSize[] = [
    preferredSize,
    'medium',
    'big',
    'xl',
    'small'
  ];

  for (const size of sizeOrder) {
    switch (size) {
      case 'small':
        if (artist.pictureSmall) return artist.pictureSmall;
        break;
      case 'medium':
        if (artist.pictureMedium) return artist.pictureMedium;
        break;
      case 'big':
        if (artist.pictureBig) return artist.pictureBig;
        break;
      case 'xl':
        if (artist.pictureXl) return artist.pictureXl;
        break;
    }
  }

  // Fallback to base picture if available
  return artist.picture;
};
