const { getData } = require('../../_data.js');
module.exports = async (req, res) => {
  const url   = new URL(req.url, `http://${req.headers.host}`);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '12', 10), 50);

  const { questions } = getData();
  const pool = questions.slice();
  const sample = [];

  const pick = () => pool.splice(Math.floor(Math.random()*pool.length),1)[0];

  for (let i=0; i<Math.min(limit, pool.length); i++){
    const d = pick();
    const opts = [d.correct, d.distractor1, d.distractor2, d.distractor3].filter(Boolean);
    for (let k=opts.length-1;k>0;k--){ const r=Math.floor(Math.random()*(k+1)); [opts[k],opts[r]]=[opts[r],opts[k]]; }
    sample.push({ id: String(d._id || `Q${i}`), question: d.question, options: opts });
  }
  res.status(200).json({ questions: sample });
};
