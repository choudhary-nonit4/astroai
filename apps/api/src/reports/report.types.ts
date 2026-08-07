import { CreateReportDto } from "./create-report.dto";

export type Planet = {
  name: string;
  longitude: number;
  sign: string;
  house: number;
  degree: number;
  retrograde: boolean;
  speed: number;
};
export type Calculation = {
  engine: string;
  birthTimeUtc: string;
  ascendant: string;
  ascendantDegree: number;
  moonSign: string;
  nakshatra: string;
  nakshatraPada: number;
  planets: Planet[];
  metadata: {
    zodiac: string;
    ayanamsa: string;
    ephemeris: string;
    houseSystem: string;
    nodeType: string;
    timeZone: string;
  };
};
export type InterpretationInsight = { title: string; evidence: string; text: string };
export type Report = {
  id: string;
  status: string;
  createdAt: string;
  expiresAt?: number;
  subject: CreateReportDto;
  calculation: Calculation;
  interpretation: {
    engine: string;
    summary: string;
    insights: InterpretationInsight[];
    methodology: string;
    disclaimer: string;
  };
};
