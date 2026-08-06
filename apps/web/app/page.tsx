"use client";

import { FormEvent, useState } from "react";
import { NorthIndianChart } from "../components/NorthIndianChart";

type Planet = { name: string; sign: string; house: number; degree: number };
type Report = {
  id: string;
  status: string;
  createdAt: string;
  subject: { name: string; birthDate: string; birthTime: string; birthPlace: string };
  calculation: { ascendant: string; moonSign: string; nakshatra: string; planets: Planet[] };
  interpretation: { summary: string; disclaimer: string };
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export default function Home() {
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      const response = await fetch(`${API_URL}/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("We could not create your report. Check the details and try again.");
      setReport(await response.json());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <nav><div className="brand"><span>✦</span> AstroAI</div><span className="nav-note">Vedic insights, grounded in calculation</span></nav>
      <section className="hero">
        <div className="eyebrow">YOUR COSMIC BLUEPRINT</div>
        <h1>A birth chart that feels<br /><em>clear, not cryptic.</em></h1>
        <p>Enter your birth details to create a deterministic Kundli, a classic North Indian chart, and a report you can keep.</p>
      </section>

      <section className="workspace">
        <form onSubmit={submit} className="card form-card">
          <div className="step">01 · BIRTH DETAILS</div>
          <h2>Tell us where your story began</h2>
          <label>Full name<input name="name" required minLength={2} placeholder="e.g. Aanya Sharma" /></label>
          <div className="row">
            <label>Date of birth<input name="birthDate" required type="date" /></label>
            <label>Exact birth time<input name="birthTime" required type="time" /></label>
          </div>
          <label>Birthplace<input name="birthPlace" required minLength={2} placeholder="e.g. Jaipur, Rajasthan, India" /></label>
          <label>Preferred language<select name="language" defaultValue="English"><option>English</option><option>Hindi</option></select></label>
          <label>Focus area<select name="focusArea" defaultValue="Overview"><option>Overview</option><option>Career</option><option>Relationships</option><option>Finance</option></select></label>
          <button disabled={loading}>{loading ? "Reading the sky…" : "Generate my Kundli"}<span>→</span></button>
          {error && <p className="error" role="alert">{error}</p>}
          <small>For reflection and entertainment. Not professional advice.</small>
        </form>

        <div className="card preview-card">
          {report ? (
            <>
              <div className="report-head"><div><div className="step">02 · YOUR CHART</div><h2>{report.subject.name}&apos;s Kundli</h2></div><span className="status">Ready</span></div>
              <NorthIndianChart planets={report.calculation.planets} ascendant={report.calculation.ascendant} />
              <div className="facts"><div><span>Ascendant</span><strong>{report.calculation.ascendant}</strong></div><div><span>Moon sign</span><strong>{report.calculation.moonSign}</strong></div><div><span>Nakshatra</span><strong>{report.calculation.nakshatra}</strong></div></div>
              <p className="summary">{report.interpretation.summary}</p>
              <a className="download" href={`${API_URL}/reports/${report.id}/html`} target="_blank" rel="noreferrer">Open printable report <span>↗</span></a>
            </>
          ) : (
            <div className="empty"><div className="orbit"><span>✦</span></div><h2>Your chart will appear here</h2><p>The calculation service uses the same inputs every time, so your chart stays consistent.</p><div className="trust"><span>✓ Deterministic calculation</span><span>✓ Download-ready report</span><span>✓ No payment required</span></div></div>
          )}
        </div>
      </section>
      <footer><span>AstroAI MVP</span><span>Calculation first. AI interpretation later.</span></footer>
    </main>
  );
}
