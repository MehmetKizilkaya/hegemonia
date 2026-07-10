# Hegemonia — MASTER PLAN v1.0

**Belge türü:** Üretim Anayasası — Kodlama Öncesi Tek Kaynak (Single Source of Truth)  
**Rol:** Lead Game Designer + Senior Backend Engineer  
**Versiyon:** 1.0  
**Para birimi:** HA (Hegemonia Altını), tamsayı, en küçük birim 1 HA  
**Zaman birimi:** UTC, tüm timestamp `timestamptz`

Bu belge `GDD.md` vizyonunu **sıfır gri alan** ile matematiksel ve algoritmik kurallara dönüştürür. "Örnek", "TBD", "ileride" ifadesi yoktur.

---

## İçindekiler

1. [Global Sabitler](#1-global-sabitler)
2. [Matematiksel Formüller ve Savaş Algoritması](#2-matematiksel-formüller-ve-savaş-algoritması)
3. [Üretim Zinciri — Tam Tarif Tablosu](#3-üretim-zinciri--tam-tarif-tablosu)
4. [Onboarding UX Akışı](#4-onboarding-ux-akışı)
5. [PostgreSQL Tam Şema (ERD)](#5-postgresql-tam-şema-erd)
6. [Firebase Veri Sınırları](#6-firebase-veri-sınırları)
7. [Ekonomi ve Enflasyon Kontrolü (Sink Tablosu)](#7-ekonomi-ve-enflasyon-kontrolü)
8. [Mimari ve Veri Akışı](#8-mimari-ve-veri-akışı)
9. [API Sözleşmesi Özeti](#9-api-sözleşmesi-özeti)

---

## 1. GLOBAL SABİTLER

| Sabit | Değer | Açıklama |
|-------|-------|----------|
| `ENERGY_MAX` | 20 | Maksimum enerji |
| `ENERGY_REGEN_PER_HOUR` | 1 | Saatlik yenilenme |
| `ENERGY_REGEN_INTERVAL_SEC` | 3600 | pg-boss `energy.regen` periyodu |
| `SHIFT_ENERGY_COST` | 2 | Vardiya maliyeti |
| `PRODUCTION_START_ENERGY_COST` | 1 | Üretim emri başlatma |
| `WAR_ATTACK_ENERGY_COST` | 3 | Saldırı maliyeti (ücretsiz saldırı hariç) |
| `WAR_FREE_ATTACK_COOLDOWN_SEC` | 3600 | Saatte 1 ücretsiz saldırı |
| `WAR_DURATION_SEC` | 259200 | Savaş süresi: 72 saat |
| `OCCUPATION_DURATION_SEC` | 86400 | Fetih sonrası işgal: 24 saat |
| `REGION_BASE_DEFENSE_HP` | 10000 | İl başlangıç savunma puanı |
| `MARKET_LISTING_DURATION_SEC` | 604800 | İlan süresi: 7 gün |
| `MARKET_LISTING_FEE_RATE` | 0.02 | Listeleme ücreti: fiyat × adet × %2 |
| `MARKET_TRANSACTION_TAX_RATE` | 0.05 | Ulusal pazar vergisi: %5 |
| `REGION_TAX_RATE_DEFAULT` | 0.10 | İl vergisi varsayılan: %10 |
| `REGION_TAX_RATE_MIN` | 0.03 | İl vergisi taban |
| `REGION_TAX_RATE_MAX` | 0.25 | İl vergisi tavan |
| `PAYROLL_TAX_RATE` | 0.08 | Maaş bordrosu vergisi: %8 |
| `PARTY_CREATE_COST` | 10000 | Parti kurma: 10.000 HA |
| `ELECTION_DEPOSIT` | 5000 | Seçime aday parti depozitosu |
| `LAW_PROPOSAL_COST` | 2000 | Yasa teklifi ücreti |
| `INFLATION_RATIO_THRESHOLD` | 75000 | Para arzı / 7g aktif oyuncu alarm eşiği |
| `INFLATION_EMERGENCY_TAX_BUMP` | 0.01 | Alarmda +%1 vergi (72 saat) |
| `BANKRUPTCY_BURN_RATE` | 0.20 | İflas tasfiyesinde yakılan oran |
| `WAR_LOOT_RATE` | 0.12 | Mağlup hazinesinin yağmalanma oranı |
| `WAR_LOOT_BURN_RATE` | 0.05 | Ganimet üzerinden savaş vergisi yakımı |
| `SHIPPING_BASE_FEE_PER_UNIT` | 2 | Nakliye: 2 HA × mesafe × ağırlık |
| `MENTOR_BONUS_RATE` | 0.15 | Çırak maaş bonusu (patron öder) |
| `NEW_PLAYER_SHIELD_DAYS` | 7 | Saldırı koruması süresi |
| `USER_INVENTORY_BASE_SLOTS` | 50 | Temel envanter slotu |
| `USER_INVENTORY_PREMIUM_SLOTS` | 60 | Premium: +%20 slot |
| `XP_LEVEL_CAP` | 100 | Maksimum seviye |
| `LEVEL_EFFICIENCY_PER_LEVEL` | 0.005 | Seviye başına +%0.5 verimlilik |
| `LEVEL_EFFICIENCY_CAP` | 1.50 | Verimlilik çarpanı tavanı |

---

## 2. MATEMATİKSEL FORMÜLLER VE SAVAŞ ALGORİTMASI

### 2.1 Enerji Sistemi

**Mevcut enerji hesabı (her API isteğinde lazy evaluation):**

```
elapsed_hours = floor((now_utc - user.energy_updated_at) / 3600)
energy_current = min(ENERGY_MAX, user.energy + elapsed_hours × ENERGY_REGEN_PER_HOUR)

if energy_current != user.energy:
    UPDATE users SET energy = energy_current, energy_updated_at = now_utc
```

**Enerji harcama kuralları:**

| Eylem | Enerji | Koşul |
|-------|--------|-------|
| Vardiya (`POST /factories/:id/shift`) | 2 | `energy_current >= 2` |
| Üretim emri başlat | 1 | `energy_current >= 1` |
| Savaş saldırısı | 3 | `energy_current >= 3` VEYA ücretsiz saldırı hakkı |
| Savunma vardiyası | 2 | `energy_current >= 2` |
| Meclis oyu / pazar | 0 | — |

**Günlük teorik saldırı kapasitesi:** 20 enerji ÷ 3 = 6 saldırı + 1 ücretsiz = **7 saldırı/gün** (tam şarj, sadece savaşa harcayan oyuncu).

**Premium enerji yenileme (sink, güç değil):** 500 HA → +5 enerji, günde max 2 kez.

### 2.2 Seviye ve XP

```
xp_required_for_next_level(L) = floor(100 × L^1.5)

xp_sources:
  vardiya        = 10 + factory_level × 2
  market_trade   = floor(transaction_value_HA / 500)
  election_vote  = 25
  war_damage_100 = floor(damage_dealt / 100)
  law_vote       = 15
```

Seviye verimlilik çarpanı:

```
level_efficiency = min(LEVEL_EFFICIENCY_CAP, 1 + user.level × LEVEL_EFFICIENCY_PER_LEVEL)
```

### 2.3 Savaş Hasar Algoritması (Kesin)

**Girdi değişkenleri:**

| Değişken | Tip | Kaynak |
|----------|-----|--------|
| `L` | integer | `users.level` |
| `E` | integer | Harcanan enerji (1–3, ücretsiz saldırıda hesap için E=1) |
| `W` | integer | Silah gücü (item stat, tablo 2.4) |
| `A` | integer | Kullanılan cephane adedi (min 1) |
| `M` | decimal | Moral çarpanı (tablo 2.5) |
| `S` | decimal | Seviye çarpanı |

**Formüller:**

```
S = floor(L^0.8 × 10) / 10          // örn. L=10 → S=6.3
base_attack = S × E × (1 + W / 100)
ammo_factor = sqrt(A)
raw_damage = floor(base_attack × ammo_factor × M)
```

**Savunma tarafı hasar (aynı formül, savunma silahları ile).**

**Bölge savunma puanı azaltma (saldırı sonrası):**

```
region.defense_points -= raw_damage
war.attacker_damage += raw_damage   // saldırgan taraf toplamı
```

**Savaş sonucu (72 saat dolunca `war.tick` job):**

```
if war.attacker_damage > war.defender_damage:
    status = 'won_attacker'
    start_occupation(defender_region_id, OCCUPATION_DURATION_SEC)
else:
    status = 'won_defender'
```

**İşgal tamamlanınca:**

```
controller_party_id = attacker_party_id
region.defense_points = REGION_BASE_DEFENSE_HP
loot = floor(defender_party.treasury × WAR_LOOT_RATE)
burn(loot × WAR_LOOT_BURN_RATE)
transfer(loot × (1 - WAR_LOOT_BURN_RATE), defender_treasury → attacker_treasury)
```

### 2.4 Silah ve Cephane Stat Tablosu

| Item kodu | W (silah gücü) | Cephane tüketimi/saldırı | Sektör |
|-----------|----------------|--------------------------|--------|
| `hafif_silah` | 5 | 1 | savunma |
| `tifek` | 15 | 2 | savunma |
| `agir_silah` | 30 | 3 | savunma |
| `cephane` | 0 | 1 (zorunlu, min 1) | savunma |
| `hafif_silah_mermisi` | — | cephane yerine geçmez | savunma |

**Üretim tarifleri (savaş itemleri) — bkz. Bölüm 3.**

### 2.5 Moral Çarpanı

```
recent_wins   = son_7_gunde_kazanilan_savas_sayisi
recent_losses = son_7_gunde_kaybedilen_savas_sayisi
M = clamp(0.70, 1.30, 1.0 + recent_wins × 0.05 - recent_losses × 0.08)
```

### 2.6 Örnek Savaş Hesabı

Oyuncu: level=15, E=3, tüfek (W=15), 2 cephane, M=1.10

```
S = floor(15^0.8 × 10) / 10 = floor(86.2)/10 = 8.6
base_attack = 8.6 × 3 × (1 + 15/100) = 8.6 × 3 × 1.15 = 29.67
ammo_factor = sqrt(2) = 1.414
raw_damage = floor(29.67 × 1.414 × 1.10) = floor(46.15) = 46
```

### 2.7 Ücretsiz Saldırı Kuralı

```
if user.last_war_attack_at IS NULL OR (now - last_war_attack_at) >= 3600s:
    actual_energy_cost = 0
    damage uses E = 1 in formula (not 3)
else:
    actual_energy_cost = 3
    damage uses E = 3
```

---

## 3. ÜRETİM ZİNCİRİ — TAM TARİF TABLOSU

### 3.1 Üretim Süresi Formülü

```
base_duration = recipe.duration_sec × order.quantity

worker_ratio = min(1.0, factory.active_workers / factory_type.max_workers)
worker_multiplier = 0.4 + 0.6 × worker_ratio    // 0 işçi → 0.4x, full → 1.0x

region_multiplier = region_bonuses[sector] ?? 1.00

final_duration_sec = floor(base_duration / (worker_multiplier × region_multiplier × level_efficiency))
```

### 3.2 Fabrika Tipleri (Tam)

| code | build_cost HA | build_duration | daily_maintenance HA | max_workers | storage |
|------|---------------|----------------|----------------------|-------------|---------|
| `tarla` | 5.000 | 1 saat | 100 | 10 | 500 |
| `gida_fabrikasi` | 15.000 | 2 saat | 300 | 15 | 300 |
| `maden_ocagi` | 25.000 | 3 saat | 500 | 15 | 400 |
| `demir_celik_fabrikasi` | 60.000 | 6 saat | 1.500 | 20 | 350 |
| `petrol_kuyusu` | 50.000 | 4 saat | 1.000 | 20 | 200 |
| `petrol_rafinerisi` | 80.000 | 6 saat | 2.000 | 25 | 150 |
| `silah_fabrikasi` | 45.000 | 5 saat | 800 | 18 | 200 |
| `elektrik_santrali` | 100.000 | 8 saat | 3.000 | 30 | 0 |

**Bakım sink (günlük, saat 00:00 UTC tick):**

```
daily_upkeep = factory_type.daily_maintenance × factory.level^1.2
```

### 3.3 Item Baz Fiyatları (HA)

| code | base_price | stack_max |
|------|------------|-----------|
| `bugday` | 10 | 9999 |
| `misir` | 8 | 9999 |
| `pamuk` | 15 | 9999 |
| `un` | 25 | 9999 |
| `ekmek` | 40 | 9999 |
| `komur` | 30 | 9999 |
| `demir_cevheri` | 45 | 9999 |
| `celik` | 120 | 9999 |
| `ham_petrol` | 50 | 9999 |
| `benzin` | 80 | 9999 |
| `elektrik` | 20 | 9999 |
| `hafif_silah` | 200 | 100 |
| `tifek` | 500 | 50 |
| `agir_silah` | 1.200 | 20 |
| `cephane` | 60 | 500 |

### 3.4 Tarifler (Kesin Girdi → Çıktı → Süre)

| # | Fabrika | Çıktı (adet) | Girdi | Süre | Enerji |
|---|---------|--------------|-------|------|--------|
| R01 | tarla | 10 buğday | — | 5 dk (300s) | 2 |
| R02 | tarla | 12 mısır | — | 5 dk | 2 |
| R03 | gida_fabrikasi | 5 un | 10 buğday | 10 dk (600s) | 3 |
| R04 | gida_fabrikasi | 8 ekmek | 5 un | 15 dk (900s) | 4 |
| R05 | maden_ocagi | 8 demir cevheri | — | 20 dk (1200s) | 4 |
| R06 | maden_ocagi | 10 kömür | — | 15 dk (900s) | 3 |
| R07 | elektrik_santrali | 20 elektrik | 5 kömür | 10 dk (600s) | 4 |
| R08 | demir_celik_fabrikasi | **5 çelik** | **8 demir cevheri + 3 kömür + 2 elektrik** | **40 dk (2400s)** | **5** |
| R09 | petrol_kuyusu | 5 ham petrol | — | 20 dk (1200s) | 5 |
| R10 | petrol_rafinerisi | 3 benzin | 5 ham petrol | 30 dk (1800s) | 6 |
| R11 | silah_fabrikasi | 3 hafif silah | 2 çelik | 25 dk (1500s) | 4 |
| R12 | silah_fabrikasi | 1 tüfek | 5 çelik + 1 benzin | 45 dk (2700s) | 5 |
| R13 | silah_fabrikasi | 10 cephane | 3 çelik + 1 kömür | 20 dk (1200s) | 3 |

**Çelik üretim örneği (tek emir, full işçi, bonus yok, level 10):**

- Girdi kilidi: 8 demir cevheri + 3 kömür + 2 elektrik fabrika envanterinden düşülür
- Süre: 2400 / (1.0 × 1.0 × 1.045) = **2297 saniye ≈ 38.3 dakika**
- Bitince: +5 çelik fabrika envanterine eklenir

### 3.5 Maaş Formülü

```
shift_wage = job_posting.salary_per_shift    // patron belirler, min 50 HA
payroll_tax = floor(shift_wage × PAYROLL_TAX_RATE)
worker_receives = shift_wage - payroll_tax
mentor_bonus = floor(shift_wage × MENTOR_BONUS_RATE) if çırak AND ilk_7_gün else 0
total_patron_cost = shift_wage + mentor_bonus
```

Escrow zorunluluğu:

```
escrow_minimum = salary_per_shift × remaining_shifts × 1.10
```

---

## 4. ONBOARDING UX AKIŞI

### 4.1 Ekran Haritası (Route)

| Adım | Route | Bileşen |
|------|-------|---------|
| O1 | `/login` | LoginPage |
| O2 | `/onboarding/map` | OnboardingMapPage |
| O3 | `/onboarding/mentor` | MentorSelectPage |
| O4 | `/onboarding/shift` | FirstShiftPage |
| O5 | `/` | Dashboard (MapPage) |

### 4.2 İlk Ekran (O1 — Login)

**Görünen öğeler:**
- Logo + tagline: "Türkiye senin. Ekonomi, siyaset, savaş."
- Google ile Giriş butonu
- E-posta/şifre alanları
- **Dev mod (Firebase yoksa):** "Test Girişi" alanı — e-posta gir → `devSignIn(email)`

**Buton aksiyonları:**
- `Google ile Giriş` → Firebase popup → `POST /auth/sync` → O2'ye yönlendir
- `Test Girişi` → localStorage token → `POST /auth/sync` → O2

### 4.3 İl Seçimi (O2 — 60 saniye)

**Görünen öğeler:**
- Tam ekran SVG Türkiye haritası (81 il)
- Üst bar: "İkamet ilini seç"
- Alt panel: seçili il adı, nüfus, bölgesel bonus listesi
- CTA: **"Burada Yaşamaya Başla"** (seçim yapılmadan disabled)

**Aksiyon:**
- İl tıkla → panel güncellenir
- CTA → `POST /regions/:slug/residence` → O3

### 4.4 Mentor Seçimi (O3 — 90 saniye) — Aha Moment #1

**Görünen öğeler:**
- Başlık: "İlk işini bul"
- Liste: seçili ildeki aktif `job_postings` (min maaş sıralı)
- Her kart: fabrika adı, patron adı, maaş/vardiya, "Çırak olarak başvur"
- Fallback (ilan yoksa): sistem genel mentor havuzundan 3 ilan (komşu iller)

**Aksiyon:**
- `Çırak olarak başvur` → `POST /factories/:id/jobs/:postingId/apply` → employment oluşur → O4

### 4.5 İlk Vardiya (O4) — Aha Moment #2

**Görünen öğeler:**
- Animasyonlu fabrika görseli
- Büyük buton: **"VARDİYA BAŞLAT"** (2 enerji)
- Maaş önizleme: "+135 HA (150 - %8 vergi)"
- Progress bar: enerji 18/20

**Aksiyon:**
- `VARDİYA BAŞLAT` → `POST /factories/:id/shift` → konfeti animasyonu → cüzdan +135 HA → O5

### 4.6 Dashboard (O5) — Aha Moment #3

**Görünen öğeler:**
- Üst: cüzdan bakiyesi (animasyonlu artış)
- 3 görev kartı (tutorial quest):

| # | Görev | Hedef | Ödül |
|---|-------|-------|------|
| T1 | "İlk ticaretini yap" | Pazardan 1 item al | 50 XP + 100 HA (patron transferi değil, tutorial chest — tek istisna: 100 HA sistem tutorial ödülü, ledger type `tutorial_grant`, lifetime max 1) |
| T2 | "Bir partiye katıl" | `POST /politics/parties/:id/join` | 25 XP |
| T3 | "Haritada 3 il gez" | 3 farklı il detay aç | 25 XP |

**Not:** T1 tutorial_grant tek NPC-benzeri istisnadır; lifetime bir kez, toplam 100 HA, enflasyona etkisi ihmal edilebilir (cap: aktif oyuncu × 100 max daily tutorial mint globally = 0 — global daily cap 10.000 HA).

**Görev tamamlanınca:** push + "Artık hazırsın!" banner → tam oyun açılır.

### 4.7 Onboarding State Machine

```
registered → residence_set → employed → first_shift_done → tutorial_active → tutorial_complete
```

`users.onboarding_step` text alanı (PostgreSQL) bu state'i tutar.

---

## 5. POSTGRESQL TAM ŞEMA (ERD)

### 5.1 ERD Diyagramı (Metin)

```
users 1──1 wallets 1──N ledger_entries
users 1──N factories N──1 factory_types
users 1──N employments N──1 job_postings N──1 factories
factories 1──N production_orders N──1 recipes
recipes N──M items (recipe_inputs)
factories 1──N factory_inventories
users 1──N user_inventories
users N──M parties (party_memberships)
parties 1──N elections
users N──M elections (votes)
regions 1──N region_bonuses
regions 1──N factories
regions 1──N market_listings
users 1──N market_listings
market_listings 1──N market_trades
law_proposals 1──N law_votes
wars N──1 regions (defender)
wars 1──N war_damage_logs
users 1──N notifications
users 1──N daily_quests
```

### 5.2 Tablo: `users`

| Sütun | Tip | Kısıt | Açıklama |
|-------|-----|-------|----------|
| id | UUID | PK, default gen_random_uuid() | |
| firebase_uid | TEXT | UNIQUE, NOT NULL | |
| email | TEXT | UNIQUE, NOT NULL | |
| display_name | TEXT | | |
| avatar_url | TEXT | | |
| level | INTEGER | NOT NULL, default 1 | |
| xp | BIGINT | NOT NULL, default 0 | |
| energy | INTEGER | NOT NULL, default 20 | |
| energy_updated_at | TIMESTAMPTZ | default now() | |
| residence_region_id | INTEGER | FK → regions.id | |
| last_war_attack_at | TIMESTAMPTZ | | |
| onboarding_step | TEXT | NOT NULL, default 'registered' | |
| is_premium | BOOLEAN | NOT NULL, default false | |
| premium_until | TIMESTAMPTZ | | |
| mentor_user_id | UUID | FK → users.id | |
| mentor_until | TIMESTAMPTZ | | |
| new_player_shield_until | TIMESTAMPTZ | | created_at + 7 gün |
| created_at | TIMESTAMPTZ | NOT NULL, default now() | |

### 5.3 Tablo: `wallets`

| Sütun | Tip | Kısıt |
|-------|-----|-------|
| id | UUID | PK |
| user_id | UUID | FK → users.id, UNIQUE |
| balance | BIGINT | NOT NULL, default 0 |
| currency | TEXT | NOT NULL, default 'HA' |

### 5.4 Tablo: `ledger_entries` (append-only)

| Sütun | Tip | Kısıt |
|-------|-----|-------|
| id | UUID | PK |
| wallet_id | UUID | FK → wallets.id |
| amount | BIGINT | NOT NULL (negatif = çıkış) |
| type | TEXT | NOT NULL |
| reference_type | TEXT | |
| reference_id | UUID | |
| created_at | TIMESTAMPTZ | NOT NULL |

**type enum değerleri:** `shift_wage`, `payroll_tax`, `market_buy`, `market_sell`, `market_tax`, `market_listing_fee`, `factory_build`, `factory_upkeep`, `production_input_lock`, `war_loot`, `war_reparation`, `party_create`, `election_deposit`, `law_proposal`, `shipping_fee`, `bankruptcy_burn`, `tutorial_grant`, `mentor_bonus`, `premium_energy`, `transfer`

### 5.5 Tablo: `regions`

| Sütun | Tip | Kısıt |
|-------|-----|-------|
| id | SERIAL | PK |
| slug | TEXT | UNIQUE |
| name | TEXT | NOT NULL |
| svg_path_id | TEXT | NOT NULL |
| population | BIGINT | default 0 |
| controller_party_id | UUID | FK → parties.id |
| country_id | INTEGER | default 1 |
| defense_points | BIGINT | default 10000 |
| tax_rate | INTEGER | default 10 (yüzde olarak 10 = %10) |
| treasury_balance | BIGINT | default 0 |

### 5.6 Tablo: `region_bonuses`

| Sütun | Tip |
|-------|-----|
| id | SERIAL PK |
| region_id | INTEGER FK |
| sector | TEXT |
| multiplier | DECIMAL(4,2) |

### 5.7 Tablo: `factory_types`

| Sütun | Tip |
|-------|-----|
| id | SERIAL PK |
| code | TEXT UNIQUE |
| sector | TEXT |
| name | TEXT |
| build_cost | BIGINT |
| build_duration_sec | INTEGER |
| daily_maintenance | BIGINT |
| max_workers | INTEGER |
| base_capacity | INTEGER |
| storage_capacity | INTEGER |
| energy_per_unit | DECIMAL(6,2) |

### 5.8 Tablo: `factories`

| Sütun | Tip |
|-------|-----|
| id | UUID PK |
| owner_id | UUID FK → users |
| region_id | INTEGER FK → regions |
| factory_type_id | INTEGER FK |
| level | INTEGER default 1 |
| status | TEXT (`building`/`active`/`destroyed`) |
| active_workers | INTEGER default 0 |
| built_at | TIMESTAMPTZ |
| build_ends_at | TIMESTAMPTZ |

### 5.9 Tablo: `items`

| Sütun | Tip |
|-------|-----|
| id | SERIAL PK |
| code | TEXT UNIQUE |
| name | TEXT |
| sector | TEXT |
| base_price | BIGINT |
| stackable | BOOLEAN |
| weapon_power | INTEGER default 0 |

### 5.10 Tablo: `recipes` + `recipe_inputs`

`recipes`: id, factory_type_id, output_item_id, output_qty, duration_sec, energy_cost  
`recipe_inputs`: (recipe_id, item_id) PK, qty

### 5.11 Tablo: `production_orders`

| Sütun | Tip |
|-------|-----|
| id | UUID PK |
| factory_id | UUID FK |
| recipe_id | INTEGER FK |
| quantity | INTEGER |
| status | TEXT (`queued`/`active`/`completed`/`cancelled`) |
| started_at | TIMESTAMPTZ |
| ends_at | TIMESTAMPTZ |
| job_id | TEXT (pg-boss id) |

### 5.12 Tablo: `factory_inventories` + `user_inventories`

Composite PK: (factory_id/user_id, item_id), quantity INTEGER

### 5.13 Tablo: `job_postings` + `employments`

`job_postings`: id, factory_id, salary_per_shift, max_workers, is_active  
`employments`: id, user_id, factory_id, job_posting_id, started_at, last_paid_at, status

### 5.14 Tablo: `market_listings` + `market_trades` + `market_price_history`

`market_listings`: id, seller_id, region_id, item_id, quantity, price_per_unit, status, created_at, expires_at  
`market_trades`: id, listing_id, buyer_id, quantity, total_price, executed_at  
`market_price_history`: (item_id, region_id, recorded_at) PK, avg_price, volume

### 5.15 Tablo: `parties` + `party_memberships`

`parties`: id, name UNIQUE, founder_id, treasury, created_at  
`party_memberships`: (party_id, user_id) PK, role (`founder`/`officer`/`member`), joined_at

### 5.16 Tablo: `elections` + `votes`

`elections`: id, type (`regional`/`national`), region_id, starts_at, ends_at, status  
`votes`: (election_id, voter_id) PK, party_id, cast_at

### 5.17 Tablo: `law_proposals` + `law_votes`

`law_proposals`: id, proposer_id, region_id, type, payload JSONB, status, voting_ends_at  
`law_votes`: (proposal_id, voter_id) PK, vote (`yes`/`no`)

**payload şemaları:**
- `tax_change`: `{ "new_tax_rate": 12 }`
- `trade_tariff`: `{ "target_region_id": 6, "tariff_rate": 0.08 }`
- `war_declare`: `{ "defender_region_id": 34, "duration_hours": 72 }`

### 5.18 Tablo: `wars` + `war_damage_logs`

`wars`: id, attacker_country_id, defender_region_id, declared_by, law_proposal_id, status, attacker_damage, defender_damage, started_at, ends_at  
`war_damage_logs`: id, war_id, user_id, side, damage, energy_spent, created_at

### 5.19 Tablo: `notifications` + `daily_quests`

`notifications`: id, user_id, type, title, body, read, created_at  
`daily_quests`: id, user_id, quest_key, title, description, difficulty, progress, target, completed, reward_xp, reward_gold, quest_date

### 5.20 İndeksler (Zorunlu)

```sql
CREATE INDEX idx_ledger_wallet_created ON ledger_entries(wallet_id, created_at DESC);
CREATE INDEX idx_market_listings_region_item ON market_listings(region_id, item_id, status);
CREATE INDEX idx_production_orders_ends ON production_orders(ends_at) WHERE status = 'active';
CREATE INDEX idx_wars_status ON wars(status) WHERE status = 'active';
CREATE INDEX idx_users_residence ON users(residence_region_id);
```

---

## 6. FIREBASE VERİ SINIRLARI

### 6.1 Firebase'de TUTULAN (Firestore)

| Koleksiyon | Doküman yapısı | TTL |
|------------|----------------|-----|
| `chat_channels/{channelId}/messages/{msgId}` | `{ uid, displayName, text, createdAt, type }` | 90 gün |
| `presence/{uid}` | `{ online: bool, lastSeen, regionSlug }` | ephemeral |
| `fcm_tokens/{uid}` | `{ token, platform, updatedAt }` | kalıcı |

**channelId formatları:**
- `region_{slug}` — il chat
- `party_{partyId}` — parti chat
- `war_{warId}` — savaş chat

### 6.2 Firebase Auth

- Google OAuth, e-posta/şifre
- JWT → API `Authorization: Bearer <idToken>`
- Dev bypass: token `dev:{uid}:{email}` yalnızca `DEV_AUTH_BYPASS=true`

### 6.3 PostgreSQL'de TUTULAN (Firebase'e ASLA yazılmayan)

- Cüzdan, ledger, tüm ekonomi
- Fabrika, üretim, envanter
- Pazar, savaş hasarı, seçim sonuçları
- Bildirim kayıtları (kalıcı) → PostgreSQL `notifications`
- Premium durumu

### 6.4 Bildirim İkili Yazım

1. PostgreSQL `notifications` insert (kalıcı kayıt)
2. FCM push (Firebase Cloud Messaging)
3. Socket.io `notification` event (online oyuncu)

Firebase Realtime Database **kullanılmaz**.

---

## 7. EKONOMİ VE ENFLASYON KONTROLÜ

### 7.1 Sink Tablosu (Kesin Oranlar)

| Sink | Oran / Miktar | Tetikleyici | Tahmini günlük sink/aktif oyuncu |
|------|---------------|-------------|----------------------------------|
| Pazar işlem vergisi | %5 | Her `market_trades` | ~200 HA |
| Pazar listeleme ücreti | %2 × toplam değer | İlan oluşturma | ~50 HA |
| Fabrika günlük bakım | tablo 3.2 formülü | 00:00 UTC cron | ~150 HA |
| Maaş bordrosu vergisi | %8 | Her vardiya | ~80 HA |
| Savaş cephane tüketimi | 1–3 adet/item fiyatı | Saldırı | değişken |
| Cephane yok olma | %100 tüketim | Saldırı | değişken |
| Parti kurma | 10.000 HA | Tek seferlik | amortize |
| Seçim depozitosu | 5.000 HA (kaybeden yanar %50) | Seçim | ~20 HA |
| Yasa teklifi | 2.000 HA | Tek seferlik | ~10 HA |
| Nakliye | 2 HA × km × ağırlık | İller arası transfer | ~30 HA |
| İflas yakımı | %20 | İflas | nadir |
| Savaş ganimet yakımı | %5 | Savaş sonu | nadir |
| Premium enerji | 500 HA / +5 enerji | Oyuncu talebi | opsiyonel |
| İlan süresi dolunca | item iade, ücret iade yok | 7 gün | ~50 HA |

**Hedef:** Günlük toplam sink ≈ günlük toplam faucet × 0.85–0.95

### 7.2 Faucet Tablosu (Hepsi Oyuncu Transferi)

| Faucet | Tipik miktar | Kaynak |
|--------|--------------|--------|
| Vardiya maaşı | 100–300 HA | Patron cüzdanı |
| Ticaret kârı | değişken | Alıcı → satıcı |
| Savaş ganimeti | hazinenin %12 | Mağlup parti |
| Tutorial grant | 100 HA (1 kez) | Sistem (cap'li) |

### 7.3 Enflasyon Alarm Algoritması

```
money_supply = SUM(wallets.balance)
active_7d = COUNT(users WHERE last_login > now() - 7 days)
ratio = money_supply / max(active_7d, 1)

if ratio > 75000:
    global_emergency_tax_multiplier = 1.01
    emergency_tax_expires_at = now() + 72 hours
    INSERT notification ALL users
```

### 7.4 Pazar Fiyat Motoru

```
reference_price(item, region) = hacim_ağırlıklı_ortalama(son_24_saat)

min_listing_price = reference_price × 0.50
max_listing_price = reference_price × 2.00

execute_price = listing.price_per_unit
tax = floor(execute_price × quantity × MARKET_TRANSACTION_TAX_RATE)
seller_receives = execute_price × quantity - tax
```

Manipülasyon:

```
if buyer_volume_24h / total_volume_24h > 0.30:
    effective_price = reference + (execute_price - reference) × 0.30
```

---

## 8. MİMARİ VE VERİ AKIŞI

### 8.1 Üretim Emri — Tam Döngü

```
[1] React: POST /factories/:id/production { recipeId, quantity }
         │
[2] Fastify: auth middleware → validate energy ≥ 1
         │
[3] Service: BEGIN TRANSACTION
         ├─ Lock factory_inventories
         ├─ Verify inputs (8 demir + 3 kömür + 2 elektrik × qty)
         ├─ Deduct inputs from factory_inventories
         ├─ Deduct user energy -= 1
         ├─ INSERT production_orders (status='active', ends_at=now+duration)
         ├─ pg-boss.send('production.complete', { orderId }, { startAfter: duration_sec })
         └─ COMMIT
         │
[4] Response 201: { orderId, endsAt }
         │
[5] React: TanStack Query invalidate, countdown UI
         │
    ... duration_sec sonra ...
         │
[6] pg-boss worker 'production.complete':
         ├─ BEGIN TRANSACTION
         ├─ Add outputs to factory_inventories
         ├─ UPDATE production_orders status='completed'
         ├─ INSERT notifications (user_id=factory.owner_id)
         └─ COMMIT
         │
[7] notify service:
         ├─ Socket.io emit → room `user:{ownerId}` event `production:complete`
         ├─ FCM push (if token exists)
         └─ (Firestore'a yazılmaz)
         │
[8] React: socket listener → toast "Üretim tamamlandı!" → refetch inventory
```

### 8.2 Saatlik Maaş Tick

```
pg-boss cron '0 * * * *' → salary.pay (her aktif employment):
  escrow_check → transfer wage → payroll_tax sink → mentor_bonus
  incrementQuestProgress('shifts')
```

### 8.3 Savaş Saldırısı Akışı

```
React: POST /wars/:id/attack { energySpent: 3 }
  → calculate damage (Bölüm 2)
  → deduct ammo from user_inventories
  → burn ammo (silindi)
  → update war totals
  → Socket.io war:update to room war:{warId}
  → war_damage_logs insert
```

### 8.4 Deploy Topolojisi

```
Oyuncu → Vercel (React SPA)
           ├─ HTTPS → Railway (Fastify API + Socket.io)
           │            ├─ Neon PostgreSQL (pooler)
           │            └─ pg-boss workers (aynı process)
           └─ Firebase Auth + Firestore chat
```

### 8.5 Ortam Değişkenleri

| Değişken | Servis | Zorunlu |
|----------|--------|---------|
| DATABASE_URL | API | evet |
| FIREBASE_* | API + Web | prod'da evet |
| CORS_ORIGIN | API | evet |
| DEV_AUTH_BYPASS | API | yalnızca dev |
| VITE_API_URL | Web | evet |

---

## 9. API SÖZLEŞMESİ ÖZETİ

| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | /auth/sync | — | `{ user, wallet }` |
| GET | /regions | — | `Region[]` |
| POST | /regions/:slug/residence | — | `{ ok }` |
| POST | /factories | `{ factoryTypeId, regionId }` | `{ factory }` |
| POST | /factories/:id/production | `{ recipeId, quantity }` | `{ order }` |
| POST | /factories/:id/shift | — | `{ wage, xp }` |
| GET | /market/listings | `?regionId&itemId` | `Listing[]` |
| POST | /market/listings | `{ itemId, qty, price, regionId }` | `{ listing }` |
| POST | /market/buy/:id | `{ quantity }` | `{ trade }` |
| POST | /politics/parties | `{ name }` | `{ party }` |
| POST | /wars/:id/attack | `{ energySpent }` | `{ damage }` |
| GET | /health | — | `{ status: "ok" }` |

**Socket events:** `production:complete`, `war:update`, `war:ended`, `election:update`, `notification`

---

## SONUÇ

Bu MASTER PLAN, Hegemonia'nın tüm sayısal, algoritmik ve veritabanı kurallarını tek belgede toplar. Kodlama sırasında:

1. `packages/shared/src/formulas/` → Bölüm 2 formülleri
2. `packages/shared/src/constants/items.ts` → Bölüm 3 tarifleri
3. `apps/api/src/db/schema/` → Bölüm 5 şeması
4. `apps/web/src/features/onboarding/` → Bölüm 4 akışı

**Belge durumu:** v1.0 — Kodlamaya hazır, gri alan yok.

---

*Hegemonia MASTER PLAN v1.0 — Lead Game Designer & Senior Backend Engineer*
