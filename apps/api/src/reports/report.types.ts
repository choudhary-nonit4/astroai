import { CreateReportDto } from "./create-report.dto";

export type Planet = { name: string; sign: string; house: number; degree: number };
export type Calculation = {
  engine?: string;
  ascendant: string;
  moonSign: string;
  nakshatra: string;
  planets: Planet[];
};
export type Report = {
  id: string;
  status: string;
  createdAt: string;
  expiresAt?: number;
  subject: CreateReportDto;
  calculation: Calculation;
  interpretation: { summary: string; disclaimer: string };
};
