import handler from './studio-ai/index.js';
export default async function (req, res) {
  req.query = { ...req.query, tool: 'blotato' };
  return handler(req, res);
}
