# 🗺️ Opinion – Location Based Feedback Platform

Kullanıcıların harita üzerinde pin bırakıp, o konumla ilgili fikirlerini (yorumlarını) paylaşabildiği basit sosyal platform.

---

## 🎯 Amaç
- Kullanıcılar harita üzerinde istedikleri noktaya **pin** bırakabilir.
- Pin oluştururken mutlaka **yorum** yazmaları gerekir. (Yorum yazmadan çıkarsa pin oluşmaz.)
- Diğer kullanıcılar pinlere tıklayarak **yorumları görebilir** ve **like / dislike** verebilir.
- Harita açıldığında tüm pinler görünmez; **cluster (kümeleme)** yapısı kullanılır. Yaklaştıkça pinler çözülerek tek tek görünür.

---

## 🏗️ Tech Stack

### Frontend
- **Next.js (React)**
- **TailwindCSS** (UI tasarımı)
- **Mapbox GL JS** (Harita ve clustering)
- **JWT Auth (client-side session management)**

### Backend
- **Supabase (PostgreSQL + PostGIS)** → Database
- **Supabase REST API / RPC** (veya custom Next.js API routes)
- **Custom Auth (username + password)**  
  - İki opsiyon:
    1. Supabase Auth hack: `username -> email format` (ör. `hakan@opinion.local`)
    2. Custom Auth: `users` tablosu + `bcrypt` + `jsonwebtoken`

### Deployment
- **Frontend & API** → Vercel
- **Database** → Supabase Cloud

---

## 🗄️ Database Schema

```sql
-- Kullanıcılar
create table users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  password text not null, -- hashlenmiş şifre
  created_at timestamp default now()
);

-- Pinler
create table pins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  lat double precision not null,
  lng double precision not null,
  created_at timestamp default now()
);

-- Yorumlar
create table comments (
  id uuid primary key default gen_random_uuid(),
  pin_id uuid references pins(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  text text not null,
  created_at timestamp default now()
);

-- Like / Dislike
create table comment_votes (
  id uuid primary key default gen_random_uuid(),
  comment_id uuid references comments(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  value smallint not null check (value in (-1, 1)),
  created_at timestamp default now(),
  unique (comment_id, user_id)
);
```

---

## 🔐 Auth Akışı
- **Register:** username + password al, şifreyi `bcrypt` ile hashle, DB’ye kaydet.
- **Login:** username + password doğrula → `JWT` üret.
- **Session:** Client tarafında JWT tutulur, API isteklerinde `Authorization: Bearer <token>` header ile gönderilir.

---

## 🌍 Harita Özellikleri
- **Cluster View:**  
  - Mapbox’un **cluster** özelliği kullanılacak.  
  - Zoom out seviyesinde → “X pins” şeklinde cluster görünür.  
  - Yaklaştıkça cluster çözülür ve pinler tek tek görünür.

- **Pin Ekleme:**  
  - Kullanıcı haritaya uzun basar → geçici marker eklenir.  
  - Yorum yazarsa pin + yorum DB’ye kaydedilir.  
  - Yorum yazmadan kapatırsa pin eklenmez.

- **Pin Hover / Click:**  
  - Hover veya click → popup açılır, o pin’e ait yorumlar listelenir.  
  - İlk 1-2 yorum gösterilir, “daha fazla” ile tüm yorumlar açılır.
  - Yorumlarda like / dislike oylama yapılabilir.

---

## 📡 API Routes (Next.js)

- `POST /api/auth/register` → yeni kullanıcı oluştur  
- `POST /api/auth/login` → giriş yap, JWT üret  
- `POST /api/pin` → yeni pin ekle  
- `POST /api/comment` → pin’e yorum ekle  
- `POST /api/comment/vote` → yorum için like/dislike  
- `GET /api/pins?bbox=...` → görünen harita kutusundaki pinleri getir (cluster mantığıyla)  
- `GET /api/comments?pin_id=...` → belirli pin’in yorumlarını getir  

---

## ✅ MVP Checklist
- [ ] Kullanıcı kayıt / giriş (username + password)  
- [ ] Harita entegrasyonu (Mapbox)  
- [ ] Pin ekleme (uzun basma ile)  
- [ ] Yorum ekleme (zorunlu)  
- [ ] Cluster görünüm  
- [ ] Pin hover → yorum popup  
- [ ] Like / dislike yorumlar  

---

## 🚀 Gelecek Özellikler (Opsiyonel)
- Kullanıcı profilleri (kendi yorumları, pinleri)  
- Popüler pinler (like sayısına göre sıralama)  
- Fotoğraf ekleme (Supabase Storage)  
- Mobil uygulama (React Native + Expo)  
