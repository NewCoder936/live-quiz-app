import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function loadSeedQuestions() {
  const raw = readFileSync(path.join(__dirname, "questions.json"), "utf-8");
  return JSON.parse(raw);
}
