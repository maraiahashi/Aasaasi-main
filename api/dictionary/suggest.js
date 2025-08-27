const { getData } = require('../_data.js');
module.exports = async (req, res) => {
  const url  = new URL(req.url, `http://${req.headers.host}`);
  const term = (url.searchParams.get('term') || '').trim().toLowerCase();
  const dir  = (url.searchParams.get('dir')  || 'en-so').toLowerCase();
  if (!term) return res.status(200).json([]);
  const field = dir.startsWith('en') ? 'english' : 'somali';

  const { dictionary } = getData();
  const out = [];
  for (const d of dictionary) {
    const v = (d[field] || '').toLowerCase();
    if (v.startsWith(term)) out.push(d[field]);
    if (out.length >= 15) break;
  }
  res.status(200).json(out);
};
