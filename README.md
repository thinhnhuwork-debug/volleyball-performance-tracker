# VolleyMetrics — Volleyball Performance Tracker

Ứng dụng Next.js/TypeScript để nhập thống kê sau trận, phân tích video và theo dõi hiệu suất cầu thủ. MVP ưu tiên luồng nhập nhanh và module chuyên sâu cho chuyền 2.

## Kiến trúc

- `app/`: App Router, mỗi tính năng có route riêng.
- `components/`: app shell và các UI primitive dùng lại.
- `lib/calculations/`: công thức thuần, luôn xử lý chia cho 0.
- `lib/supabase/`: Supabase client; UI tự dùng demo data khi chưa cấu hình biến môi trường.
- `supabase/migrations/`: PostgreSQL schema, constraints, indexes và RLS.
- `supabase/seed.sql`: HVC, 6 cầu thủ, 5 trận và Setter Stats của Thịnh.

Percentage và rating là derived metrics, không ghi đè raw statistics. `Total Set Attempts = Perfect + Playable + Bad + Set Error`; `Total Touches` được lưu độc lập.

## Pages

- `/` — Team Dashboard
- `/matches`, `/matches/[id]` — danh sách và Match Dashboard
- `/players`, `/players/[id]` — bảng cầu thủ và Player/Setter Performance
- `/stats` — Post-match Statistics với validation, Save & Next Player
- `/analysis` — Video Analysis, timestamp events, undo và keyboard shortcuts
- `/comparison` — so sánh hai setter
- `/settings` — đội, mùa giải và quyền truy cập

## Chạy local

Yêu cầu Node.js 20+ và pnpm.

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Mở `http://localhost:3000`. Chạy kiểm tra:

```bash
pnpm lint
pnpm build
```

## Setup Supabase

1. Tạo project tại Supabase.
2. Mở SQL Editor và chạy `supabase/migrations/202608120001_initial_schema.sql`.
3. Bật Email/Password trong Authentication > Providers.
4. Tạo một tài khoản demo, sau đó chạy `supabase/seed.sql`; seed dùng user đầu tiên làm Owner.
5. Tạo bucket `team-assets` cho logo/avatar và bucket private `match-videos` cho video.
6. Copy Project URL và anon key vào `.env.local`. Chỉ đặt service-role key trên server; không dùng biến `NEXT_PUBLIC_` cho key này.

RLS cho phép mọi thành viên đọc dữ liệu đội; Owner/Coach/Analyst có quyền sửa. Schema đã sẵn sàng cho Player/Viewer dù MVP ưu tiên Owner và Editor (Coach/Analyst).

## Deploy Vercel

1. Push project lên GitHub/GitLab/Bitbucket và Import vào Vercel.
2. Framework Preset: Next.js; Build Command: `pnpm build`.
3. Thêm `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` và `SUPABASE_SERVICE_ROLE_KEY` trong Project Settings > Environment Variables.
4. Thêm production URL của Vercel vào Supabase Authentication > URL Configuration.
5. Deploy, sau đó kiểm tra đăng nhập và RLS bằng một Owner và một Viewer.

## Version 2

Live Match Stats, lineup/rotation tracking, rally-level automation từ events, storage upload có resumable/chunking, scouting reports, notifications, exports PDF/CSV, rating theo vị trí, multi-team organizations và offline-first mobile capture.
