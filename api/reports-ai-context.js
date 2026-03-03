import { handleReportsAiContext } from '../server/services/reportsPipeline.js';

export default async function handler(req, res) {
  return handleReportsAiContext(req, res);
}
