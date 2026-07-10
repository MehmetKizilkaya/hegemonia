# Hegemonia — Master Oyun Tasarım Dokümanı (GDD v1.0)

**Belge türü:** Oyun Anayasası / Üretim Master Plan  
**Versiyon:** 1.0  
**Son güncelleme:** 2026  
**Hazırlayan rol:** Lead Game Designer & Systems Architect  
**Platform:** Tarayıcı (mobil öncelikli responsive web)  
**Tema:** Türkiye haritası (81 il, SVG) üzerinde oyuncu-odaklı ekonomi · siyaset · savaş MMO  
**Gelir modeli:** Aylık abonelik (Premium) + kozmetik mağaza (güç satılmaz)  
**Zaman modeli:** Hibrit — ekonomi/maaş/üretim tick-based (saatlik); savaş anlık ama enerji ve kaynak tüketimiyle sınırlı  
**Temel ilke:** Sıfır NPC kaynağı. Her kaynak, her koltuk, her kuruş bir oyuncudan gelir ve bir oyuncuya gider.

---

## İçindekiler

1. [Executive Summary](#0-executive-summary)
2. [Vizyon ve Bağımlılık Psikolojisi](#1-oyunun-vizyonu-ve-bağımlılık-psikolojisi)
3. [Temel Oyun Döngüsü](#2-temel-oyun-döngüsü-core-loop)
4. [Kapalı Ekonomi Sistemi](#3-devrasa-ve-kapalı-ekonomi-sistemi)
5. [Harita, Siyaset ve Savaş](#4-harita-siyaset-ve-savaş)
6. [Teknik Mimari](#5-teknik-mimari-ve-veritabanı-altyapısı)
7. [Veteran Ek Bölümler](#6-veteran-ek-bölümler)
8. [MVP Kapsam](#7-mvp-kapsam-sınırı)
9. [Ek A: Formül Sözlüğü](#ek-a-formül-sözlüğü)
10. [Ek B: Onboarding Hikâyeleri](#ek-b-onboarding-hikâyeleri-persona-bazlı)
11. [Ek C: API ve Event Taslağı](#ek-c-mvp-api-endpoint-ve-event-şeması)
12. [Ek D: Live Ops, KPI ve Moderasyon](#ek-d-live-ops-kpi-ve-moderasyon)

---

## 0. EXECUTIVE SUMMARY

Hegemonia, **sonsuza açık bir güç simülasyonu**dur. Oyuncular işçi, patron, tüccar, siyasetçi veya asker olarak birbirine muhtaç roller üstlenir. Kazanma koşulu yoktur; **sürdürülebilir nüfuz, servet ve miras** vardır. Oyun, gerçek bir kapalı ekonomideki arz-talep, siyasi kırılganlık ve savaş lojistiğini simüle eder.

Teknik olarak PostgreSQL finansal gerçeklik kaynağıdır; Firebase yalnızca kimlik, sohbet ve anlık bildirim katmanıdır; Node.js tüm kural motorunu çalıştırır. Frontend React 19 + Vite ile SVG harita ve mobil öncelikli arayüz sunar.

**Retention özeti:** Oyuncu her gün geri döner çünkü dünkü yatırımı (fabrika, stok, siyasi pozisyon, ittifak borcu) gerçek insanlardan oluşan bir ekosistemde erir veya büyür — ve bunu kaçırmak servet ve nüfuz kaybıdır.

### Tasarım Kararları Özeti

| Karar | Seçim | Gerekçe |
|-------|-------|---------|
| Monetizasyon | Aylık abonelik + kozmetik | Stabil gelir, pay-to-win yok |
| Tempo | Hibrit tick + anlık savaş | Strateji derinliği + anlık heyecan |
| NPC | Yok | Gerçek kapalı ekonomi |
| Harita | 81 il SVG Türkiye | Bölgesel kimlik ve coğrafi strateji |
| Stack | React + Fastify + PostgreSQL + Firebase | Ölçeklenebilir, düşük operasyon maliyeti |

---

## 1. OYUNUN VİZYONU VE BAĞIMLILIK PSİKOLOJİSİ

### 1.1 Vizyon Cümlesi

> *"Türkiye'nin her ili bir oyuncu imparatorluğunun başlangıcıdır; imparatorluklar insanlardan ibarettir ve hiçbiri sonsuza kadar güvende değildir."*

### 1.2 Hedef Oyuncu Profili

| Persona | Yaş | Motivasyon | Oyun içi rol |
|---------|-----|------------|--------------|
| Stratejist | 25–40 | Kontrol, planlama | Patron / Siyasetçi |
| Sosyal lider | 18–35 | Topluluk, etki | Parti lideri / Sendika |
| Rekabetçi | 16–30 | Zafer, statü | Asker / Tüccar |
| Casual | 20–45 | Günlük rutin, ilerleme | İşçi → küçük patron |

**Neden bu segmentasyon:** Her persona farklı psikolojik tetikleyiciye yanıt verir; hepsi aynı kapalı döngüde birbirine muhtaçtır.

### 1.3 Neden Eskimeyecek? (End-Game Yok İlkesi)

| Geleneksel MMO Sonu | Hegemonia Karşılığı |
|---------------------|---------------------|
| Max level | **Nüfuz skoru** (çok boyutlu, sıfır toplamlı değil) |
| Raid clear | **Bölgesel hegemonya** (devredilebilir, kaybedilebilir) |
| Gear cap | **Üretim zinciri derinliği** (oyuncular yeni tier açar) |
| Story complete | **Siyasi dram** (seçimler, ittifaklar — içerik oyuncudan) |

**Neden bu mekaniği seçtik:** Sonsuz içerik üretmek yerine, **insanlar arası çatışma ve karşılıklı bağımlılık** içerik fabrikasıdır. EVE Online ve Politics & War öğretisi: "End-game" oyuncunun sisteme hakim olduğu andır; Hegemonia'da hakimiyet **geçicidir** çünkü koalisyonlar, enflasyon ve yeni oyuncu dalgaları dengeyi sürekli bozar.

**End-game yok ilkesinin 4 sütunu:**

1. **Sıfır toplamlı siyaset:** Bir ilde vali olmak, başka bir ilde muhalefet doğurur.
2. **Kapalı ekonomi:** Sistem para basmaz; zenginlik transfer edilir, yaratılmaz.
3. **Miras sistemi:** Ölümcül ceza yok ama iflas, sürgün, mülk el koyma kalıcı hikâye yaratır.
4. **Meta-evrim:** Oyuncular yeni yasa tipleri, ticaret anlaşmaları ve ittifak şartları icat eder.

### 1.4 Psikolojik Tetikleyiciler (Etik Bağımlılık Tasarımı)

Bağımlılık hedefimiz **kumar bağımlılığı değil**, **sosyal yatırım bağımlılığıdır**.

#### A) Yatırımın Korunması (Loss Aversion)

- Fabrika, stok, siyasi koltuk, ittifak anlaşması gerçek zamanlı risk altında.
- Oyuncu offline olsa bile: maaş ödenir, savaş hasarı işler, seçim sayacı döner.
- **Günlük kontrol ritüeli:** "5 dakikalık devlet turu" — maaş, üretim, savaş, meclis oylaması.
- *Neden:* Kayıp korkusu kazanç umudundan güçlüdür (Kahneman). Offline idle reward değil, **offline risk** tercih edilir.

#### B) Sosyal Zorunluluk (Reciprocity Debt)

- İşçi patrona, patron işçiye, tüccar üreticiye, milletvekili seçmene muhtaç.
- Parti / sendika / holding yapıları mekanik borç taşır (maaş sözleşmesi, tedarik sözleşmesi, savunma paktı).
- *Neden:* Sosyal bağ koparılırsa ekonomik verimlilik düşer.

#### C) FOMO (Sınırlı ve Adil)

- Seçim pencereleri (72 saat), savaş pencereleri (enerji dolunca), meclis oylamaları (24 saat).
- FOMO güç satın alma ile değil, takvim ile sınırlanır.
- Abonelik FOMO yaratmaz; analitik, kozmetik ve kuyruk önceliği verir.
- *Neden:* Zaman penceresi, pay-to-win olmadan geri dönüş sebebi yaratır.

#### D) Kimlik ve Statü

- Unvanlar: "Ankara'nın Patronu", "Ege'nin Tüccarı", "Meclis Başkanı".
- Görünür miras: İl profilinde son 10 siyasi olay, en büyük fabrikalar, savaş tarihi.
- *Neden:* Statü kaybedilebilir olduğunda koruma motivasyonu doğar.

#### E) Ustalık Eğrisi (Mastery)

- Ekonomi ustası ≠ savaş ustası ≠ siyaset ustası.
- Çoklu rol mümkün ama derinleşme verimlilik bonusu verir (ham güç değil).
- *Neden:* Yeni sistemler öğrenmek yıllar sürer — evergreen'in motorudur.

**Bölüm 1 Retention özeti:** Hegemonia, kaybedilebilir insan yatırımları üzerine kurulu olduğu için oyuncu her gün sistemi kontrol etmeden uyuyamaz — çünkü sistem onun yerine düşmanı ödüllendirmez, ama piyasa ve rakipler ödüllendirir.

---

## 2. TEMEL OYUN DÖNGÜSÜ (CORE LOOP)

### 2.1 Makro Döngü

```
Çalış (vardiya) → Kazan (maaş) → Üret (fabrika) → Ticaret (pazar)
→ Yatır (fabrika/parti) → Siyaset (seçim/yasa) → Savaş (fetih)
→ Yeni kaynak bölgesi → Çalış...
```

### 2.2 Mikro Döngü (5–15 dakika)

```
Giriş → Enerji/Vardiya kontrolü → Eylem seç (çalış / üret / ticaret / oy / saldır)
→ Sonuç geri bildirimi → Sosyal kanal → "Bir şey daha" tetikleyicisi
```

**Eylem ekonomisi:**

| Eylem | Enerji | Süre | Çıktı |
|-------|--------|------|-------|
| Vardiya (işçi) | 2 | Anlık | Maaş + XP + iş gücü puanı |
| Üretim emri başlat | 1 | Tick | Hammadde → ürün |
| Pazar işlemi | 0 | Anlık | Para transferi |
| Meclis oyu | 0 | Anlık | Siyasi etki |
| Savaş saldırısı | 3 | Anlık | Hasar + cephane tüketimi |

**Neden enerji:** Sınırsız tıklama bot cenneti ve enflasyon yaratır. Enerji günlük tempo belirler (max 20, +1/saat).

### 2.3 İlk 1 Saat (Onboarding)

| Dakika | Deneyim | Sistem hedefi |
|--------|---------|---------------|
| 0–5 | İl seçimi (SVG), lore, kayıt | Coğrafi kimlik |
| 5–15 | Mentor fabrikasına başvuru, ilk vardiya | Sosyal bağ |
| 15–30 | İlk maaş → pazar → 1 hammadde | Para döngüsü |
| 30–45 | Parti katılımı veya üretim ortaklığı | Rol seçimi |
| 45–60 | Seçim/savaş spectator | Canlı dünya |

**Starter çözümü (sıfır NPC):**

- Sistem para basmaz ("yeni vatandaş hibesi" yok).
- **Mentor sistemi:** Patronlar çırak kabul eder; mentor vergi indirimi + XP alır; çırak bonusu patronun cebinden ödenir.
- **İlk hafta koruma kalkanı:** Saldırıya uğrayamaz, üretim/ticaret yapabilir.

### 2.4 İlk 1 Hafta

| Gün | Hedef | Kilometre taşı |
|-----|-------|----------------|
| 1–2 | İstikrarlı gelir | 7 vardiya, 1 patron |
| 3–4 | Üretim zinciri | 1 üretim emri tamamlama |
| 5 | Sosyal yapı | Parti/sendika |
| 6–7 | Bölgesel olay | Seçim oyu veya savaş lojistiği |

**Haftalık ritim:**

- Pazartesi: Maaş baskısı
- Çarşamba: Meclis oylama
- Cuma: Pazar fiyat baskısı
- Pazar: Seçim / savaş prime time

### 2.5 İlk 1 Ay

- **Hafta 2:** Fabrika ortaklığı veya mikro fabrika (oyuncu bankası kredisi)
- **Hafta 3:** Bölgesel ticaret hattı (nakliye sink)
- **Hafta 4:** Siyasi pozisyon veya savaş lojistiği liderliği

### 2.6 Oyuncu Arketipleri

| Arketip | Motivasyon | Bağımlı olduğu | Verdiği değer |
|---------|------------|----------------|---------------|
| İşçi | Güvenli gelir | Patron | Emek, üretim hızı |
| Patron | Kâr marjı | İşçi, tüccar, siyasetçi | Ürün, istihdam |
| Tüccar | Arbitraj | Üretici, alıcı | Likidite, fiyat keşfi |
| Siyasetçi | Nüfuz | Seçmen, patron | Vergi, yasa, savaş |
| Asker | Ganimet/statü | Patron, devlet | Savunma, fetih |

**Kusursuz işleyiş kuralı:** Hiçbir rol tek başına tüm döngüyü kapatabilir.

**Bölüm 2 Retention özeti:** İlk saatten itibaren oyuncu bir insanın emeğine veya parasının bir parçasına dokunur; bu bağ koparılamaz hale geldiğinde oyun terk edilmez.

---

## 3. DEVRASA VE KAPALI EKONOMİ SİSTEMİ

### 3.1 Altın Kural: Sıfır NPC, Sıfır Mint

- Başlangıç parası yok (mentor transferi hariç).
- Ürün yok (oyuncu üretir).
- Sistem aracı + sink + vergi toplayıcıdır.
- PostgreSQL `ledger_entries` append-only: her kuruşun izi.

### 3.2 Para Kaynakları (Faucets)

| Kaynak | Açıklama |
|--------|----------|
| Maaş | Patron → işçi |
| Ticaret kârı | Oyuncu → oyuncu |
| Savaş ganimeti | Mağlup kasasından transfer |
| Kredi geri ödemesi | Faiz dahil |
| Siyasi ceza | Oyuncu → devlet kasası |

"Devlet kasası" meclis kontrolünde harcanır — o da oyuncu organıdır.

### 3.3 Para Sink'leri

| Sink | Oran/Tetik |
|------|------------|
| İşlem vergisi | Pazar %3–7 |
| Fabrika bakımı | Günlük sabit + seviye |
| Maaş bordrosu vergisi | Patron öder |
| Savaş cephane tüketimi | Saldırı başına |
| Nakliye ücreti | İller arası |
| Parti kurma / seçim | Tek seferlik yüksek |
| İflas tasfiyesi | Varlıkların %20'si yakılır |
| Pazar listeleme ücreti | Spam önleme |

### 3.4 Üretim Zincirleri

**Tier 0 — Hammadde:** Demir cevheri, buğday, petrol, kereste  
**Tier 1 — Yarı mamul:** Çelik, un, yakıt, kereste plaka  
**Tier 2 — Mamul:** Silah, gıda, cephane, inşaat malzemesi  
**Tier 3 — Stratejik:** Tank parçası, füze bileşeni (çoklu il koordinasyonu)

**Fabrika mekaniği:**

- Kurulum maliyeti (sink)
- İşçi slotları: üretim hızı = `base × ln(1 + workers)` (logaritmik, spam önleme)
- Üretim emri: hammadde kilidi → tick tamamlanınca çıktı
- Envanter limiti (Premium: +%20 depo)

**Bölgesel bonuslar:**

| Bölge | Bonus |
|-------|-------|
| Karadeniz | Kereste +%15 |
| Güneydoğu | Petrol +%10 |
| İç Anadolu | Buğday +%15 |
| Marmara | Fabrika bakım -%5 |

### 3.5 İşçi ve Maaş Sistemi

- İş ilanı: patron fiyat + süre + enerji şartı yazar.
- Escrow: patron nakit kilitleir.
- Vardiya: işçi enerji harcar → anlık maaş + iş gücü puanı.
- Grev: sendika grev ilanı → fabrika %50 verim.

**Saatlik tick:** maaş dağıtımı, bakım, vergi, enerji regen (+1, max 20).

### 3.6 Pazar ve Fiyat Motoru

- Order book lite (limit order)
- Referans fiyat: son 24 saat hacim ağırlıklı ortalama
- Manipülasyon koruması: tek oyuncu hacim >%30 → sapma sınırlanır
- İl pazarı vs ulusal pazar: nakliye maliyeti arbitraj yaratır

### 3.7 Kredi ve İflas

- Oyuncu bankası = oyuncu kurulu organizasyon
- Kredi: teminat + faiz (sink)
- İflas: açık artırma → gelirin %20'si yakılır

**Bölüm 3 Retention özeti:** Kapalı ekonomide her gün piyasa farklıdır; dünkü zenginlik garanti değildir — bu belirsizlik her login'i anlamlı kılar.

---

## 4. HARİTA, SİYASET VE SAVAŞ

### 4.1 Harita UX

- SVG path per il (`TR-01` … `TR-81`)
- Tıklanabilir il → detay panel
- Renk: parti kontrolü / savaş / tarafsız
- Mobil: pinch-zoom + il arama

### 4.2 Yönetim Katmanları

| Katman | Seçim | Yetki |
|--------|-------|-------|
| İl Meclisi | Haftalık | İl vergisi, bölgesel bonus |
| Vali | İl seçimi | İl bütçesi, fabrika ruhsatı |
| Büyük Millet Meclisi | Aylık | Ulusal vergi, savaş ilanı |
| Başbakan | Meclis içi | Bakanlık atama |

### 4.3 Yasa Tipleri

**MVP:**

1. Vergi oranı değişikliği
2. Ticaret tarifesi (iller arası)
3. Savaş ilanı / ateşkes

**Genişleme:** Sendika koruma, ihracat yasağı, iflas moratoryumu

### 4.4 Savaş Motivasyonu

1. Kaynak bölgesi kontrolü
2. Vergi tabanı genişletme
3. İntikam / ittifak borcu
4. Siyasi kriz
5. Ganimet kasası

### 4.5 Savaş Mekaniği (Hibrit)

- Savaş ilanı: BMM oylaması veya iki il anlaşması
- Saldırı: enerji (3) + cephane + silah tüketimi
- Anlık hasar → Socket.io canlı sayaç
- Fetih: savunma 0 → 24 saat işgal → yönetim devrilir
- Günde ~6–7 saldırı (enerji sınırı)

**Bölüm 4 Retention özeti:** 81 il haritası her hafta farklı renklere bürünür; kaçırılan savaş coğrafi kimliği ve ekonomik geleceği değiştirir.

---

## 5. TEKNİK MİMARİ VE VERİTABANI ALTYAPISI

### 5.1 Teknoloji Yığını

| Katman | Seçim | Gerekçe |
|--------|-------|---------|
| Frontend | React 19 + TypeScript + Vite | SVG harita, mobil UI |
| State | TanStack Query + Socket.io | Server state + canlı olaylar |
| Backend | Node.js + Fastify | Düşük latency, TS paylaşımı |
| ORM | Drizzle + PostgreSQL | Tip güvenliği, migration |
| Job queue | pg-boss | Ekstra Redis yok |
| Realtime | Socket.io | Savaş, online |
| Auth + Chat | Firebase Auth + Firestore | Hızlı MVP |
| Finansal gerçek | PostgreSQL (Neon) | ACID, ledger |
| Deploy | Railway + Vercel + Neon | Docker'sız |

**Neden Firebase ekonomiye dokunmaz:** Split-brain önlenir.

### 5.2 Veri Sahipliği

| Veri | Kaynak |
|------|--------|
| Cüzdan, ledger, pazar | PostgreSQL |
| Fabrika, üretim, savaş | PostgreSQL |
| Chat | Firestore |
| Online presence | Socket.io |
| Push | FCM |

### 5.3 Çekirdek Tablolar

`users`, `wallets`, `ledger_entries`, `regions`, `region_bonuses`, `factories`, `factory_types`, `production_orders`, `employments`, `items`, `recipes`, `recipe_inputs`, `market_listings`, `parties`, `elections`, `votes`, `law_proposals`, `law_votes`, `wars`, `war_attacks`, `war_participants`, `notifications`, `subscriptions`

**Ledger ilkesi:** Her işlem transaction içinde ledger satırı + wallet güncellemesi.

### 5.4 pg-boss Jobs

| Job | Sıklık |
|-----|--------|
| production.complete | Event |
| salary.pay | Saatlik |
| energy.regen | Saatlik |
| election.close | Event |
| war.tick | Savaş aktifken |
| market.expire | Saatlik |

### 5.5 Ölçeklenebilirlik

- **Faz 1 (0–10K DAU):** Tek API, Neon pooler, Vercel CDN
- **Faz 2 (10K–100K):** Horizontal scale, read replica, Socket Redis adapter
- **Faz 3 (100K+):** İl bazlı shard, event sourcing ledger

### 5.6 Güvenlik

- Rate limiting, server-side doğrulama, enerji + captcha, RMT transfer vergisi %50

**Bölüm 5 Retention özeti:** Sağlam teknik temel, oyuncunun yatırımına "sistem çökmez" güveni verir.

---

## 6. VETERAN EK BÖLÜMLER

### 6.1 Abonelik (Premium)

| Premium | Ücretsiz |
|---------|----------|
| Gelişmiş ekonomi dashboard | Temel UI |
| 3 il pazar filtresi | 1 il |
| Kozmetik rozet + çerçeve | Varsayılan |
| Bildirim özelleştirme | Temel push |
| Depo +%20 | Standart |
| Seçim/savaş analitik | Sonuç özeti |

**Asla satılmaz:** Enerji, silah, para, oy hakkı.

### 6.2 Sosyal Katmanlar

Parti (siyasi), Sendika (işçi), Holding (patron), İttifak (savaş) — her biri kasa, rol, iç chat.

### 6.3 İlerleme

- Seviye 1–100: XP = vardiya + ticaret + siyaset; +%0.5 verimlilik/seviye (cap)
- Prestij: opsiyonel sezon reset, kozmetik miras

### 6.4–6.6

Live ops, KPI ve moderasyon detayları için bkz. [Ek D](#ek-d-live-ops-kpi-ve-moderasyon).

---

## 7. MVP KAPSAM SINIRI

**Faz 1 (8–10 hafta):** Auth, 81 il harita, fabrika, vardiya, üretim, pazar, parti, seçim, 3 yasa, savaş, chat, bildirim.

**Faz 2:** Kredi, sendika, gelişmiş pazar, prestij.

**Faz 3:** Tier 3 üretim, diplomasi, çoklu il koordinasyonu.

---

## EK A: FORMÜL SÖZLÜĞÜ

Bu bölüm geliştirici ekibinin doğrudan kodlayacağı matematiksel kuralları tanımlar.

### A.1 Enerji Sistemi

```
energy_current = min(energy_max, energy_stored + hours_since_update × REGEN_RATE)
energy_max = 20
REGEN_RATE = 1 (saatlik tick)
```

Vardiya maliyeti: 2 enerji. Üretim emri: 1. Savaş saldırısı: 3.

### A.2 Üretim Süresi

```
production_time_seconds = base_time × quantity / (worker_multiplier × region_bonus × level_bonus)
worker_multiplier = 1 + ln(1 + active_workers) × 0.5
region_bonus = 1 + (region_sector_bonus_pct / 100)
level_bonus = 1 + (player_level × 0.005)  // max cap 1.5 at level 100
```

**Neden logaritmik işçi:** Sınırsız işçi spam'i önlenir; marginal getiri azalır.

### A.3 Maaş ve Escrow

```
shift_payment = agreed_wage × (1 - payroll_tax_rate)
escrow_required = agreed_wage × remaining_shifts × 1.1  // %10 tampon
```

Patron escrow'u yetersizse iş ilanı otomatik kapanır.

### A.4 Pazar Fiyat Motoru

```
reference_price = Σ(transaction_price × volume) / Σ(volume)   // son 24 saat
listing_min_price = reference_price × 0.5
listing_max_price = reference_price × 2.0

// Manipülasyon koruması
if (player_volume_24h / total_volume_24h > 0.30):
    effective_price = reference_price + (trade_price - reference_price) × 0.3
```

### A.5 Vergi ve Sink

```
market_tax = transaction_value × region_market_tax_rate
factory_upkeep_daily = base_upkeep × factory_level^1.3 × (1 - region_maintenance_discount)
payroll_tax = total_wages × national_payroll_tax_rate
```

### A.6 Enflasyon Alarmı

```
money_supply_ratio = total_currency_in_circulation / active_players_7d
if money_supply_ratio > INFLATION_THRESHOLD (ör. 50000):
    emergency_tax_multiplier = 1.01  // +%1 otomatik, 72 saat
    notify_all_players("Ekonomi Konseyi: Acil vergi düzenlemesi")
```

### A.7 Savaş Hasarı

```
attack_power = weapon_power × sqrt(ammo_consumed) × morale × (1 + soldier_bonus)
defense_power = fortification_level × 100 + defense_ammo_stock × 0.5 + defender_count × 10
raw_damage = max(0, attack_power - defense_power × 0.7)
defense_hp -= raw_damage
```

**Moral:**

```
morale = clamp(0.5, 1.5, 1.0 + (recent_wins × 0.1) - (recent_losses × 0.15))
```

### A.8 Fetih ve Ganimet

```
if defense_hp <= 0:
    start_occupation_timer(24 hours)
    on_occupation_complete:
        transfer_region_control(attacker)
        loot = min(defender_treasury × 0.15, LOOT_CAP)
        burn(ammo_consumed)  // cephane yok olur
        transfer(loot, defender → attacker)
        burn(loot × 0.05)    // %5 savaş vergisi yakılır
```

### A.9 Nakliye Maliyeti

```
shipping_cost = base_fee × distance_km_factor × weight × (1 + trade_tariff_rate)
distance_km_factor = region_graph_shortest_path(source, dest) × 0.01
```

### A.10 XP ve Seviye

```
xp_per_shift = 10 + (factory_level × 2)
xp_per_trade = floor(transaction_value / 1000)
xp_per_vote = 25
xp_to_next_level = 100 × level^1.8
```

### A.11 Nüfuz Skoru (Endgame Yok Metriği)

```
influence = (wealth_rank_percentile × 0.3)
          + (political_office_score × 0.25)
          + (territory_control × 0.25)
          + (trade_volume_rank × 0.2)
```

Sıfır toplamlı değil — birinin nüfuzu artarken başkasınınki azalabilir.

**Ek A Retention özeti:** Şeffaf formüller oyuncu topluluğunda teori-crafting ve meta-evrim yaratır; bu da içerik üretimini oyuncuya devreder.

---

## EK B: ONBOARDING HİKÂYELERİ (PERSONA BAZLI)

### B.1 Persona: Elif — "İşçi → Patron" (İlk 1 Saat)

**Arka plan:** 24 yaş, İstanbul, öğrenci. Mobil oynar.

| Zaman | Olay | Duygu |
|-------|------|-------|
| 0:00 | Haritada İzmir'i seçer (deniz, güneş) | Merak |
| 0:03 | Mentor ilanı görür: "Çelik fabrikası çırak arıyor — 150₺/vardiya" | Umut |
| 0:08 | İlk vardiya, +150₺, enerji 18/20 | Başarı |
| 0:15 | Pazardan 10 demir cevheri alır | Kontrol |
| 0:25 | "Kıdemli İşçi" partisine katılır | Aidiyet |
| 0:40 | Ankara seçim haberine push bildirim | FOMO |
| 0:55 | İkinci vardiya planlar, çıkar | Alışkanlık tohumu |

**Tasarım notu:** Elif hiçbir NPC'den para almadı; tüm gelir gerçek patronundan geldi.

### B.2 Persona: Murat — "Tüccar" (İlk 1 Hafta)

| Gün | Olay |
|-----|------|
| 1 | Gaziantep'te petrol alır, İç Anadolu'ya satar (+%12 kâr) |
| 2 | Nakliye maliyeti yüksek — rotayı optimize eder |
| 3 | Fiyat manipülasyon sınırına takılır, öğrenir |
| 4 | Holding kurar (2 patron ortağı) |
| 5 | Meclis ticaret tarifesi oylamasına lobi yapar |
| 6–7 | Savaş çıkar — cephane talebi patlar, stoktan satar |

**Hafta sonu durumu:** 12.000₺, 3 il pazar erişimi (Premium alır — analitik için).

### B.3 Persona: Ayşe — "Siyasetçi" (İlk 1 Ay)

| Hafta | Olay |
|-------|------|
| 1 | Ankara'da parti kurar (5.000₺ sink), 12 üye |
| 2 | İl meclisinde vergi artışı yasası geçirir |
| 3 | Seçim kampanyası — patronlardan bağış |
| 4 | Vali seçilir, rakip parti savaş ilanı tehdidi |

**Ay sonu:** 3 il koalisyonu, nüfuz skoru top %5, iflas eden rakip parti.

### B.4 Persona: Can — "Asker" (İlk 1 Ay)

| Hafta | Olay |
|-------|------|
| 1 | Vardiya + askerlik eğitimi (enerji yönetimi) |
| 2 | İttifaka katılır, cephane lojistiği taşır |
| 3 | İlk savaş: 4 saldırı, 2 zafer |
| 4 | Fetih ganimeti + unvan "Gaziantep Fatihi" |

**Ek B Retention özeti:** Persona hikâyeleri QA ve tutorial metinlerinin kaynağıdır; her yol oyuncuya farklı geri dönüş sebebi verir.

---

## EK C: MVP API ENDPOINT VE EVENT ŞEMASI

### C.1 Auth

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/auth/sync` | Firebase token → user + wallet oluştur/sync |
| GET | `/auth/me` | Profil + cüzdan |

### C.2 Regions

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/regions` | 81 il listesi + bonuslar |
| GET | `/regions/:slug` | İl detay |
| POST | `/regions/:slug/residence` | İkamet seç |

### C.3 Factories & Economy

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/factories/types` | Fabrika tipleri |
| GET | `/factories/recipes` | Tarifler |
| POST | `/factories` | Fabrika kur |
| POST | `/factories/:id/production` | Üretim emri |
| POST | `/factories/:id/jobs` | İş ilanı |
| POST | `/factories/:id/shift` | Vardiya çalış |
| GET | `/factories/mine` | Oyuncu fabrikaları |

### C.4 Market

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/market/listings` | İlanlar (filtre: region, item) |
| POST | `/market/listings` | Satış ilanı |
| POST | `/market/buy/:id` | Satın al |

### C.5 Politics

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/politics/parties` | Partiler |
| POST | `/politics/parties` | Parti kur |
| POST | `/politics/parties/:id/join` | Katıl |
| GET | `/politics/elections` | Aktif seçimler |
| POST | `/politics/elections/:id/vote` | Oy ver |
| GET | `/politics/laws` | Aktif yasa teklifleri |
| POST | `/politics/laws` | Yasa öner |
| POST | `/politics/laws/:id/vote` | Yasa oyu |

### C.6 Wars

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/wars` | Aktif savaşlar |
| POST | `/wars/declare` | Savaş ilanı |
| POST | `/wars/:id/attack` | Saldırı |
| GET | `/wars/:id` | Savaş durumu |

### C.7 Notifications

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/notifications` | Bildirim listesi |
| POST | `/notifications/read` | Okundu işaretle |

### C.8 Health

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| GET | `/health` | `{ status: "ok" }` |

### C.9 Socket.io Events

**Client → Server:**

| Event | Payload | Açıklama |
|-------|---------|----------|
| `join:region` | `{ regionSlug }` | İl kanalına katıl |
| `join:war` | `{ warId }` | Savaş odasına katıl |

**Server → Client:**

| Event | Payload | Açıklama |
|-------|---------|----------|
| `war:update` | `{ warId, defenseHp, lastAttack }` | Savaş durumu |
| `war:ended` | `{ warId, winnerId, loot }` | Savaş bitti |
| `election:update` | `{ electionId, standings }` | Seçim güncellemesi |
| `notification` | `{ type, title, body }` | Anlık bildirim |
| `market:tick` | `{ itemId, referencePrice }` | Fiyat güncellemesi |

### C.10 pg-boss Job Payload Şemaları

```typescript
// production.complete
{ orderId: string; factoryId: string; }

// salary.pay
{ employmentId: string; }

// energy.regen
{ userId: string; }

// election.close
{ electionId: string; }

// war.tick
{ warId: string; }

// market.expire
{ listingId: string; }
```

### C.11 Ledger Entry Tipleri

`shift_wage`, `market_buy`, `market_sell`, `factory_build`, `factory_upkeep`, `tax_market`, `tax_payroll`, `war_loot`, `war_reparation`, `party_create`, `election_deposit`, `loan_disburse`, `loan_repay`, `bankruptcy_burn`

**Ek C Retention özeti:** Net API sözleşmesi ekip paralel çalışabilir; belirsizlik azalır, shipping hızlanır.

---

## EK D: LIVE OPS, KPI VE MODERASYON

### D.1 Live Ops Felsefesi

Hegemonia'da içerik pipeline'ı yoktur; **sistem raporları** vardır. Live ops ekibi quest yazmaz, ekonomiyi ve topluluğu okur.

### D.2 Haftalık Otomatik Raporlar

| Rapor | İçerik | Kanal |
|-------|--------|-------|
| Ekonomi Bülteni | Enflasyon oranı, top 10 zengin, pazar hacmi | Oyun içi + Discord |
| Savaş Özeti | Aktif savaşlar, fethedilen iller | Oyun içi |
| Seçim Sonuçları | Kazananlar, yasa değişiklikleri | Push + oyun içi |

### D.3 Aylık "Tarih Kitabı"

Otomatik generate edilen PDF/oyun içi sayfa:

- En büyük 5 savaş
- En zengin 10 oyuncu (takma ad)
- En kalabalık 5 parti
- En çok ticaret yapılan 3 il
- Ekonomi grafiği (para arzı)

**Neden:** Oyuncular kendi hikâyelerini arşivler; sosyal paylaşım organik marketing yaratır.

### D.4 Oyuncu Önerisi Oylaması

- Ayda 1 kez: "Hangi yasa şablonu eklensin?" (3 seçenek)
- Topluluk oylaması + meclis entegrasyonu (Faz 2)

### D.5 KPI Tablosu

| KPI | Hedef (Faz 1) | Alarm eşiği |
|-----|---------------|-------------|
| D1 Retention | >%35 | <%25 |
| D7 Retention | >%15 | <%10 |
| D30 Retention | >%8 | <%5 |
| Günlük vardiya/DAU | >2.5 | <1.5 |
| Para arzı / aktif oyuncu | 30K–80K | >120K |
| Günlük pazar hacmi | >10K işlem | <3K |
| Savaş katılım oranı | >%20 DAU | <%10 |
| Mentor dönüşüm (D1 çırak) | >%60 | <%40 |
| Premium dönüşüm | >%3 | <%1 |
| Churn sonrası geri dönüş (7 gün) | >%10 | <%5 |

### D.6 KPI Aksiyon Matrisi

| Sinyal | Olası neden | Aksiyon |
|--------|-------------|---------|
| D1 düşük | Onboarding kırık | Mentor eşleştirme iyileştir |
| Para arzı yüksek | Sink yetersiz | Acil vergi + bakım artışı |
| Pazar hacmi düşük | Ticaret karlı değil | Nakliye maliyeti ayarı |
| Savaş katılım düşük | Cephane pahalı | Üretim süresi -%10 geçici |
| Premium düşük | Değer önerisi zayıf | Dashboard özellik ekle |

### D.7 Moderasyon Katmanları

**Seviye 1 — Otomatik:**

- Küfür filtresi (chat)
- Rate limit (API)
- Şüpheli transfer flag (>%50 net worth tek günde)

**Seviye 2 — İl Moderatörü (seçilmiş oyuncu):**

- 24 saat susturma
- İl chat temizliği
- Rapor önceliklendirme

**Seviye 3 — Admin Ekibi:**

- Kalıcı ban
- Rollback (ledger fraud)
- Seçim iptali (koordineli hile kanıtı)

### D.8 Moderasyon İlkeleri

1. Siyasi nefret söylemi → susturma (mekanik etkilenmez)
2. RMT (gerçek para ticareti) → ban + varlık dondurma
3. Multi-account bot → IP/device fingerprint
4. Seçim manipülasyonu (bot oylar) → seçim geçersiz

### D.9 Kriz Senaryoları ve Playbook

| Kriz | Playbook |
|------|----------|
| Hyperinflation | Acil sink paketi + meclis oylaması |
| Bir ilde tek patron tekeli | Vergi tavanı + yeni oyuncu mentor bonusu |
| Koordineli hile | Ledger audit + rollback |
| Sunucu çökmesi | pg-boss retry + oyuncuya enerji iadesi (güç değil, tempo) |

### D.10 Topluluk Kanalları

- Discord (resmi)
- İl chat (oyun içi, Firestore)
- Parti/sendika chat (oyun içi)
- "Meclis tribünü" (kamu duyuruları, salt okunur)

**Ek D Retention özeti:** Live ops içerik üretmez, topluluğun hikâyesini yüceltir ve ekonomiyi canlı tutar — evergreen oyunlarda sürdürülebilir başarının anahtarı budur.

---

## SONUÇ

Hegemonia, NPC'siz kapalı ekonomi + 81 il siyasi harita + hibrit savaş ile tarayıcı MMO segmentinde benzersiz bir konum hedefler. Bu GDD, yarın sabah kodlamaya başlayacak ekibin anayasasıdır: her mekanik bir **neden** taşır, her sistem bir **retention cümlesi** ile ölçülür.

**Belge onay durumu:** v1.0 — Üretime hazır taslak.

---

*Hegemonia GDD v1.0 — Lead Game Designer & Systems Architect*
