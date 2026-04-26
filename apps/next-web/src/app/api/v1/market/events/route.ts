import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    persisted: false,
    message: "Market activity is analyzed live per token via GET /api/v1/market/token/:address?chainId=1&walletAddress=0x...",
  });
}
