import { createHash } from 'crypto';

/** Spec §12.4 — SHA-256 fingerprint of deployed bytecode (hex payload without 0x). */
export function hashBytecode(bytecodeHex: string): string {
  const hex = bytecodeHex.startsWith('0x') ? bytecodeHex.slice(2) : bytecodeHex;
  if (!hex || hex === '') {
    return '';
  }
  return createHash('sha256').update(Buffer.from(hex, 'hex')).digest('hex');
}
