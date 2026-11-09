import { describe, expect, it } from "vitest";
import { calculateStreak, createSearchSnippet } from "../../src/server/lib/text";

describe("calculateStreak", () => {
  it("counts consecutive local calendar days", () => {
    expect(
      calculateStreak(
        [
          "2026-11-08T01:00:00.000Z",
          "2026-11-07T02:00:00.000Z",
          "2026-11-06T15:00:00.000Z",
        ],
        new Date("2026-11-08T12:00:00.000Z"),
      ),
    ).toBe(3);
  });

  it("allows the streak to end yesterday", () => {
    expect(
      calculateStreak(
        ["2026-11-07T10:00:00.000Z", "2026-11-06T10:00:00.000Z"],
        new Date("2026-11-08T12:00:00.000Z"),
      ),
    ).toBe(2);
  });

  it("returns zero when there are no read timestamps", () => {
    expect(calculateStreak([null, undefined])).toBe(0);
  });
});

describe("createSearchSnippet", () => {
  it("focuses the snippet around a matching term", () => {
    const snippet = createSearchSnippet(
      "## AES\nAES 是對稱式加密。RSA 是非對稱式加密。這段文字用來確認搜尋摘要。",
      "摘要",
      "RSA",
    );
    expect(snippet).toContain("RSA");
  });

  it("falls back to the lesson summary when no term matches", () => {
    expect(createSearchSnippet("內容", "教材摘要", "不存在")).toBe("教材摘要");
  });
});
