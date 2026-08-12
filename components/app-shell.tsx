"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./auth-provider";

const nav = [
  ["/", "Tổng quan", "⌁"], ["/matches", "Trận đấu", "◫"], ["/players", "Cầu thủ", "◎"],
  ["/stats", "Nhập thống kê", "+"], ["/analysis", "Video analysis", "▷"], ["/comparison", "So sánh", "⇄"],
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const email = user?.email ?? "Tài khoản HVC";
  const initials = email.slice(0,2).toUpperCase();
  return <div className="app-shell">
    <aside className="sidebar">
      <Link href="/" className="brand"><span className="brand-mark">V</span><span>Volley<span>Metrics</span></span></Link>
      <div className="team-switch"><span className="team-badge">HV</span><div><strong>HVC Volleyball</strong><small>Mùa giải 2026</small></div><span>⌄</span></div>
      <nav>{nav.map(([href,label,icon]) => <Link key={href} href={href} className={pathname === href ? "active" : ""}><i>{icon}</i>{label}</Link>)}</nav>
      <div className="sidebar-foot"><Link href="/settings"><i>⚙</i>Cài đặt</Link><div className="user"><span>{initials}</span><div><strong title={email}>{email}</strong><small>Đã đăng nhập / Signed in</small></div></div><button className="logout-button" type="button" onClick={()=>void signOut()}>↪ Đăng xuất / Logout</button></div>
    </aside>
    <main className="main"><header className="topbar"><button className="mobile-menu">☰</button><div className="season-pill"><span></span> MÙA GIẢI 2026</div><div className="top-actions"><button aria-label="Search">⌕</button><button aria-label="Notifications">♢</button><span className="avatar" title={email}>{initials}</span></div></header>{children}</main>
    <nav className="mobile-nav">{nav.slice(0,5).map(([href,label,icon]) => <Link key={href} href={href} className={pathname === href ? "active" : ""}><i>{icon}</i><small>{label.split(" ")[0]}</small></Link>)}</nav>
  </div>;
}
