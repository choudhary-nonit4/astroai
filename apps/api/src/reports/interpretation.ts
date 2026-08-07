import { Calculation, InterpretationInsight } from "./report.types";

const ASCENDANT_MEANINGS: Record<string, string> = {
  Aries: "A direct, initiating style is emphasized; progress often comes through decisive action and learning to pace intensity.",
  Taurus: "A steady, values-led style is emphasized; consistency, tangible results and patient cultivation tend to matter.",
  Gemini: "A curious, adaptive style is emphasized; communication, comparison and movement between ideas become recurring themes.",
  Cancer: "A protective, responsive style is emphasized; belonging, emotional security and stewardship often guide decisions.",
  Leo: "A visible, expressive style is emphasized; creative leadership grows when recognition is balanced with generosity.",
  Virgo: "An analytical, service-oriented style is emphasized; refinement and practical problem-solving can become central strengths.",
  Libra: "A relational, balancing style is emphasized; negotiation, aesthetics and fairness frequently shape the path forward.",
  Scorpio: "An intense, investigative style is emphasized; transformation, privacy and emotional courage are recurring motifs.",
  Sagittarius: "An exploratory, principle-led style is emphasized; meaning, teaching and broad horizons tend to motivate growth.",
  Capricorn: "A structured, accountable style is emphasized; long-range effort and earned authority can become defining themes.",
  Aquarius: "An independent, systems-oriented style is emphasized; community, reform and unconventional thinking often stand out.",
  Pisces: "An intuitive, permeable style is emphasized; imagination and compassion benefit from clear practical boundaries.",
};

const MOON_MEANINGS: Record<string, string> = {
  Aries: "Emotional responses can be quick and candid, settling best through purposeful action.",
  Taurus: "Emotional steadiness is supported by dependable routines, sensory comfort and trustworthy relationships.",
  Gemini: "Feelings are often processed through language, questions and the exchange of perspectives.",
  Cancer: "Emotional memory and attachment are pronounced, with restoration coming through safe familiar spaces.",
  Leo: "Warm expression and heartfelt recognition help the emotional life feel engaged and generous.",
  Virgo: "Emotions may be processed by analyzing, organizing or helping, while excessive self-critique needs watching.",
  Libra: "Harmony and mutual consideration support equilibrium, though difficult feelings should not be negotiated away.",
  Scorpio: "Feelings can run deep and private, inviting honesty, trust and constructive channels for intensity.",
  Sagittarius: "Emotional renewal often comes through perspective, learning, humor and room to move.",
  Capricorn: "Feelings may be contained behind responsibility, becoming easier to express where reliability is established.",
  Aquarius: "Emotions are often observed from a thoughtful distance and connected to friendship or collective concerns.",
  Pisces: "Sensitivity and imagination are strong, making rest, discernment and emotional boundaries important.",
};

const NAKSHATRA_THEMES: Record<string, string> = {
  Ashwini: "swift beginnings, restoration and initiative", Bharani: "responsibility, restraint and transformation",
  Krittika: "discernment, purification and decisive focus", Rohini: "growth, beauty and cultivation",
  Mrigashira: "searching, curiosity and gentle exploration", Ardra: "intensity, disruption and renewal",
  Punarvasu: "return, resilience and restored perspective", Pushya: "nourishment, duty and steady support",
  Ashlesha: "perception, complexity and psychological insight", Magha: "lineage, dignity and inherited responsibility",
  "Purva Phalguni": "creativity, pleasure and generative partnership", "Uttara Phalguni": "commitment, patronage and lasting agreements",
  Hasta: "skill, craft and practical manifestation", Chitra: "design, brilliance and the shaping of form",
  Swati: "independence, movement and flexible learning", Vishakha: "purpose, ambition and directed effort",
  Anuradha: "devotion, friendship and disciplined cooperation", Jyeshtha: "seniority, protection and responsible power",
  Mula: "root-cause inquiry, release and reconstruction", "Purva Ashadha": "conviction, advocacy and renewal",
  "Uttara Ashadha": "endurance, integrity and durable achievement", Shravana: "listening, learning and transmission",
  Dhanishta: "rhythm, contribution and material coordination", Shatabhisha: "healing, privacy and systems thinking",
  "Purva Bhadrapada": "intensity, ideals and inner commitment", "Uttara Bhadrapada": "depth, patience and stabilizing wisdom",
  Revati: "guidance, completion and compassionate transition",
};

const HOUSE_THEMES: Record<number, string> = {
  1: "identity and initiative", 2: "resources, speech and values", 3: "skills, courage and communication",
  4: "home, foundations and inner security", 5: "creativity, study and discernment", 6: "work, service and problem-solving",
  7: "partnership and agreements", 8: "shared resources and transformation", 9: "principles, mentors and higher learning",
  10: "career, responsibility and public contribution", 11: "networks, gains and long-term aims", 12: "retreat, release and distant horizons",
};

const PLANET_THEMES: Record<string, string> = {
  Sun: "purpose, confidence and visibility", Moon: "habits, feelings and responsiveness",
  Mars: "effort, assertion and competition", Mercury: "analysis, communication and trade",
  Jupiter: "growth, counsel and meaning", Venus: "relationship, pleasure and value",
  Saturn: "discipline, limits and long-term construction", Rahu: "amplification, appetite and unfamiliar experience",
  Ketu: "detachment, specialization and inherited familiarity",
};

const FOCUS_HOUSES: Record<string, number[]> = {
  Overview: [1, 4, 7, 10], Career: [2, 6, 10, 11], Relationships: [5, 7, 8], Finance: [2, 5, 9, 11],
};

export function interpretChart(calculation: Calculation, focusArea: string) {
  const moon = calculation.planets.find((planet) => planet.name === "Moon");
  if (!moon) throw new Error("Calculated chart does not contain the Moon");

  const insights: InterpretationInsight[] = [
    {
      title: `${calculation.ascendant} ascendant`,
      evidence: `Sidereal ascendant: ${calculation.ascendant} ${calculation.ascendantDegree.toFixed(2)}°`,
      text: ASCENDANT_MEANINGS[calculation.ascendant],
    },
    {
      title: `Moon in ${calculation.moonSign}`,
      evidence: `Moon: ${calculation.moonSign} ${moon.degree.toFixed(2)}°, ${calculation.nakshatra} pada ${calculation.nakshatraPada}, house ${moon.house}`,
      text: `${MOON_MEANINGS[calculation.moonSign]} ${calculation.nakshatra} adds a traditional theme of ${NAKSHATRA_THEMES[calculation.nakshatra]}.`,
    },
  ];

  const focusHouses = FOCUS_HOUSES[focusArea] ?? FOCUS_HOUSES.Overview;
  const focusPlanets = calculation.planets
    .filter((planet) => focusHouses.includes(planet.house) && planet.name !== "Moon")
    .slice(0, 4);

  for (const planet of focusPlanets) {
    const motion = planet.retrograde ? " Retrograde motion traditionally turns some of this process inward or makes it more iterative." : "";
    insights.push({
      title: `${planet.name} in house ${planet.house}`,
      evidence: `${planet.name}: ${planet.sign} ${planet.degree.toFixed(2)}°, whole-sign house ${planet.house}${planet.retrograde ? ", retrograde" : ""}`,
      text: `The traditional themes of ${PLANET_THEMES[planet.name]} operate through ${HOUSE_THEMES[planet.house]}.${motion}`,
    });
  }

  if (focusPlanets.length === 0) {
    insights.push({
      title: `${focusArea} house emphasis`,
      evidence: `No classical planets occupy focus houses ${focusHouses.join(", ")} in the D1 chart`,
      text: "An unoccupied house is not considered inactive; its sign and ruling planet become the next factors to assess in a deeper reading.",
    });
  }

  return {
    engine: "jyotish-rules-v1",
    summary: `${calculation.ascendant} rises in the sidereal D1 chart, while the Moon is in ${calculation.moonSign}, ${calculation.nakshatra} pada ${calculation.nakshatraPada}. The ${focusArea.toLowerCase()} reading below applies a limited, traceable set of traditional placement rules rather than generating unsupported predictions.`,
    insights,
    methodology: "Rules use the sidereal ascendant, Moon sign and nakshatra, plus planets occupying focus-related whole-sign houses. Lordships, aspects, dignities, yogas, divisional charts and dashas are not yet included.",
    disclaimer: "Astrological interpretation is a traditional belief practice and is not scientifically validated. Use this report for reflection or entertainment, not medical, legal, financial or other consequential decisions.",
  };
}
