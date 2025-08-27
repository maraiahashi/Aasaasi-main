const fs = require('fs');
const path = require('path');

const g = globalThis;
if (!g.__aasaasi_cache) g.__aasaasi_cache = {};

function read(name){
  const p = path.join(process.cwd(), 'data', name);
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

exports.getData = function getData(){
  const c = g.__aasaasi_cache;
  if (!c.dictionary) c.dictionary = read('dictionary.json');
  if (!c.questions)  c.questions  = read('english_test_questions.json');
  return c;
};
