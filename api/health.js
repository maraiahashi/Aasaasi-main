const { getData } = require('./_data.js');
module.exports = async (req, res) => {
  try{
    const { dictionary, questions } = getData();
    res.status(200).json({
      status: 'ok',
      mode: 'json',
      counts: { dictionary: dictionary.length, english_test_questions: questions.length }
    });
  }catch(e){
    res.status(500).json({ status: 'error', error: String(e) });
  }
};
