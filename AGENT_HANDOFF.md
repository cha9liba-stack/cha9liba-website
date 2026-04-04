# Palma Renta Car — Agent Handoff Document
**Dernière mise à jour**: Avril 2026

---

## Vue d'ensemble du projet

Application web de gestion de location de voitures pour **Ste Palma Rent a Car** (Kélibia, Tunisie).
Convertie d'une application desktop Python/PySide6 vers **React + TypeScript + Tauri**.

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Frontend | React 18 + TypeScript + Vite |
| Style | Tailwind CSS v4 |
| State | Zustand + React Hook Form |
| Backend DB | Firebase Realtime Database (REST API) |
| Cache local | IndexedDB (via helpers dans `src/lib/db.ts`) |
| i18n | i18next (Français par défaut + Arabe) |
| QR Code | `qrcode` npm package |
| Desktop | Tauri 2 (optionnel, non compilé — Rust non installé) |

---

## Firebase

- **Project ID**: `palmarentacare`
- **Database URL**: `https://palmarentacare-default-rtdb.europe-west1.firebasedatabase.app/`
- **⚠️ PROBLÈME CRITIQUE**: Le `apiKey` Web SDK n'est pas configuré dans `src/lib/firebase.ts`
  - Le fichier contient un placeholder: `"AIzaSyDummy-placeholder-not-needed-for-rest"`
  - La lecture fonctionne via REST API (DB publique en lecture)
  - La **connexion utilisateur** et l'**écriture** nécessitent le vrai `apiKey`
  - Pour l'obtenir: Firebase Console → projet `palmarentacare` → Project Settings → Your apps → Web app
  - Si aucune web app n'existe: Add app → Web → copier le config

### Structure Firebase
```
/contracts/{id}     — Contrats (champs en arabe/français, voir contractMapper.ts)
/invoices/{id}      — Factures (ancien format arabe + nouveau format TypeScript)
/users/{id}         — Utilisateurs (username, password, role, permissions)
/logs/{id}          — Audit log
```

---

## Structure du projet

```
car-rental-app/
├── public/
│   ├── logo.png              — Logo Palma (sidebar + login)
│   ├── invoice_logo.png      — Logo spécifique aux factures (plus grand)
│   ├── invoice_facture.png   — Template PNG facture (non utilisé actuellement)
│   ├── invoice_bon.png       — Template PNG bon de livraison (non utilisé)
│   ├── invoice_devis.png     — Template PNG devis (non utilisé)
│   ├── exemple.jpg           — Template contrat 2026+ (avec taxe 2dt)
│   ├── exemple2025.jpg       — Template contrat avant 2026 (sans taxe 2dt)
│   ├── contrat_bg.png        — Verso du contrat (page 2 à l'impression)
│   └── field_positions.json  — Positions des champs sur le template contrat
│
├── src/
│   ├── lib/
│   │   ├── firebase.ts       — Config Firebase (⚠️ apiKey manquant)
│   │   ├── db.ts             — IndexedDB helpers (cache local)
│   │   ├── contractMapper.ts — Mapping champs Firebase (arabe) ↔ TypeScript
│   │   ├── sheetsConfig.ts   — Credentials Google Sheets (désactivé)
│   │   └── contractMapper.ts — Bidirectionnel: Firebase ↔ Contract interface
│   │
│   ├── types/
│   │   ├── index.ts          — Contract, User, MaintenanceCar, Reservation, UnpaidRecord
│   │   └── invoice.ts        — Invoice, InvoiceLine, InvoiceClient, InvoiceType
│   │
│   ├── services/
│   │   ├── contractService.ts  — CRUD contrats (REST Firebase + IndexedDB fallback)
│   │   ├── invoiceService.ts   — CRUD factures + calculs + montant en lettres + normalizeInvoice()
│   │   ├── authService.ts      — Login/logout (Firebase /users)
│   │   ├── auditService.ts     — Log actions utilisateur
│   │   ├── lookupService.ts    — Auto-fill: prochain N° contrat, recherche par CIN
│   │   └── sheetsService.ts    — Google Sheets sync (DÉSACTIVÉ)
│   │
│   ├── store/
│   │   ├── useAuthStore.ts     — Zustand: utilisateur connecté (persisté)
│   │   └── useContractStore.ts — Zustand: liste contrats + recherche
│   │
│   ├── components/
│   │   ├── Layout/
│   │   │   ├── AppLayout.tsx   — Layout principal + chargement auto des contrats au login
│   │   │   └── Sidebar.tsx     — Navigation (Dashboard, Contrats, Flotte, Factures, Paramètres)
│   │   │
│   │   ├── Contracts/
│   │   │   ├── ContractModal.tsx        — Formulaire création/édition contrat (5 onglets)
│   │   │   ├── ContractPreview.tsx      — Aperçu canvas + impression + drag&drop champs
│   │   │   ├── ContractLookupDialog.tsx — Récupérer données d'un ancien contrat
│   │   │   ├── DriverLookupDialog.tsx   — Recherche conducteur par CIN
│   │   │   ├── RegistrationInput.tsx    — Champ immatriculation XXXX TU XXX + auto-fill voiture
│   │   │   └── tabs/
│   │   │       ├── VehicleTab.tsx    — Véhicule + dates + auto-fill ville depuis lieu départ
│   │   │       ├── Driver1Tab.tsx    — Conducteur 1 + auto-fill par CIN (debounce 600ms)
│   │   │       ├── Driver2Tab.tsx    — Conducteur 2 (optionnel)
│   │   │       ├── FinancialTab.tsx  — Financier + calcul automatique (2026+ taxe 2dt)
│   │   │       └── OtherTab.tsx      — Ville + date
│   │   │
│   │   └── Invoices/
│   │       ├── InvoiceModal.tsx  — Création facture (multi-contrats, auto-fill client)
│   │       └── InvoicePrint.tsx  — Aperçu HTML + impression + QR code local
│   │
│   ├── pages/
│   │   ├── Login.tsx      — Page connexion
│   │   ├── Dashboard.tsx  — Statistiques + derniers contrats
│   │   ├── Contracts.tsx  — Liste contrats + tri par colonne + recherche
│   │   ├── Fleet.tsx      — Gestion flotte 30 voitures + code couleur
│   │   ├── Invoices.tsx   — Liste factures (lazy loaded pour éviter crash)
│   │   └── Settings.tsx   — Langue + mot de passe + vider cache IndexedDB
│   │
│   └── i18n/
│       ├── index.ts  — Langue par défaut: FRANÇAIS (fr)
│       ├── ar.json   — Traductions arabes
│       └── fr.json   — Traductions françaises
```

---

## Fonctionnalités implémentées

### Contrats
- ✅ CRUD complet
- ✅ Numéro de contrat automatique (max existant + 1)
- ✅ Champ immatriculation XXXX TU XXX avec auto-fill voiture depuis flotte des 30 voitures
- ✅ Auto-fill conducteur par CIN (recherche dans contrats précédents, debounce 600ms)
- ✅ Récupérer données d'un ancien contrat complet (bouton "Récupérer un contrat")
- ✅ Auto-fill Ville depuis Lieu départ
- ✅ Calcul financier automatique:
  - TOTAL FACTURE (saisi par l'utilisateur directement)
  - TOTAL HT = TOTAL FACTURE / 1.19
  - TVA = TOTAL FACTURE × 0.19 / 1.19
  - Taxe 2dt/j = NJ × 2 (uniquement contrats 2026+, Article 20-7 loi finances 2026)
  - Somme = TOTAL FACTURE + Taxe2dt + Timbre (1.000)
  - `plusMoinsDivers` dans Firebase = timbre dans anciens contrats (ignoré dans calcul)
- ✅ Tri par colonne (N° contrat, nom, marque, dates, montant) avec indicateur ↑↓
- ✅ Recherche en temps réel

### Aperçu et impression contrat
- ✅ Rendu sur canvas avec template JPG
- ✅ Template 2026+ (`exemple.jpg`) vs 2025 (`exemple2025.jpg`) selon année du contrat
- ✅ Impression 2 pages: recto (données) + verso (`contrat_bg.png`)
- ✅ Mode "données seulement" (sans fond, sans N° contrat) pour formulaires pré-imprimés
- ✅ Drag & drop des champs sur le canvas (positions sauvegardées en localStorage: `palma_field_positions`)
- ✅ Paramètres impression: couleur texte, couleur N° contrat, taille police (sauvegardés: `palma_print_settings`)
- ✅ Taxe 2dt calculée et affichée sur le contrat (2026+)
- ✅ Timbre fiscal 1.000 affiché (2026+ uniquement, évite doublon avec anciens contrats)
- ✅ `plusMoinsDivers` masqué pour contrats 2026+ (évite doublon)

### Flotte (30 voitures)
- ✅ Tableau d'état complet avec code couleur:
  - Gris transparent = en cours de location (mktariya)
  - Rouge = retard (date retour dépassée)
  - Vert = disponible
  - Violet = en panne/entretien
- ✅ Navigation par date (voir état à n'importe quelle date historique)
- ✅ Colonnes complètes: Voiture, Série, Sortie, Entrée, Nom, Tél, I (prix/j), NJ, Taxe 2dt, Montant T, Avance, Reste, N°C, Km
- ✅ Calcul: I = TOTAL FACTURE / NJ, Montant T = TOTAL FACTURE + (NJ × 2) pour 2026+
- ✅ Gestion entretien (ajout/suppression avec dates)
- ✅ Gestion réservations
- ✅ Gestion impayés avec total restant
- ✅ Gestionnaire de flotte (liste des 30 voitures modifiable, sauvegardée en localStorage: `palma_fleet_cars`)

### Factures
- ✅ 3 types: Facture / Bon de livraison / Devis
- ✅ Numérotation automatique (format: 09/2026)
- ✅ Ajout de plusieurs contrats par facture avec recherche
- ✅ Auto-fill client depuis premier contrat ajouté
- ✅ Calcul: Montant HT + TVA 19% + TSL 2dt/j + Timbre (selon type)
- ✅ Montant en lettres français (généré automatiquement même pour anciennes factures)
- ✅ QR code généré localement (contient: N°, date, client, total, liste contrats)
- ✅ Impression HTML avec logo `invoice_logo.png`
- ✅ Compatible avec anciens formats Firebase (champs arabes normalisés par `normalizeInvoice()`)
- ✅ Langue par défaut: **Français**

### Authentification
- ✅ Login avec username/password (stockés dans Firebase /users)
- ✅ Rôles: admin / user
- ✅ Session persistée (Zustand persist)

---

## Ce qui reste à faire / problèmes connus

### 🔴 Critique
1. **Firebase apiKey manquant** — Sans lui, la connexion utilisateur et l'écriture ne fonctionnent pas correctement
   - Fichier: `src/lib/firebase.ts` ligne 8
   - Obtenir depuis: Firebase Console → palmarentacare → Project Settings → Web app
   - Remplacer `"AIzaSyDummy-placeholder-not-needed-for-rest"` par le vrai apiKey

### 🟡 Important
2. **Déploiement web** — Prêt pour Vercel/Netlify/Firebase Hosting (après fix apiKey)
   - Commande: `npm run build` puis uploader le dossier `dist/`
   - Ou: `npx vercel` dans le dossier `car-rental-app/`
   - Après déploiement: mettre à jour le QR code des factures pour pointer vers l'URL de la facture

3. **Google Sheets sync désactivé** — Le service est codé (`src/services/sheetsService.ts`) mais désactivé
   - Credentials disponibles dans `src/lib/sheetsConfig.ts`
   - Nécessite Tauri (Rust) pour les appels sécurisés

4. **Tauri non compilé** — Rust n'est pas installé sur la machine
   - Pour compiler: installer Rust depuis https://rustup.rs puis `npm run tauri dev`

5. **Positions des champs contrat** — Utiliser le mode "Déplacer les champs" dans l'aperçu pour ajuster
   - Sauvegardées en localStorage: `palma_field_positions`

### 🟢 Améliorations futures
6. **Page facture publique** — Créer une route `/invoices/view/:id` accessible sans login pour le QR code
7. **Dashboard** — Les revenus mensuels ne comptent que les contrats chargés en mémoire
8. **Factures** — Ajouter édition des factures existantes

---

## Données importantes

### Flotte (30 voitures) — définie dans `src/pages/Fleet.tsx` → `DEFAULT_FLEET`
```
7468TU245 Kia Stonic D        | 9192TU234 Renault Clio Bleu
5605TU236 Hyundai I20 Noir    | 5606TU236 Hyundai I20 Blanc
8305TU238 Kia Rio             | 4485TU240 VW Virtus Blanc
4486TU240 VW Virtus Blanc     | 2526TU242 MG ZS B
2532TU242 MG ZS G             | 1389TU244 Seat Ibiza
1162TU245 Renault Clio Blanc  | 2504TU246 Hyundai I20 G
2508TU246 Hyundai I20 B       | 4912TU246 Kia Stonic B
203TU248  Seat Ibiza N        | 201TU248  Seat Ibiza B
1958TU248 Mahindra XUV R      | 1959TU248 Mahindra KUV300 B
1945TU251 Suzuki Swift R      | 5941TU251 Renault Clio Noir
5943TU251 Renault Clio Gris C | 7138TU251 Seat Ibiza N
7057TU252 Kia Picanto         | 9601TU252 Skoda Kushaq B
9603TU252 Skoda Kushaq Bleu   | 3541TU253 VW Virtus Gris
7378TU254 VW T-Cross          | 7379TU254 VW T-Cross
7360TU255 Citroen Berlingo    | 6155TU259 Seat Ibiza N
```

### Règles métier importantes
- **Taxe 2dt/j**: Article 20-7 loi finances 2026 — 2 TND/jour, uniquement contrats à partir du 01/01/2026
- **Timbre fiscal**: 1.000 TND, uniquement pour Facture (pas Bon de livraison ni Devis)
- **TVA**: 19% sur le montant HT
- **Formule Somme contrat**: `TOTAL FACTURE + (NJ × 2) + 1.000 timbre` (2026+)
- **Formule Somme facture**: `Montant HT + TVA + TSL 2dt/j + Timbre`
- **plusMoinsDivers** dans Firebase = timbre dans les anciens contrats (ne pas l'ajouter au calcul, ne pas l'afficher pour 2026+)
- **TOTAL PARTIEL** dans anciens contrats = TOTAL FACTURE (mapping dans `contractToLegacy`)

### Mapping Firebase ↔ TypeScript
Le fichier `src/lib/contractMapper.ts` fait la conversion bidirectionnelle.
Le fichier `src/services/invoiceService.ts` → `normalizeInvoice()` normalise les anciennes factures Firebase.

### Formats de données Firebase
**Contrats anciens** (champs arabes):
- `رقم العقد` → contractNumber
- `الاسم و اللقب` → driverName
- `Marque` → brand, `Modèl` → model
- `يوم الانطلاق` → departureDate, `يوم الرجوع` → returnDate
- `TOTAL FACTURE` → totalFacture, `المجموع` → somme

**Factures anciennes** (champs arabes):
- `رقم الفاتورة` → number
- `تاريخ الفاتورة` (DD/MM/YYYY) → date (YYYY-MM-DD)
- `معلومات_العميل.اسم_العميل` → client.name
- `العقود[].المبلغ` → lines[].amount
- `المجموع_TTC` → totalTTC

---

## Informations société

```
Ste Palma Rent a Car
Avenue du Tunis Kelibia 8090
Mail: ste.palmacar@gmail.com
Tel: 72 208711 / 22 843 531
MF: 1021113/G/A/M/000
RIB: 11109000139400278805
Instagram: palma_car
```

---

## Commandes

```bash
# Développement
npm run dev          # Lance sur http://localhost:1420

# Production
npm run build        # Build dans dist/

# Déploiement Vercel
npx vercel           # Depuis le dossier car-rental-app/

# Tauri (nécessite Rust installé)
npm run tauri dev    # Desktop app
npm run tauri build  # Compile .exe
```

---

## localStorage keys utilisées
| Clé | Contenu |
|-----|---------|
| `palma_field_positions` | Positions des champs sur le template contrat |
| `palma_print_settings` | Couleurs et tailles de police pour l'impression contrat |
| `palma_fleet_cars` | Liste des 30 voitures (modifiable par l'utilisateur) |
| `palma_maint` | Voitures en entretien (page Flotte) |
| `palma_res` | Réservations (page Flotte) |
| `palma_unpaid` | Impayés (page Flotte) |
| `auth-store` | Session utilisateur (Zustand persist) |
