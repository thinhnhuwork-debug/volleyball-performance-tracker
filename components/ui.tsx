export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description: string; action?: React.ReactNode }) {
  return <div className="page-head"><div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h1>{title}</h1><p>{description}</p></div>{action}</div>;
}
export function MetricCard({ label, value, detail, tone = "purple" }: { label: string; value: string | number; detail: string; tone?: string }) {
  return <article className={`metric-card ${tone}`}><span className="metric-icon">◆</span><div><small>{label}</small><strong>{value}</strong><p>{detail}</p></div></article>;
}
export function Avatar({ initials, color, size = "md" }: { initials: string; color: string; size?: "sm" | "md" | "lg" }) {
  return <span className={`player-avatar ${size}`} style={{ background: color }}>{initials}</span>;
}
export function Progress({ value, color = "#7257ff" }: { value: number; color?: string }) {
  return <span className="progress"><i style={{ width: `${Math.min(value, 100)}%`, background: color }} /></span>;
}
