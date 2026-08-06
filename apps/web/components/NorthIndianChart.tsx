type Planet = { name: string; sign: string; house: number; degree: number };

export function NorthIndianChart({ planets, ascendant }: { planets: Planet[]; ascendant: string }) {
  const labels = Array.from({ length: 12 }, (_, index) => {
    const items = planets.filter((planet) => planet.house === index + 1).map((planet) => planet.name.slice(0, 2)).join(" · ");
    return items || String(index + 1);
  });
  return (
    <div className="chart" aria-label={`North Indian birth chart with ${ascendant} ascendant`}>
      <div className="chart-diamond" />
      <div className="chart-line line-a" /><div className="chart-line line-b" />
      {labels.map((label, index) => <span className={`house h${index + 1}`} key={index}>{label}</span>)}
      <div className="chart-center"><small>LAGNA</small><strong>{ascendant}</strong></div>
    </div>
  );
}
