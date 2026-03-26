import { ref } from 'vue';
import { useApi } from './useApi';
import { useWebSocket } from './useWebSocket';
import type { JobResultResponse } from '~/types/api';

export const useAnalysis = () => {
  const api = useApi();
  const { subscribeToJob } = useWebSocket();
  const loading = ref(false);
  const error = ref<string | null>(null);
  const lastJobId = ref<string | null>(null);

  const submitAndPoll = async (chainId: string, contractAddress: string) => {
    loading.value = true;
    error.value = null;
    try {
      const queued = await api.analyzeContract({
        chain_id: chainId,
        contract_address: contractAddress,
        priority: 'normal',
      });
      lastJobId.value = queued.job_id;

      const result = await new Promise<JobResultResponse>((resolve, reject) => {
        const unsubscribe = subscribeToJob(queued.job_id, (message) => {
          const update = message.data as unknown as JobResultResponse;
          if (message.event === 'job.result' && update.analysis) {
            unsubscribe();
            resolve(update);
            return;
          }

          if (update.status === 'failed') {
            unsubscribe();
            reject(new Error(update.failed_reason || 'Analysis failed'));
          }
        });

        const poll = async () => {
          for (let i = 0; i < 30; i++) {
            const status = await api.getJobResult(queued.job_id);
            if (status.analysis && status.ready) {
              unsubscribe();
              resolve(status);
              return;
            }
            if (status.status === 'failed') {
              unsubscribe();
              reject(new Error(status.failed_reason || 'Analysis failed'));
              return;
            }
            await new Promise((resolvePoll) => setTimeout(resolvePoll, 2000));
          }
          unsubscribe();
          reject(new Error('Timeout waiting for job completion'));
        };

        void poll();
      });

      if (!result.analysis) {
        throw new Error('Analysis result was not available');
      }

      return result.analysis;
    } catch (e) {
      error.value = (e as Error).message;
      throw e;
    } finally {
      loading.value = false;
    }
  };

  return { submitAndPoll, loading, error, lastJobId };
};
