import { handleReportsIngest } from '../server/services/reportsPipeline.js';

export default async function handler(req, res) {
  return handleReportsIngest(req, res);
}
