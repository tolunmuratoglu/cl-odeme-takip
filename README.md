# 💼 Finans Takip

**Profesyonel Gelir & Gider Yönetim Uygulaması**

Firebase Authentication + Firestore ile geliştirilmiş, kurumsal tasarımlı kişisel finans takip uygulaması. GitHub Pages üzerinde ücretsiz barındırılabilir.

---

## 🚀 Özellikler

| Özellik | Detay |
|---|---|
| 🔐 Kimlik Doğrulama | E-posta/Şifre giriş, kayıt, şifre sıfırlama |
| 📊 Dashboard | 6 özet kart, 4 grafik, son işlemler |
| 💵 Gelir Yönetimi | Tek seferlik & aylık tekrarlı gelir tanımı |
| 💸 Gider Yönetimi | Son ödeme tarihi, gecikmiş/bugün/ödendi durum renkleri |
| 🧮 Akıllı Analiz | Net kâr/zarar, tasarruf oranı, kategori analizi |
| 🔄 Tekrarlı Kayıtlar | Aylık otomatik gider/gelir üretimi |
| 🔔 Bildirimler | Yaklaşan ve gecikmiş ödeme uyarıları |
| 📁 Export | Excel (.xlsx) ve PDF çıktı |
| 🌙 Dark Mode | Tek tıkla koyu/açık tema geçişi |
| 📱 Responsive | Mobil ve desktop uyumlu |
| ⚡ Gerçek Zamanlı | Firestore onSnapshot ile anlık güncelleme |

---

## 📁 Proje Yapısı

```
finans-takip/
│
├── index.html          # Ana uygulama (login + app ekranları)
├── manifest.json       # PWA tanımı
│
├── css/
│   └── main.css        # Tüm stiller (design tokens, layout, components)
│
├── js/
│   ├── firebase.js     # Firebase config & auth listener (ES Module)
│   └── app.js          # Uygulama mantığı (CRUD, charts, export)
│
└── assets/             # İkonlar, görseller
```

---


## 🛠 Teknolojiler

| Teknoloji | Versiyon | Kullanım |
|---|---|---|
| Firebase Auth | 10.7.1 | Kimlik doğrulama |
| Firebase Firestore | 10.7.1 | Gerçek zamanlı veritabanı |
| Chart.js | 4.4.1 | Grafikler |
| jsPDF | 2.5.1 | PDF export |
| SheetJS (XLSX) | 0.18.5 | Excel export |
| Google Fonts (Sora + DM Mono) | — | Tipografi |

Harici framework kullanılmamıştır. Saf HTML/CSS/JS.



## 📄 Lisans

MIT — Kişisel ve ticari kullanım serbesttir.
