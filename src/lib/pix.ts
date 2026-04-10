import qrcode from 'qrcode-generator';

function crc16(str: string): string {
  let crc = 0xFFFF;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = (crc << 1) ^ 0x1021;
      } else {
        crc <<= 1;
      }
      crc &= 0xFFFF;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function tlv(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

export function generatePixCode(params: {
  pixKey: string;
  receiverName: string;
  city: string;
  amount: number;
  txid?: string;
}): string {
  const { pixKey, receiverName, city, amount, txid = '***' } = params;

  const gui = tlv('00', 'br.gov.bcb.pix');
  const key = tlv('01', pixKey);
  const merchantAccount = tlv('26', gui + key);

  let payload = '';
  payload += tlv('00', '01'); // format
  payload += merchantAccount;
  payload += tlv('52', '0000'); // MCC
  payload += tlv('53', '986'); // BRL
  if (amount > 0) {
    payload += tlv('54', amount.toFixed(2));
  }
  payload += tlv('58', 'BR');
  payload += tlv('59', receiverName.substring(0, 25));
  payload += tlv('60', city.substring(0, 15));
  payload += tlv('62', tlv('05', txid.substring(0, 25)));
  payload += '6304';

  const checksum = crc16(payload);
  return payload + checksum;
}

export function generatePixQRCode(pixCode: string): string {
  const qr = qrcode(0, 'M');
  qr.addData(pixCode);
  qr.make();
  return qr.createDataURL(8, 4);
}
