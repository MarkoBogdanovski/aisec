import { createHash } from "node:crypto";

export function hashBytecode(bytecodeHex: string): string {
  const hex = bytecodeHex.startsWith("0x") ? bytecodeHex.slice(2) : bytecodeHex;
  if (!hex) {
    return "";
  }

  return createHash("sha256").update(Buffer.from(hex, "hex")).digest("hex");
}
