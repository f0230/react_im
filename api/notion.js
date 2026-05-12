import handler from './integrations/index.js';
export default async function (req, res) {
  req.query = { ...req.query, service: 'notion' };
  return handler(req, res);
}
