import {describe,expect,it} from "vitest";
import {normalizeGabrooDisplayName} from "./gabroo-display-name";

describe("normalizeGabrooDisplayName",()=>{
  it("trims surrounding whitespace and collapses repeated spaces",()=>{
    expect(normalizeGabrooDisplayName("  Vivek   Madhavan  ")).toBe("Vivek Madhavan");
  });
  it("preserves Malayalam names and Unicode characters",()=>{
    expect(normalizeGabrooDisplayName("  വിവേക്   മാധവൻ  ")).toBe("വിവേക് മാധവൻ");
  });
  it("returns an empty string for blank input",()=>{
    expect(normalizeGabrooDisplayName(" \n\t ")).toBe("");
  });
  it("limits the name to 80 Unicode code points without splitting surrogate pairs",()=>{
    const result=normalizeGabrooDisplayName("😀".repeat(100));
    expect([...result]).toHaveLength(80);
    expect(result).toBe("😀".repeat(80));
  });
});
