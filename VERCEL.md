# 🚀 Η εφαρμογή στο Vercel, αυτόνομη

Η σελίδα τρέχει πλέον και έξω από το claude.ai. Αποτελείται από τρία κομμάτια:

| Κομμάτι | Τι κάνει | Κόστος |
|---|---|---|
| **Vercel** | Φιλοξενεί τη σελίδα και τα `api/` (τιμές Crypto.com/CoinGecko, ειδήσεις, Καθηγητής) | Δωρεάν (Hobby) |
| **Firebase** | Η κοινή βάση (Firestore) και η σύνδεση μελών (Google ή email) | Δωρεάν μέχρι ~50.000 αναγνώσεις / 20.000 εγγραφές τη μέρα |
| **GitHub Actions** | Ο «φύλακας»: κρατά τη σελίδα ανοιχτή 24/7 σε έναν αόρατο browser, για να τρέχουν μόνα τους τα bot | Δωρεάν (το repo είναι δημόσιο) |
| Anthropic API *(προαιρετικό)* | Ο Καθηγητής (AI), οι μεταφράσεις ειδήσεων, οι αναλύσεις | Πληρώνεις ό,τι χρησιμοποιείς |

Τα δεδομένα δεν τα βλέπει κανείς έξω από την παρέα: την ασφάλεια την κάνουν οι κανόνες του Firestore (λίστα email).

---

## Βήμα 1 · Firebase (≈10 λεπτά)

1. Μπες στο <https://console.firebase.google.com> → **Create a project** (π.χ. `trading-journal`). Το Google Analytics δεν χρειάζεται.
2. **Build → Firestore Database → Create database** → *Production mode* → τοποθεσία `europe-west` (π.χ. Φρανκφούρτη).
3. **Firestore → Rules**: σβήσε ό,τι έχει και επικόλλησε το [`firebase/firestore.rules`](firebase/firestore.rules).
   Στο `admin()` βάλε τα email των **διαχειριστών** και στο `bot()` το email του bot (βήμα 5). → **Publish**.
   Τα υπόλοιπα μέλη **δεν** μπαίνουν στους κανόνες: γράφονται μόνα τους και τα εγκρίνει διαχειριστής από τη σελίδα (λογαριασμός → 👥 Μέλη & αιτήματα).
4. **Build → Authentication → Get started** → στο *Sign-in method* ενεργοποίησε **Google** και **Email/Password**.
5. **Authentication → Users → Add user**: φτιάξε τον λογαριασμό του bot, π.χ. `bot@trading-journal.app` με δυνατό κωδικό.
   (Δεν χρειάζεται να είναι αληθινό email.)
6. **Project settings (⚙️) → General → Your apps → `</>` (Web)** → δώσε ένα όνομα → **Register app**.
   Θα δεις ένα `firebaseConfig = { apiKey: "...", authDomain: "...", ... }`. Κράτα το.

## Βήμα 2 · Vercel (≈5 λεπτά)

1. Μπες στο <https://vercel.com> με τον λογαριασμό GitHub → **Add New… → Project** → διάλεξε το `jimysnet/trading-journal` → **Import**.
2. *Framework Preset*: **Other**. Τα υπόλοιπα τα ρυθμίζει μόνο του το `vercel.json`.
3. Άνοιξε το **Environment Variables** και πρόσθεσε:

   | Όνομα | Τιμή |
   |---|---|
   | `FIREBASE_CONFIG` | Το config του βήματος 1.6 σε μορφή JSON, σε μία γραμμή, με εισαγωγικά στα ονόματα. Π.χ. `{"apiKey":"AIza…","authDomain":"trading-journal-xxxx.firebaseapp.com","projectId":"trading-journal-xxxx","storageBucket":"…","messagingSenderId":"…","appId":"…"}` |
   | `ALLOWED_EMAILS` | Τα ίδια email με τους κανόνες, χωρισμένα με κόμμα (ποιος μπορεί να μιλά με τον Καθηγητή) |
   | `ANTHROPIC_API_KEY` | *(προαιρετικό)* κλειδί από <https://console.anthropic.com>. Χωρίς αυτό δεν εμφανίζεται ο Καθηγητής-AI |
   | `COINGECKO_API_KEY` | *(προαιρετικό, συνιστάται)* δωρεάν «Demo» κλειδί από <https://www.coingecko.com/en/api/pricing> |

4. **Deploy**. Στο τέλος θα πάρεις μια διεύθυνση, π.χ. `https://trading-journal-xxxx.vercel.app`.
5. Γύρνα στο Firebase → **Authentication → Settings → Authorized domains → Add domain** και βάλε αυτή τη διεύθυνση (χωρίς `https://`).

## Βήμα 3 · Ο φύλακας στο GitHub (≈3 λεπτά)

1. Στο GitHub: **jimysnet/trading-journal → Settings → Secrets and variables → Actions → New repository secret**, τρία secrets:
   - `TJ_URL` → η διεύθυνση του Vercel (π.χ. `https://trading-journal-xxxx.vercel.app`)
   - `TJ_BOT_EMAIL` → το email του bot (βήμα 1.5)
   - `TJ_BOT_PASSWORD` → ο κωδικός του bot
2. **Actions** → αν ζητήσει, πάτα *I understand… enable workflows* → **runner → Run workflow**.
   Από εκεί και πέρα ξεκινά μόνος του κάθε 6 ώρες (βάρδιες σχεδόν 6 ωρών, χωρίς κενά μεγαλύτερα από ~10′).

## Βήμα 4 · Πρώτη μέρα

1. Άνοιξε τη διεύθυνση του Vercel και συνδέσου (Google ή email). Το ίδιο κάνουν και τα μέλη.
2. **🤖 AI Bot → ⚙️ Ρυθμίσεις → άναψε τον Αυτόματο.** Η βάση ξεκινά καθαρή, οπότε ο Αυτόματος ξεκινά σβηστός. Τα έτοιμα προφίλ (Turtle, ⚡ κ.λπ.) φτιάχνονται μόνα τους.
3. Κλείσε τη σελίδα. Στο *🖥️ Τρέχει από* θα βλέπεις «🤖 Φύλακας»: ο φύλακας σαρώνει, ανοίγει και κλείνει τις demo εντολές.

---

## Καλό να ξέρεις

- **Η βάση ξεκινά από το μηδέν.** Ό,τι υπάρχει στο claude.ai δεν μεταφέρεται.
- **Τιμές:** χωρίς τους connectors του claude.ai, οι τιμές έρχονται από τα δημόσια API του Crypto.com (έως 300 κεριά ανά αίτημα, αντί για 50) και του CoinGecko. Οι ειδήσεις έρχονται από τα RSS των Cointelegraph, CoinDesk, Decrypt, Bitcoin Magazine και CryptoSlate.
- **Όρια Firebase:** αν κάποια μέρα ξεπεραστούν τα δωρεάν όρια, η βάση σταματά να γράφει μέχρι τα μεσάνυχτα (ώρα Αμερικής). Η λύση είναι το πακέτο *Blaze* (πληρώνεις μόνο ό,τι ξεπερνά τα δωρεάν όρια, συνήθως λίγα λεπτά του ευρώ).
- **GitHub:** τα προγραμματισμένα workflows σταματούν αν περάσουν 60 μέρες χωρίς καμία αλλαγή στο repo. Τότε αρκεί ένα *Run workflow*.
- Το repo πρέπει να μείνει **δημόσιο**. Σε ιδιωτικό repo, ο φύλακας θα έκαιγε τα δωρεάν λεπτά του GitHub μέσα σε 2 μέρες. Ο κώδικας φαίνεται, τα δεδομένα όχι.
- Ούτε εδώ δεν μπαίνουν κλειδιά ανταλλακτηρίων. Όλα είναι demo (paper trading).

## Για αλλαγές στον κώδικα

```
python3 tools/build.py        # src/ → dist/   (ό,τι ανεβαίνει στο claude.ai)
python3 tools/build_site.py   # dist/ + site-src/ → site/   (ό,τι σερβίρει το Vercel)
git commit … && git push      # το Vercel ανεβάζει μόνο του τη νέα έκδοση
```
