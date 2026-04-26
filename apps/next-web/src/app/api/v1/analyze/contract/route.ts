import { NextRequest, NextResponse } from "next/server";
import { tasks } from "@trigger.dev/sdk/v3";
import { ethers } from "ethers";
import { BadRequestError } from "@/lib/http/errors";
import { respondWithError } from "@/lib/http/route";
import { contractAnalysisService, type ContractAnalysisJobDto } from "@/lib/analysis/contract/service";
import { configureTrigger } from "@/trigger/configure";
import { analyzeContractTask } from "@/trigger/tasks/contract-analysis";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const chainId = String(body?.chain_id ?? "1");
    const contractAddress = String(body?.contract_address ?? "");

    let checksummed: string;
    try {
      checksummed = ethers.getAddress(contractAddress.trim());
    } catch {
      throw new BadRequestError("Invalid contract_address");
    }

    const payload: ContractAnalysisJobDto = {
      chainId,
      contractAddress: checksummed,
      priority: body?.priority ?? "normal",
    };

    if (process.env.TRIGGER_SECRET_KEY) {
      configureTrigger();

      const handle = await tasks.trigger<typeof analyzeContractTask>("analyze-contract", payload, {
        tags: [`contract:${checksummed.toLowerCase()}`, `chain:${chainId}`],
      });

      return NextResponse.json(
        {
          job_id: handle.id,
          status: "queued",
          estimated_seconds: 15,
          result_url: `/api/v1/jobs/${handle.id}/result`,
          mode: "trigger",
        },
        { status: 202 },
      );
    }

    const result = await contractAnalysisService.analyzeContract(payload);
    return NextResponse.json({
      job_id: null,
      status: result.status,
      result_url: `/api/v1/contracts/${chainId}/${checksummed}`,
      mode: "inline",
      analysis: result,
    });
  } catch (error) {
    return respondWithError(error);
  }
}
