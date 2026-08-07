import { interpretChart } from "./interpretation";
import { Calculation } from "./report.types";

const calculation: Calculation = {
  engine: "swiss-ephemeris-moshier-v1",
  birthTimeUtc: "1994-10-12T03:15:00+00:00",
  ascendant: "Scorpio",
  ascendantDegree: 12.34,
  moonSign: "Sagittarius",
  nakshatra: "Mula",
  nakshatraPada: 2,
  metadata: {
    zodiac: "Sidereal",
    ayanamsa: "Lahiri",
    ephemeris: "Moshier",
    houseSystem: "Whole sign",
    nodeType: "True lunar node",
    timeZone: "Asia/Kolkata",
  },
  planets: [
    { name: "Moon", longitude: 245, sign: "Sagittarius", house: 2, degree: 5, retrograde: false, speed: 12 },
    { name: "Sun", longitude: 175, sign: "Virgo", house: 11, degree: 25, retrograde: false, speed: 1 },
    { name: "Saturn", longitude: 310, sign: "Aquarius", house: 4, degree: 10, retrograde: true, speed: -0.04 },
  ],
};

describe("interpretChart", () => {
  it("creates traceable focus insights without claiming unsupported techniques", () => {
    const interpretation = interpretChart(calculation, "Finance");

    expect(interpretation.engine).toBe("jyotish-rules-v1");
    expect(interpretation.summary).toContain("Mula pada 2");
    expect(interpretation.insights.some((insight) => insight.evidence.includes("Moon: Sagittarius 5.00°"))).toBe(true);
    expect(interpretation.insights.some((insight) => insight.evidence.includes("Sun: Virgo 25.00°"))).toBe(true);
    expect(interpretation.methodology).toContain("not yet included");
  });
});
