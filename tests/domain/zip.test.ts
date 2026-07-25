import { describe, expect, test } from "vitest";

import { createZip, listZipEntries } from "@/lib/zip";

describe("verified ZIP", () => {
  test("creates deterministic entries in manifest order", () => {
    const artifact = {
      files: [
        { path: "README.md", content: "# Agent" },
        { path: "src/index.ts", content: "export {};\n" },
      ],
      manifest: { files: ["README.md", "src/index.ts"] },
    };

    const first = createZip(artifact);
    const second = createZip(artifact);

    expect(listZipEntries(first)).toEqual(artifact.manifest.files);
    expect(first).toEqual(second);
  });

  test("rejects an artifact whose files differ from its manifest", () => {
    expect(() =>
      createZip({
        files: [{ path: "README.md", content: "# Agent" }],
        manifest: { files: ["README.md", "missing.ts"] },
      }),
    ).toThrow(/manifest/i);
  });
});
