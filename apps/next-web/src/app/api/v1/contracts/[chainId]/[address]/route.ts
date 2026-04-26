import { NextRequest, NextResponse } from "next/server";
import { ethers } from "ethers";
import { BadRequestError } from "@/lib/http/errors";
import { respondWithError } from "@/lib/http/route";
import { contractAnalysisService } from "@/lib/analysis/contract/service";

type RouteContext = {
  params: Promise<{
    chainId: string;
    address: string;
  }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { chainId, address } = await context.params;

    let checksummed: string;
    try {
      checksummed = ethers.getAddress(address.trim());
    } catch {
      throw new BadRequestError("Invalid contract address");
    }

    const result = await contractAnalysisService.analyzeContract({
      chainId,
      contractAddress: checksummed,
    });

    return NextResponse.json(result);
  } catch (error) {
    return respondWithError(error);
  }
}
