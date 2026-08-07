import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { CalculationClient } from "./calculation.client";
import { CreateReportDto } from "./create-report.dto";
import { Report } from "./report.types";
import { ReportsRepository } from "./reports.repository";
import { interpretChart } from "./interpretation";

@Injectable()
export class ReportsService {
  private readonly s3 = new S3Client({});
  constructor(
    private readonly calculator: CalculationClient,
    private readonly repository: ReportsRepository,
  ) {}

  async create(subject: CreateReportDto) {
    const calculation = await this.calculator.calculate(subject);
    const report: Report = {
      id: randomUUID(),
      status: "ready",
      createdAt: new Date().toISOString(),
      expiresAt: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60,
      subject,
      calculation,
      interpretation: interpretChart(calculation, subject.focusArea),
    };
    await this.repository.save(report);
    await this.storeArtifact(report);
    return report;
  }

  async find(id: string) {
    const report = await this.repository.findById(id);
    if (!report) throw new NotFoundException("Report not found");
    return report;
  }

  async renderHtml(id: string) {
    const report = await this.find(id);
    const bucket = process.env.REPORTS_BUCKET_NAME;
    if (bucket) {
      const object = await this.s3.send(new GetObjectCommand({ Bucket: bucket, Key: this.artifactKey(id) }));
      return object.Body?.transformToString() ?? "";
    }
    return renderReport(report);
  }

  private async storeArtifact(report: Report) {
    const bucket = process.env.REPORTS_BUCKET_NAME;
    if (!bucket) return;
    await this.s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: this.artifactKey(report.id),
      Body: renderReport(report),
      ContentType: "text/html; charset=utf-8",
      ServerSideEncryption: "AES256",
    }));
  }

  private artifactKey(id: string) { return `reports/${id}/report.html`; }
}

function renderReport(report: Report) {
  const rows = report.calculation.planets.map((planet) => `<tr><td>${escapeHtml(planet.name)}${planet.retrograde ? " ℞" : ""}</td><td>${escapeHtml(planet.sign)}</td><td>${planet.house}</td><td>${planet.degree.toFixed(2)}°</td></tr>`).join("");
  const insights = report.interpretation.insights.map((insight) => `<section><h3>${escapeHtml(insight.title)}</h3><small>${escapeHtml(insight.evidence)}</small><p>${escapeHtml(insight.text)}</p></section>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(report.subject.name)} — AstroAI report</title><style>@page{size:A4;margin:20mm}body{font-family:Georgia,serif;color:#241c18;max-width:760px;margin:40px auto;line-height:1.55}h1{color:#9b442b}small{color:#756a62}table{width:100%;border-collapse:collapse;margin:24px 0}th,td{border-bottom:1px solid #dacbb8;text-align:left;padding:10px}.facts{display:flex;gap:30px;padding:16px 0;border-block:1px solid #dacbb8}.note,section{background:#f7f0e6;padding:16px;margin:12px 0}section small{color:#9b442b}button{padding:10px 16px}@media print{button{display:none}}</style></head><body><button onclick="window.print()">Print / Save as PDF</button><p>✦ ASTROAI · SIDEREAL D1 REPORT</p><h1>${escapeHtml(report.subject.name)}'s Kundli</h1><small>${escapeHtml(report.subject.birthDate)} at ${escapeHtml(report.subject.birthTime)} · ${escapeHtml(report.subject.birthPlace)} · ${escapeHtml(report.subject.timeZone)}</small><div class="facts"><p><small>ASCENDANT</small><br><b>${escapeHtml(report.calculation.ascendant)} ${report.calculation.ascendantDegree.toFixed(2)}°</b></p><p><small>MOON SIGN</small><br><b>${escapeHtml(report.calculation.moonSign)}</b></p><p><small>NAKSHATRA</small><br><b>${escapeHtml(report.calculation.nakshatra)} · Pada ${report.calculation.nakshatraPada}</b></p></div><h2>Planetary positions</h2><table><thead><tr><th>Planet</th><th>Sign</th><th>House</th><th>Degree</th></tr></thead><tbody>${rows}</tbody></table><h2>Traceable interpretation</h2><p>${escapeHtml(report.interpretation.summary)}</p>${insights}<p><b>Method:</b> ${escapeHtml(report.interpretation.methodology)}</p><p class="note"><b>Important:</b> ${escapeHtml(report.interpretation.disclaimer)}</p><small>Engine: ${escapeHtml(report.calculation.engine)} · ${escapeHtml(report.calculation.metadata.zodiac)} · ${escapeHtml(report.calculation.metadata.ayanamsa)} ayanamsa · ${escapeHtml(report.calculation.metadata.houseSystem)}</small></body></html>`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}
