import path from "node:path";

export const esbuildScript = path.join(
  process.cwd(),
  "node_modules",
  "esbuild",
  "bin",
  "esbuild",
);

export const serverBuildDir = path.join(process.cwd(), ".server-build");

export function serverBuildArgs(entry, output) {
  return [
    entry,
    "--bundle",
    "--platform=node",
    "--format=esm",
    "--target=node24",
    "--packages=external",
    `--outfile=${output}`,
  ];
}
