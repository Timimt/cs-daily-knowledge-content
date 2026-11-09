import fs from "node:fs";
import path from "node:path";
import type { GitHubLessonFile } from "../services/github-content";

export type GitHubSyncRecoveryRecord = {
  jobId: number;
  lessonId: string;
  versionId: number;
  remote: GitHubLessonFile;
  recordedAt: string;
};

export interface GitHubSyncRecoveryStore {
  save(record: GitHubSyncRecoveryRecord): void;
}

export class FileGitHubSyncRecoveryStore implements GitHubSyncRecoveryStore {
  readonly directory: string;

  constructor(directory = path.join(process.cwd(), "data", "github-sync-recovery")) {
    this.directory = directory;
  }

  save(record: GitHubSyncRecoveryRecord): void {
    fs.mkdirSync(this.directory, { recursive: true });
    const target = path.join(
      this.directory,
      `job-${record.jobId}-${record.recordedAt.replaceAll(":", "-")}.json`,
    );
    const temporary = `${target}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify(record, null, 2), {
      encoding: "utf8",
      mode: 0o600,
    });
    fs.renameSync(temporary, target);
  }
}

export class MemoryGitHubSyncRecoveryStore implements GitHubSyncRecoveryStore {
  readonly records: GitHubSyncRecoveryRecord[] = [];

  save(record: GitHubSyncRecoveryRecord): void {
    this.records.push(record);
  }
}
