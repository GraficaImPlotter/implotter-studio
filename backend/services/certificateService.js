import { logger } from './logger.js';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import xmlCrypto from 'xml-crypto';
const { SignedXml, FileKeyInfo } = xmlCrypto;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Certificate Service - Handles A1 (.pfx/.p12) and A3 certificate operations
 *
 * A1 Certificates (File-based .pfx/.p12):
 * - Stored as files, password protected
 * - Can be used directly on the server for signing
 * - Best for automated/background NF-e issuance
 *
 * A3 Certificates (Hardware Token/Smartcard):
 * - Stored on USB tokens or smartcards
 * - Require a local signer service running on the client machine
 */

const CERT_STORAGE_PATH = process.env.CERT_STORAGE_PATH ||
  path.join(__dirname, '../../certs');

// Ensure cert storage directory exists
if (!fs.existsSync(CERT_STORAGE_PATH)) {
  fs.mkdirSync(CERT_STORAGE_PATH, { recursive: true });
}

/**
 * Upload and store A1 certificate file (.pfx/.p12)
 */
function storeA1Certificate(fileBuffer, filename) {
  try {
    const filePath = path.join(CERT_STORAGE_PATH, filename);
    fs.writeFileSync(filePath, fileBuffer);
    logger.info('A1 certificate stored', { filePath });
    return { success: true, path: filePath };
  } catch (error) {
    logger.error('Error storing A1 certificate', { message: error.message });
    throw error;
  }
}

/**
 * Read A1 certificate (.pfx/.p12) and extract cert info
 */
async function readA1Certificate(pfxPath, password) {
  try {
    const pfxBuffer = fs.readFileSync(pfxPath);
    const { Certificate } = await import('node-forge');
    // Forge needs to be imported dynamically since it's ESM
    // Fallback: use Node.js crypto
    const { publicKey, privateKey } = crypto.createPrivateKey({
      key: pfxBuffer,
      passphrase: password,
      format: 'pem',
    });

    // Actually, for .pfx we need to use forge or similar
    // Node.js crypto doesn't directly support .pfx parsing
    return {
      success: false,
      error: 'Use forge or pkijs to parse PFX. Install: npm install node-forge',
    };
  } catch (error) {
    logger.error('Error reading A1 certificate', { message: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Sign XML with A1 certificate (.pfx file) using xml-crypto
 * This is the proper implementation for .pfx files
 */
async function signWithA1(xmlContent, pfxFilePath, pfxPassword) {
  try {
    logger.info('Signing XML with A1 certificate (.pfx)', { pfxFilePath });

    // For xml-crypto with .pfx, we need to:
    // 1. Parse the .pfx file to get the private key and certificate
    // 2. Use them for signing

    // Option A: Use node-forge to parse PFX (recommended)
    // First, let's check if node-forge is available
    let privateKeyPem, certPem;

    try {
      const forgeModule = await import('node-forge');
      const forge = forgeModule.default || forgeModule;
      const pfxBuffer = fs.readFileSync(pfxFilePath);
      const pfxAsn1 = forge.asn1.fromDer(forge.util.createBuffer(pfxBuffer));
      const pfx = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, pfxPassword);

      // Get the private key and certificate
      let keyBags = pfx.getBags({ bagType: forge.pkcs12.PKCS8_SHROUDED_KEY_BAG });
      if (!keyBags || keyBags[forge.pkcs12.PKCS8_SHROUDED_KEY_BAG].length === 0) {
        keyBags = pfx.getBags({ bagType: forge.pkcs12.KEY_BAG });
      }

      const keyBagArray = keyBags[forge.pkcs12.PKCS8_SHROUDED_KEY_BAG] ||
                         keyBags[forge.pkcs12.KEY_BAG] || [];
      if (keyBagArray.length === 0) {
        throw new Error('Nenhuma chave privada encontrada no certificado');
      }

      const privateKey = keyBagArray[0].key;
      privateKeyPem = forge.pki.privateKeyToPem(privateKey);

      // Get certificate
      const certBags = pfx.getBags({ bagType: forge.pkcs12.CERT_BAG });
      const certBagArray = certBags[forge.pkcs12.CERT_BAG] || [];
      
      const validCertBag = certBagArray.find(b => b && b.cert);
      if (!validCertBag) {
        throw new Error('Nenhum certificado valido encontrado no arquivo PFX');
      }

      const cert = validCertBag.cert;
      certPem = forge.pki.certificateToPem(cert);

    } catch (forgeError) {
      logger.error('node-forge error, trying alternative method', {
        message: forgeError.message
      });
      // Fallback: try using openssl command or provide instructions
      return {
        success: false,
        error: 'node-forge is required for .pfx signing. Install: npm install node-forge',
        needsInstall: true,
      };
    }

    // Use xml-crypto to sign the XML
    const sig = new SignedXml();
    sig.signingKey = privateKeyPem;
    sig.keyInfoProvider = new FileKeyInfo(certPem);

    // Add reference for NF-e signature (following SEFAZ pattern)
    sig.addReference(
      "//*[local-name(.)='infNFe']",
      [
        'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
        'http://www.w3.org/TR/2001/REC-xml-c14n-20010315',
      ],
      'http://www.w3.org/2000/09/xmldsig#sha1'
    );

    sig.computeSignature(xmlContent, { prefix: 'ds' });
    const signedXml = sig.getSignedXml();

    logger.info('XML signed successfully with A1 certificate');
    return {
      success: true,
      signedXML: signedXml,
    };
  } catch (error) {
    logger.error('A1 signing error', { message: error.message });
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Sign XML with A3 certificate via local signer service
 */
async function signWithA3(xmlContent, options = {}) {
  const signerUrl = options.signerUrl || 'http://localhost:8443';

  try {
    logger.info('Requesting A3 signature from local signer', { signerUrl });

    const response = await fetch(`${signerUrl}/sign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        xml: xmlContent,
        signatureType: 'nfe',
        ...options,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || 'Signing failed');
    }

    const result = await response.json();
    return {
      success: true,
      signedXML: result.signedXml || result.xml,
      signatureInfo: result.signatureInfo,
    };
  } catch (error) {
    logger.error('A3 signing error', { message: error.message });
    return {
      success: false,
      error: error.message,
      needsLocalSigner: true,
      hint: 'Verifique se o token A3 está conectado e o serviço local está rodando',
    };
  }
}

/**
 * Validate certificate expiration and data
 */
function validateCertificate(certData) {
  const now = new Date();
  const validFrom = new Date(certData.validFrom);
  const validTo = new Date(certData.validTo);

  return {
    valid: now >= validFrom && now <= validTo,
    expired: now > validTo,
    notYetValid: now < validFrom,
    daysUntilExpiry: Math.ceil((validTo - now) / (1000 * 60 * 60 * 24)),
    subject: certData.subject,
    issuer: certData.issuer,
    serialNumber: certData.serialNumber,
    validFrom: certData.validFrom,
    validTo: certData.validTo,
  };
}

/**
 * Get certificate info from .pfx file
 */
async function getA1CertInfo(pfxFilePath, password) {
  try {
    const forgeModule = await import('node-forge');
    const forge = forgeModule.default || forgeModule;
    const pfxBuffer = fs.readFileSync(pfxFilePath);
    const pfxAsn1 = forge.asn1.fromDer(forge.util.createBuffer(pfxBuffer));
    const pfx = forge.pkcs12.pkcs12FromAsn1(pfxAsn1, password);

    const certBags = pfx.getBags({ bagType: forge.pkcs12.CERT_BAG });
    const certBagArray = certBags[forge.pkcs12.CERT_BAG] || [];

    const validCertBag = certBagArray.find(b => b && b.cert && b.cert.subject);
    if (!validCertBag) {
      throw new Error('Nenhum certificado valido encontrado no arquivo PFX');
    }

    const cert = validCertBag.cert;
    const attributes = cert.subject.attributes || [];

    const subject = attributes.map(a => `${a.shortName || a.name || 'Unknown'}=${a.value}`).join(', ');
    const issuer = cert.issuer && cert.issuer.attributes ? cert.issuer.attributes.map(a => `${a.shortName || a.name || 'Unknown'}=${a.value}`).join(', ') : 'Desconhecido';

    return {
      success: true,
      subject,
      issuer,
      serialNumber: cert.serialNumber,
      validFrom: cert.validity.notBefore,
      validTo: cert.validity.notAfter,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Local Signer Service information
 */
function getLocalSignerInfo() {
  return {
    description: 'Serviço Local de Assinatura A3',
    purpose: 'Interfaces with A3 USB tokens/smartcards for XML signing',
    defaultPort: 8443,
    endpoints: {
      health: 'GET /health',
      listCerts: 'GET /certificates',
      sign: 'POST /sign',
      signXml: 'POST /sign-xml',
    },
    installHint: `
Para usar certificado A3, é necessário instalar o Serviço Local de Assinatura:
1. Baixe e instale o serviço local
2. Conecte o token A3 na USB
3. O serviço detectará o certificado automaticamente
4. O sistema web enviará o XML para assinatura via localhost:8443
    `.trim(),
  };
}

export {
  storeA1Certificate,
  readA1Certificate,
  signWithA1,
  signWithA3,
  validateCertificate,
  getA1CertInfo,
  getLocalSignerInfo,
  CERT_STORAGE_PATH,
};
