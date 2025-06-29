import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader2, AlertCircle, Check } from 'lucide-react';
import { uploadImage, deleteImage, getOptimizedImageUrl } from '../../lib/supabase';

interface ImageUploadProps {
  onImageUploaded: (url: string) => void;
  onImageRemoved?: (url: string) => void;
  currentImage?: string;
  maxFiles?: number;
  accept?: string;
  maxSize?: number; // in MB
  className?: string;
  disabled?: boolean;
}

interface UploadState {
  uploading: boolean;
  progress: number;
  error: string | null;
  success: boolean;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  onImageUploaded,
  onImageRemoved,
  currentImage,
  maxFiles = 1,
  accept = 'image/*',
  maxSize = 5,
  className = '',
  disabled = false
}) => {
  const [uploadState, setUploadState] = useState<UploadState>({
    uploading: false,
    progress: 0,
    error: null,
    success: false
  });
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetUploadState = () => {
    setUploadState({
      uploading: false,
      progress: 0,
      error: null,
      success: false
    });
  };

  const validateFile = (file: File): string | null => {
    // Check file type
    if (!file.type.startsWith('image/')) {
      return 'Please select a valid image file';
    }

    // Check file size
    const maxSizeBytes = maxSize * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return `File size must be less than ${maxSize}MB`;
    }

    return null;
  };

  const handleFileUpload = async (files: FileList) => {
    if (files.length === 0) return;

    const file = files[0];
    const validationError = validateFile(file);
    
    if (validationError) {
      setUploadState(prev => ({ ...prev, error: validationError }));
      return;
    }

    setUploadState({
      uploading: true,
      progress: 0,
      error: null,
      success: false
    });

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadState(prev => ({
          ...prev,
          progress: Math.min(prev.progress + 10, 90)
        }));
      }, 200);

      const imageUrl = await uploadImage(file);
      
      clearInterval(progressInterval);
      
      setUploadState({
        uploading: false,
        progress: 100,
        error: null,
        success: true
      });

      onImageUploaded(imageUrl);

      // Reset success state after 2 seconds
      setTimeout(() => {
        setUploadState(prev => ({ ...prev, success: false, progress: 0 }));
      }, 2000);

    } catch (error) {
      setUploadState({
        uploading: false,
        progress: 0,
        error: error instanceof Error ? error.message : 'Upload failed',
        success: false
      });
    }
  };

  const handleRemoveImage = async () => {
    if (!currentImage) return;

    try {
      await deleteImage(currentImage);
      onImageRemoved?.(currentImage);
      resetUploadState();
    } catch (error) {
      setUploadState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to remove image'
      }));
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragIn = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setDragActive(true);
    }
  };

  const handleDragOut = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileUpload(e.target.files);
    }
  };

  const openFileDialog = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Current Image Display */}
      {currentImage && (
        <div className="relative group">
          <div className="relative overflow-hidden rounded-lg border-2 border-gray-200 dark:border-gray-700">
            <img
              src={getOptimizedImageUrl(currentImage, 400, 300, 80)}
              alt="Current product image"
              className="w-full h-48 object-cover"
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
              <button
                onClick={handleRemoveImage}
                disabled={disabled || uploadState.uploading}
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 disabled:opacity-50"
                title="Remove image"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 transition-all duration-200 ${
          dragActive
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
        } ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        }`}
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={openFileDialog}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileSelect}
          disabled={disabled}
          className="hidden"
        />

        <div className="text-center">
          {uploadState.uploading ? (
            <div className="space-y-4">
              <Loader2 className="mx-auto text-blue-500 animate-spin" size={48} />
              <div className="space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Uploading image...
                </p>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadState.progress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {uploadState.progress}%
                </p>
              </div>
            </div>
          ) : uploadState.success ? (
            <div className="space-y-2">
              <Check className="mx-auto text-green-500" size={48} />
              <p className="text-sm text-green-600 dark:text-green-400">
                Image uploaded successfully!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-center">
                {currentImage ? (
                  <Upload className="text-gray-400" size={48} />
                ) : (
                  <ImageIcon className="text-gray-400" size={48} />
                )}
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {currentImage ? 'Replace image' : 'Upload product image'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Drag and drop an image here, or click to browse
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Supports: JPEG, PNG, WebP, GIF (max {maxSize}MB)
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error Display */}
      {uploadState.error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
          <p className="text-sm text-red-600 dark:text-red-400">
            {uploadState.error}
          </p>
          <button
            onClick={resetUploadState}
            className="ml-auto text-red-500 hover:text-red-700 dark:hover:text-red-300"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default ImageUpload;