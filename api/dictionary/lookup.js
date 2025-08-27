const { getData } = require('../_data.js');
module.exports = async (req, res) => {
  const url  = new URL(req.url, `http://${req.headers.host}`);
  const term = (url.searchParams.get('term') || '').trim().toLowerCase();
  const dir  = (url.searchParams.get('dir')  || 'en-so').toLowerCase();
  if (!term) return res.status(400).json({ detail: 'Missing term' });

  const fieldIn  = dir.startsWith('en') ? 'english' : 'somali';
  const fieldOut = dir.startsWith('en') ? 'somali'  : 'english';

  const { dictionary } = getData();
  const doc = dictionary.find(d => (d[fieldIn] || '').toLowerCase() === term);
  if (!doc) return res.status(404).json({ detail: 'Word not found' });

  res.status(200).json({
    [fieldIn]:  doc[fieldIn],
    [fieldOut]: doc[fieldOut],
    pos: doc.pos || null,
    pronunciation: doc.pronunciation || null,
    source: doc.source || null,
    updatedAt: doc.updatedAt || null
  });
};
