import { UploadApiResponse } from 'cloudinary';
import { cloudinary } from '../config/cloudinary';

export interface CloudinaryUploadResult {
  imageUrl: string;
  cloudinaryPublicId: string;
}

/**
 * Upload an image buffer directly to Cloudinary.
 *
 * The image is received from Multer as a Buffer.
 * We do not save the image to the local filesystem.
 */
export const uploadImageToCloudinary = (
  buffer: Buffer,
  folder = 'campuscapsule/memories'
): Promise<CloudinaryUploadResult> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        transformation: [
          {
            quality: 'auto',
            fetch_format: 'auto',
          },
        ],
      },
      (error, result?: UploadApiResponse) => {
        if (error) {
          reject(error);
          return;
        }

        if (!result) {
          reject(new Error('Cloudinary upload completed without a result.'));
          return;
        }

        resolve({
          imageUrl: result.secure_url,
          cloudinaryPublicId: result.public_id,
        });
      }
    );

    uploadStream.end(buffer);
  });
};

/**
 * Delete an image from Cloudinary.
 *
 * This will be used later when a memory is deleted,
 * so unused images do not remain in Cloudinary.
 */
export const deleteImageFromCloudinary = async (
  cloudinaryPublicId: string
): Promise<void> => {
  await cloudinary.uploader.destroy(cloudinaryPublicId, {
    resource_type: 'image',
  });
};

