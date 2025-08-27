import fs from "node:fs";
import path from "node:path";

type Cache = Record<string, any>;
const cache: Cache = {};

function loadJson(name: string) {
  if (cache[name]) return cache[name];
  const p = path.join(process.cwd(), "public", "data", `${name}.json`);
  const raw = fs.readFileSync(p, "utf8");
  const data = JSON.parse(raw);
  cache[name] = data;
  return data;
}

export function getDictionary(): Array<any> {
  // array of docs with {english, somali, ...}
  return loadJson("dictionary");
}
export function getEnglishTestQuestions(): Array<any> {
  return loadJson("english_test_questions");
}
