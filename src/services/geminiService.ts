import { pipelineService } from './pipelineService';
import { transcriptionService } from './transcriptionService';
import { synthesisService } from './synthesisService';

export const geminiService = {
  pipeline: pipelineService,
  transcription: transcriptionService,
  synthesis: synthesisService,

  getApiKey(): string {
    return import.meta.env.VITE_GEMINI_API_KEY || '';
  }
};
