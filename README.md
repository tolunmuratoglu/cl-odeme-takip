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

## ⚙️ Kurulum

### 1. Firebase Projesini Hazırlayın

**Authentication:**
1. [Firebase Console](https://console.firebase.google.com) → Projeniz
2. **Authentication** → **Sign-in method** → **Email/Password** → Etkinleştir

**Firestore:**
1. **Firestore Database** → Veritabanı oluştur
2. **Rules** sekmesine gidin, şu kuralları yapıştırın:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /incomes/{doc} {
      allow create: if request.auth != null
        && request.resource.data.uid == request.auth.uid;
      allow read, update, delete: if request.auth != null
        && resource.data.uid == request.auth.uid;
    }
    match /expenses/{doc} {
      allow create: if request.auth != null
        && request.resource.data.uid == request.auth.uid;
      allow read, update, delete: if request.auth != null
        && resource.data.uid == request.auth.uid;
    }
  }
}
```

3. **Publish** butonuna tıklayın.

### 2. Firebase Config Güncelleyin

`js/firebase.js` dosyasını açın, `firebaseConfig` nesnesini kendi proje bilgilerinizle değiştirin:

```js
const firebaseConfig = {
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID",
  measurementId:     "YOUR_MEASUREMENT_ID"
};
```

---

## 🌐 GitHub Pages ile Yayınlama

```bash
# 1. GitHub'da yeni bir repo oluşturun (örn: finans-takip)

# 2. Dosyaları yükleyin
git init
git add .
git commit -m "ilk sürüm"
git branch -M main
git remote add origin https://github.com/KULLANICI_ADIN/finans-takip.git
git push -u origin main

# 3. GitHub Pages'i açın:
# Repo → Settings → Pages → Branch: main → / (root) → Save
```

Birkaç dakika içinde siteniz şu adreste yayında olacak:
`https://KULLANICI_ADIN.github.io/finans-takip`

### ⚠️ Önemli: Firebase Authorized Domain

GitHub Pages adresi Firebase'e eklenmeli:
1. Firebase Console → **Authentication** → **Settings** → **Authorized domains**
2. `KULLANICI_ADIN.github.io` adresini ekleyin → **Add**

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

---

## 🔒 Güvenlik

- Her kullanıcı yalnızca kendi verisini görebilir (`uid` bazlı izolasyon)
- Firestore Security Rules ile sunucu tarafında doğrulama
- API Key'i `.env` dosyasında saklamak gerekmez — Firebase web config public olarak kullanılabilir, güvenlik Rules ile sağlanır

---

## 📄 Lisans

MIT — Kişisel ve ticari kullanım serbesttir.
