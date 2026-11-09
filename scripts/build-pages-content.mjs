import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const lessonsRoot = path.join(projectRoot, "lessons");
const outputDirectory = path.join(projectRoot, "src", "generated");
const outputPath = path.join(outputDirectory, "public-content.json");

const allowedCategories = new Set([
  "cybersecurity",
  "operating-systems",
  "networking",
  "hardware",
  "programming",
  "algorithms",
  "databases",
  "ai-cloud",
]);

function fail(message) {
  throw new Error(`Content build failed: ${message}`);
}

function readJson(filename) {
  try {
    return JSON.parse(fs.readFileSync(filename, "utf8"));
  } catch (error) {
    fail(
      `${path.relative(projectRoot, filename)} is not valid JSON: ${
        error instanceof Error ? error.message : "unknown error"
      }`,
    );
  }
}

function stringArray(value, field, filename) {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    fail(`${filename}: ${field} must be an array of strings.`);
  }
  return value;
}

function objectArray(value, field, filename) {
  if (!Array.isArray(value) || !value.every((item) => item && typeof item === "object")) {
    fail(`${filename}: ${field} must be an array of objects.`);
  }
  return value;
}

function validateMetadata(metadata, filename, categoryDirectory) {
  const label = path.relative(projectRoot, filename);
  if (!metadata || typeof metadata !== "object") fail(`${label}: metadata must be an object.`);
  if (typeof metadata.id !== "string" || !/^[a-z0-9][a-z0-9-]{1,63}$/.test(metadata.id)) {
    fail(`${label}: id is invalid.`);
  }
  if (!Number.isInteger(metadata.day) || metadata.day < 1) fail(`${label}: day is invalid.`);
  if (metadata.status !== "published" && metadata.status !== "draft") {
    fail(`${label}: status must be published or draft.`);
  }
  if (typeof metadata.title !== "string" || !metadata.title.trim()) fail(`${label}: title is required.`);
  if (typeof metadata.category !== "string" || !metadata.category.trim()) fail(`${label}: category is required.`);
  if (typeof metadata.lessonDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(metadata.lessonDate)) {
    fail(`${label}: lessonDate must use YYYY-MM-DD.`);
  }
  if (typeof metadata.summary !== "string" || !metadata.summary.trim()) fail(`${label}: summary is required.`);
  if (!Number.isInteger(metadata.estimatedMinutes) || metadata.estimatedMinutes < 1) {
    fail(`${label}: estimatedMinutes is invalid.`);
  }
  if (!allowedCategories.has(categoryDirectory)) {
    fail(`${label}: category directory "${categoryDirectory}" is not allowed.`);
  }

  const images = objectArray(metadata.images ?? [], "images", label);
  const references = objectArray(metadata.references ?? [], "references", label);
  const quiz = objectArray(metadata.quiz ?? [], "quiz", label).map((question, index) => {
    if (typeof question.id !== "string" || !question.id) fail(`${label}: quiz[${index}].id is required.`);
    if (typeof question.prompt !== "string" || !question.prompt.trim()) {
      fail(`${label}: quiz[${index}].prompt is required.`);
    }
    const options = stringArray(question.options, `quiz[${index}].options`, label);
    if (options.length < 2) fail(`${label}: quiz[${index}] needs at least two options.`);
    if (
      !Number.isInteger(question.correctOption) ||
      question.correctOption < 0 ||
      question.correctOption >= options.length
    ) {
      fail(`${label}: quiz[${index}].correctOption is invalid.`);
    }
    if (typeof question.explanation !== "string" || !question.explanation.trim()) {
      fail(`${label}: quiz[${index}].explanation is required.`);
    }
    return {
      id: question.id,
      prompt: question.prompt,
      options,
      correctOption: question.correctOption,
      explanation: question.explanation,
      position: index + 1,
    };
  });

  return {
    id: metadata.id,
    day: metadata.day,
    status: metadata.status,
    title: metadata.title.trim(),
    category: metadata.category.trim(),
    lessonDate: metadata.lessonDate,
    summary: metadata.summary.trim(),
    estimatedMinutes: metadata.estimatedMinutes,
    images,
    references,
    relatedTopics: stringArray(metadata.relatedTopics ?? [], "relatedTopics", label),
    tags: stringArray(metadata.tags ?? [], "tags", label),
    quiz,
  };
}

function listMetadataFiles(directory) {
  if (!fs.existsSync(directory)) fail("lessons directory does not exist.");
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...listMetadataFiles(fullPath));
    else if (entry.isFile() && entry.name.endsWith(".json")) files.push(fullPath);
  }
  return files.sort();
}

const metadataFiles = listMetadataFiles(lessonsRoot);
const seenIds = new Set();
const seenDays = new Set();
const lessons = [];
const drafts = [];

for (const metadataFile of metadataFiles) {
  const relative = path.relative(lessonsRoot, metadataFile);
  const segments = relative.split(path.sep);
  if (segments.length !== 2 || segments[1] === "") {
    fail(`${relative}: expected lessons/<category>/<id>.json.`);
  }
  if (seenIds.has(segments[1].replace(/\.json$/, ""))) {
    fail(`${relative}: duplicate metadata filename.`);
  }
  const metadata = validateMetadata(
    readJson(metadataFile),
    metadataFile,
    segments[0],
  );
  if (seenIds.has(metadata.id)) fail(`${relative}: duplicate lesson id "${metadata.id}".`);
  if (seenDays.has(metadata.day)) fail(`${relative}: duplicate lesson day "${metadata.day}".`);
  seenIds.add(metadata.id);
  seenDays.add(metadata.day);

  const markdownPath = metadataFile.replace(/\.json$/, ".md");
  if (!fs.existsSync(markdownPath)) {
    fail(`${relative}: matching Markdown file is missing.`);
  }
  const markdown = fs.readFileSync(markdownPath, "utf8");
  if (!markdown.trim()) fail(`${relative}: Markdown is empty.`);
  if (Buffer.byteLength(markdown, "utf8") > 512 * 1024) {
    fail(`${relative}: Markdown exceeds 512 KiB.`);
  }

  const lesson = {
    ...metadata,
    markdown,
    githubPath: `lessons/${segments[0]}/${segments[1].replace(/\.json$/, ".md")}`,
    contentHash: crypto.createHash("sha256").update(markdown, "utf8").digest("hex"),
  };

  if (metadata.status === "published") lessons.push(lesson);
  else drafts.push({ id: metadata.id, day: metadata.day, title: metadata.title });
}

if (lessons.length === 0) fail("no published lessons were found.");

lessons.sort((left, right) => right.day - left.day);
drafts.sort((left, right) => right.day - left.day);

const payload = {
  schemaVersion: 1,
  lessons,
  draftLessonIds: drafts.map((lesson) => lesson.id),
};

fs.mkdirSync(outputDirectory, { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

console.log(
  `Generated ${path.relative(projectRoot, outputPath)} with ${lessons.length} published lesson(s); excluded ${drafts.length} draft(s).`,
);
