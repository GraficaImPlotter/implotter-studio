/**
 * File Upload Validation
 * Validates file type by checking magic bytes (content), not just extension
 */

import fs from 'fs';

/**
 * Allowed MIME types for certificate uploads
 */
const ALLOWED_CERT_TYPES = {
  'application/x-pkcs12': ['.pfx', '.p12'],
  'application/x-x509-ca-cert': ['.cer', '.crt', '.pem'],
  'application/x-pem-file': ['.pem'],
};

/**
 * Magic bytes signatures for common file types
 */
const MAGIC_BYTES = {
  '504b0304': 'application/vnd.openxmlformats-officedocument', // ZIP/PFX
  '3082': 'application/x-pkcs12', // PKCS12 ASN.1 header
  '2d2d2d': 'text/plain', // PEM (---)
  '43443251': 'application/x-x509-ca-cert', // DER
};

/**
 * Validate file by reading magic bytes
 * @param {string} filePath - Path to file
 * @returns {Promise<{valid: boolean, mimeType: string, extension: string}>}
 */
export async function validateFileType(filePath) {
  try {
    // Read first 8 bytes
    const buffer = Buffer.alloc(8);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, 8, 0);
    fs.closeSync(fd);

    const hex = buffer.toString('hex').toUpperCase();

    // Check magic bytes
    for (const [magic, mimeType] of Object.entries(MAGIC_BYTES)) {
      if (hex.startsWith(magic)) {
        const extension = ALLOWED_CERT_TYPES[mimeType]?.[0] || '';
        return { valid: true, mimeType, extension };
      }
    }

    // Check specific patterns
    if (hex.startsWith('504B') || hex.startsWith('3082')) {
      return { valid: true, mimeType: 'application/x-pkcs12', extension: '.pfx' };
    }

    if (hex.startsWith('2D2D2D')) {
      return { valid: true, mimeType: 'text/plain', extension: '.pem' };
    }

    return { valid: false, mimeType: 'unknown', extension: '' };
  } catch (error) {
    return { valid: false, mimeType: 'error', extension: '' };
  }
}

/**
 * Validate certificate file before processing
 * @param {Express.Multer.File} file - Uploaded file
 * @returns {Promise<{valid: boolean, error?: string}>}
 */
export async function validateCertificateFile(file) {
  // Check file size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    return { valid: false, error: 'Arquivo muito grande (máx 10MB)' };
  }

  // Validate by magic bytes
  const validation = await validateFileType(file.path);

  if (!validation.valid) {
    return { valid: false, error: 'Tipo de arquivo não permitido' };
  }

  // Check if it's a certificate type
  const isCert = Object.keys(ALLOWED_CERT_TYPES).includes(validation.mimeType);
  if (!isCert) {
    return { valid: false, error: 'Arquivo deve ser um certificado (.pfx, .p12, .cer, .crt, .pem)' };
  }

  return { valid: true };
}

/**
 * Allowed file extensions (fallback check)
 */
export const ALLOWED_CERT_EXTENSIONS = ['.pfx', '.p12', '.cer', '.crt', '.pem'];

/**
 * Check file extension (less secure but fast)
 * @param {string} filename
 * @returns {boolean}
 */
export function hasValidExtension(filename) {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'));
  return ALLOWED_CERT_EXTENSIONS.includes(ext);
}