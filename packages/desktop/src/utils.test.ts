import { describe, it, expect } from "vitest";
import { getFilename } from "./utils";

describe("getFilename", () => {
  it("returns the basename of a POSIX path", () => {
    expect(getFilename("/home/jane/Pictures/IMG_0001.jpg")).toBe("IMG_0001.jpg");
  });

  it("returns the basename of a Windows path", () => {
    // Regression: previously `path.split('/').pop()` returned the whole path on
    // Windows because there is no `/` to split on.
    expect(getFilename("C:\\Users\\jane\\Pictures\\IMG_0001.JPG")).toBe(
      "IMG_0001.JPG"
    );
  });

  it("handles mixed separators", () => {
    expect(getFilename("C:/Users\\jane/IMG_2.tiff")).toBe("IMG_2.tiff");
  });

  it("returns the input unchanged when there is no separator", () => {
    expect(getFilename("IMG_3.jpg")).toBe("IMG_3.jpg");
  });
});
