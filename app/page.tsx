import Link from "next/link";
import { AppShell } from "../components/app-shell";
import { Avatar, MetricCard, PageHeader, Progress } from "../components/ui";
import { matches, players, setterTrend } from "../lib/demo-data";
import { formatPercent, settingAccuracy } from "../lib/calculations/volleyball";

export default function DashboardPage() {
  const wins = matches.filter(m => m.result === "W").length;
  const totals = matches.reduce((a,m) => ({ kills:a.kills+m.kills, aces:a.aces+m.aces, blocks:a.blocks+m.blocks, errors:a.errors+m.errors }), { kills:0, aces:0, blocks:0, errors:0 });
  const thinh = players[0];
  return <AppShell><div className="page">
    <PageHeader eyebrow="HVC VOLLEYBALL CLUB" title="Tổng quan hiệu suất" description="Theo dõi phong độ đội và những chỉ số quan trọng trong mùa giải 2026." action={<Link className="primary-btn" href="/stats">＋ Nhập thống kê</Link>} />
    <section className="metrics-grid">
      <MetricCard label="TỔNG SỐ TRẬN" value={matches.length} detail="Hanoi Open · 2026" />
      <MetricCard label="TRẬN THẮNG" value={wins} detail="2 trận thắng liên tiếp" tone="green" />
      <MetricCard label="TỶ LỆ THẮNG / WIN RATE" value={`${Math.round(wins/matches.length*100)}%`} detail="↑ 8% so với tháng trước" tone="blue" />
      <MetricCard label="TỶ SỐ HIỆP / SET SCORE" value="12–8" detail="Chênh lệch +4 hiệp" tone="orange" />
    </section>
    <section className="dashboard-grid">
      <article className="panel performance-panel"><div className="panel-head"><div><h2>Hiệu suất đội</h2><p>5 trận gần nhất</p></div><select><option>5 trận gần nhất</option></select></div>
        <div className="chart-legend"><span><i className="kill-dot"/> Điểm tấn công / Kill</span><span><i className="error-dot"/> Lỗi / Error</span></div>
        <div className="bar-chart">{matches.slice().reverse().map(m => <div className="bar-group" key={m.id}><div className="bars"><i className="kill-bar" style={{height:`${m.kills*2}px`}}/><i className="error-bar" style={{height:`${m.errors*2}px`}}/></div><small>{m.opponent.split(" ")[0]}</small></div>)}</div>
      </article>
      <article className="panel recent-panel"><div className="panel-head"><div><h2>Kết quả gần đây</h2><p>Hanoi Open · 2026</p></div><Link href="/matches">Xem tất cả →</Link></div>
        {matches.slice(0,4).map(m => <Link href={`/matches/${m.id}`} className="match-row" key={m.id}><span className={`result ${m.result.toLowerCase()}`}>{m.result}</span><div><strong>vs {m.opponent}</strong><small>{m.date} · {m.competition}</small></div><b>{m.score}</b></Link>)}
      </article>
    </section>
    <section className="section-title"><div><h2>Đội hình nổi bật</h2><p>Top performers qua 5 trận gần nhất</p></div><Link href="/players">Xem bảng cầu thủ →</Link></section>
    <section className="leaders-grid">
      {[{p:players[1],label:"TOP SCORER",value:"92",unit:"điểm",sub:"4.6 điểm/set"},{p:players[5],label:"TOP ATTACKER",value:"52.8%",unit:"kill rate",sub:"76 kills / 144 attempts"},{p:players[2],label:"TOP BLOCKER",value:"18",unit:"blocks",sub:"0.9 block/set"}].map(x => <article className="leader-card" key={x.label}><span className="leader-label">{x.label}</span><Avatar initials={x.p.initials} color={x.p.color}/><div className="leader-name"><strong>#{x.p.number} {x.p.name}</strong><small>{x.p.position}</small></div><div className="leader-value"><b>{x.value}</b><span>{x.unit}</span></div><Progress value={x.label === "TOP ATTACKER" ? 53 : 72} color={x.p.color}/><small>{x.sub}</small></article>)}
      <article className="leader-card setter-card"><span className="leader-label">TOP SETTER</span><Avatar initials={thinh.initials} color={thinh.color}/><div className="leader-name"><strong>#{thinh.number} {thinh.name}</strong><small>{thinh.position}</small></div><div className="leader-value"><b>{formatPercent(settingAccuracy(setterTrend[4]))}</b><span>accuracy</span></div><Progress value={settingAccuracy(setterTrend[4])}/><small>28 assists · 3 set errors</small></article>
    </section>
    <section className="quick-stats"><div><small>KILLS</small><b>{totals.kills}</b></div><div><small>ACES</small><b>{totals.aces}</b></div><div><small>BLOCKS</small><b>{totals.blocks}</b></div><div><small>ERRORS</small><b>{totals.errors}</b></div></section>
  </div></AppShell>;
}
