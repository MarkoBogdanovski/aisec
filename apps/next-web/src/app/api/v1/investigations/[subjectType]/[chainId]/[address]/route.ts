import { NextResponse } from "next/server";
import { ethers } from "ethers";
import { BadRequestError } from "@/lib/http/errors";
import { respondWithError } from "@/lib/http/route";
import { investigationsService } from "@/lib/investigations/service";

type RouteContext = {
  params: Promise<{
    subjectType: string;
    chainId: string;
    address: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { subjectType, chainId, address } = await context.params;
    const normalizedType = subjectType.toLowerCase();

    if (normalizedType !== "wallet" && normalizedType !== "contract") {
      throw new BadRequestError('subjectType must be "wallet" or "contract"');
    }

    let checksumAddress: string;
    try {
      checksumAddress = ethers.getAddress(address.trim());
    } catch {
      throw new BadRequestError("Invalid address");
    }

    const result = normalizedType === "wallet"
      ? await investigationsService.buildWalletInvestigation(chainId, checksumAddress)
      : await investigationsService.buildContractInvestigation(chainId, checksumAddress);

    return NextResponse.json(result);
  } catch (error) {
    return respondWithError(error);
  }
}
