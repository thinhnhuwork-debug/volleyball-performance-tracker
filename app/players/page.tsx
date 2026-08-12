import Link from "next/link";
import { AppShell } from "../../components/app-shell";
import { Avatar, PageHeader, Progress } from "../../components/ui";
import { players, setterTrend } from "../../lib/demo-data";
import { settingAccuracy } from "../../lib/calculations/volleyball";

const positionVi: Record<string,string> = {"Setter":"Chuyền 2","Outside Hitter":"Chủ công","Opposite":"Đối chuyền","Middle Blocker":"Phụ công","Libero":"Libero","Defensive Specialist":"Chuyên gia phòng thủ"};

const values = [
  {matches:5,points:18,kills:2,kill:"33.3%",ace:4,block:1,dig:24,assist:132,error:8,rating:8.7},
  {matches:5,points:92,kills:76,kill:"52.8%",ace:9,block:7,dig:31,assist:2,error:14,rating:8.9},
  {matches:5,points:47,kills:27,kill:"61.4%",ace:2,block:18,dig:9,assist:1,error:7,rating:8.6},
  {matches:5,points:74,kills:61,kill:"49.2%",ace:7,block:6,dig:22,assist:1,error:15,rating:8.3},
  {matches:5,points:3,kills:0,kill:"—",ace:3,block:0,dig:68,assist:8,error:6,rating:8.5},
  {matches:5,points:69,kills:58,kill:"47.5%",ace:6,block:5,dig:28,assist:1,error:13,rating:8.1},
];
export default function PlayersPage(){return <AppShell><div className="page"><PageHeader eyebrow="ĐỘI HÌNH / ROSTER" title="Cầu thủ" description="Hiệu suất tổng hợp của HVC Volleyball Club trong mùa giải 2026." action={<button className="primary-btn">＋ Thêm cầu thủ</button>}/><div className="toolbar"><div className="search"><input placeholder="Tìm theo tên hoặc số áo…"/></div><select className="filter-select"><option>Tất cả vị trí / All positions</option></select><select className="filter-select"><option>Mùa giải 2026</option></select></div><table className="data-table"><thead><tr><th>CẦU THỦ / PLAYER</th><th>VỊ TRÍ / POSITION</th><th>TRẬN / MATCHES</th><th>ĐIỂM / POINTS</th><th>GHI ĐIỂM TẤN CÔNG / KILLS</th><th>TỶ LỆ GHI ĐIỂM / KILL %</th><th>PHÁT ĂN ĐIỂM / ACE</th><th>CHẮN BÓNG / BLOCK</th><th>CỨU BÓNG / DIG</th><th>KIẾN TẠO / ASSIST</th><th>LỖI / ERROR</th><th>ĐÁNH GIÁ / RATING</th></tr></thead><tbody>{players.map((p,i)=><tr key={p.id}><td><Link href={`/players/${p.id}`} className="player-cell"><Avatar initials={p.initials} color={p.color} size="sm"/><div><strong>#{p.number} {p.name}</strong><small>HVC Volleyball</small></div></Link></td><td><span className="position-tag">{positionVi[p.position]} / {p.position}</span></td><td>{values[i].matches}</td><td><b>{values[i].points}</b></td><td>{values[i].kills}</td><td>{values[i].kill}</td><td>{values[i].ace}</td><td>{values[i].block}</td><td>{values[i].dig}</td><td>{values[i].assist}</td><td>{values[i].error}</td><td><b>{values[i].rating}</b></td></tr>)}</tbody></table><div className="stats-glossary"><b>Chú thích nhanh / Quick glossary:</b><span><strong>Kill:</strong> Điểm tấn công</span><span><strong>Ace:</strong> Phát bóng ăn điểm trực tiếp</span><span><strong>Block:</strong> Chắn bóng ghi điểm</span><span><strong>Dig:</strong> Cứu bóng phòng thủ</span><span><strong>Assist:</strong> Chuyền kiến tạo dẫn đến điểm</span><span><strong>Error:</strong> Lỗi trực tiếp</span></div><div className="panel" style={{marginTop:14}}><div className="panel-head"><div><h2>Chuyền 2 nổi bật / Setter Spotlight</h2><p>Thịnh #17 · 5 trận gần nhất</p></div><Link href="/players/thinh">Xem hồ sơ →</Link></div><div style={{marginTop:16}}><Progress value={settingAccuracy(setterTrend[4])}/></div></div></div></AppShell>}
