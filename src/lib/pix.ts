// Generates a Brazilian PIX "Copia e Cola" (BR Code / EMV) string.
// Reference: BACEN Pix EMV spec (subset).

function tlv(id: string, value: string): string {
  const len = value.length.toString().padStart(2, "0");
  return `${id}${len}${value}`;
}

// CRC16-CCITT (poly 0x1021, init 0xFFFF) — required by BR Code.
function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function sanitize(text: string, max: number): string {
  // Remove diacritics + non-ASCII; keep PIX-friendly chars.
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .slice(0, max);
}

export interface PixPayloadInput {
  pixKey: string;
  beneficiaryName: string;
  city: string;
  amount: number;
  txid?: string;
  description?: string;
}

export function buildPixPayload({
  pixKey,
  beneficiaryName,
  city,
  amount,
  txid,
  description,
}: PixPayloadInput): string {
  const merchantAccountInfo =
    tlv("00", "br.gov.bcb.pix") +
    tlv("01", pixKey) +
    (description ? tlv("02", sanitize(description, 60)) : "");

  const id = (txid ?? "***").replace(/[^A-Za-z0-9]/g, "").slice(0, 25) || "***";

  const payload =
    tlv("00", "01") +
    tlv("26", merchantAccountInfo) +
    tlv("52", "0000") +
    tlv("53", "986") +
    (amount > 0 ? tlv("54", amount.toFixed(2)) : "") +
    tlv("58", "BR") +
    tlv("59", sanitize(beneficiaryName, 25)) +
    tlv("60", sanitize(city, 15)) +
    tlv("62", tlv("05", id));

  const toCrc = `${payload}6304`;
  return `${toCrc}${crc16(toCrc)}`;
}
