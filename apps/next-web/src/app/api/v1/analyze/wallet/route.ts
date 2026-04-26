import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { BadRequestError } from "@/lib/http/errors";
import { respondWithError } from "@/lib/http/route";
import { walletAnalysisService } from "@/lib/analysis/wallet/service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const chainId = String(body?.chain_id ?? "1");
    const walletAddress = String(body?.wallet_address ?? "");

    try {
      ethers.getAddress(walletAddress.trim());
    } catch {
      throw new BadRequestError("Invalid wallet_address");
    }

    const result = await walletAnalysisService.profileWallet(chainId, walletAddress);
    return NextResponse.json(result);
  } catch (error) {
    return respondWithError(error);
  }
}
