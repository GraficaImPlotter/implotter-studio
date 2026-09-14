const crypto = require('crypto');

/**
 * Criptografa uma senha de certificado usando AES-256-GCM
 * @param {string} password - Senha em texto plano
 * @returns {object} { encrypted: string, iv: string, authTag: string }
 */
function encryptPassword(password) {
  if (!process.env.ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY não configurada nas variáveis de ambiente');
  }

  // Gera uma chave de 32 bytes a partir da ENCRYPTION_KEY
  const key = crypto.scryptSync(process.env.ENCRYPTION_KEY, 'salt', 32);

  // IV aleatório de 16 bytes
  const iv = crypto.randomBytes(16);

  // Criar cipher AES-256-GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  let encrypted = cipher.update(password, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  // Auth tag para verificar integridade
  const authTag = cipher.getAuthTag();

  return {
    encrypted: encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex')
  };
}

/**
 * Descriptografa uma senha de certificado
 * @param {string} encrypted - Senha criptografada (hex)
 * @param {string} ivHex - IV em hex
 * @param {string} authTagHex - Auth tag em hex
 * @returns {string} Senha em texto plano
 */
function decryptPassword(encrypted, ivHex, authTagHex) {
  if (!process.env.ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY não configurada nas variáveis de ambiente');
  }

  const key = crypto.scryptSync(process.env.ENCRYPTION_KEY, 'salt', 32);
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

module.exports = {
  encryptPassword,
  decryptPassword
};
