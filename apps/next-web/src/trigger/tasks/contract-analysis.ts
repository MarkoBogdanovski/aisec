import { task } from "@trigger.dev/sdk/v3";
import { contractAnalysisService, type ContractAnalysisJobDto } from "@/lib/analysis/contract/service";

export const analyzeContractTask = task({
  id: "analyze-contract",
  run: async (payload: ContractAnalysisJobDto) => {
    return contractAnalysisService.analyzeContract(payload);
  },
});
