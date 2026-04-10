/**
 * ESC-002: Centralized file upload validation utility.
 * Validates file size and type before uploading to Supabase Storage.
 */

const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const ALLOWED_DOCUMENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "text/xml",
  "application/xml",
];

const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate a file before upload (documents: PDF, images, XML)
 */
export const validateDocumentFile = (file: File): FileValidationResult => {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Máximo permitido: ${MAX_FILE_SIZE_MB}MB.`,
    };
  }

  if (!ALLOWED_DOCUMENT_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Tipo de arquivo não permitido (${file.type}). Aceitos: PDF, JPG, PNG, XML.`,
    };
  }

  return { valid: true };
};

/**
 * Validate an image file before upload (product images, logos, etc)
 */
export const validateImageFile = (file: File, maxSizeMB = MAX_FILE_SIZE_MB): FileValidationResult => {
  const maxBytes = maxSizeMB * 1024 * 1024;

  if (file.size > maxBytes) {
    return {
      valid: false,
      error: `Imagem muito grande (${(file.size / 1024 / 1024).toFixed(1)}MB). Máximo permitido: ${maxSizeMB}MB.`,
    };
  }

  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Formato de imagem não suportado (${file.type}). Aceitos: JPG, PNG, WebP, GIF.`,
    };
  }

  return { valid: true };
};
