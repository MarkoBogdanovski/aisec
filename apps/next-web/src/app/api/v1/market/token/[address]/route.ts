import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { BadRequestError } from "@/lib/http/errors";
import { respondWithError } from "@/lib/http/route";
import { marketAnalysisService } from "@/lib/analysis/market/service";

type RouteContext = {
  params: Promise<{
    address: string;
  }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { address } = await context.params;
    const chainId = request.nextUrl.searchParams.get("chainId") ?? "1";
    const walletAddress = request.nextUrl.searchParams.get("walletAddress") ?? undefined;

    let checksummed: string;
    try {
      checksummed = ethers.getAddress(address.trim());
    } catch {
      throw new BadRequestError("Invalid token address");
    }

    if (walletAddress) {
      try {
        ethers.getAddress(walletAddress.trim());
      } catch {
        throw new BadRequestError("Invalid walletAddress");
      }
    }

    const result = await marketAnalysisService.analyzeTokenActivity(chainId, checksummed, walletAddress);
    return NextResponse.json(result);
  } catch (error) {
    return respondWithError(error);
  }
}
