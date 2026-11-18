# Trading Journal στο Raspberry Pi

Ο συλλέκτης των **Big trades** τρέχει στο Pi, 24/7, για Futures και Spot. Γράφει τα δεδομένα στον δίσκο σου (SQLite), όχι στο Firebase, άρα ο χώρος δεν είναι πρόβλημα.

Μόλις ξεκινήσει, γίνονται αυτόματα τα εξής:
- **Η σελίδα το βρίσκει μόνη της.** Το Pi γράφει τη διεύθυνσή του στη βάση κάθε 15′, και το Order Flow διαβάζει από εκεί το ιστορικό. Στα «Στατιστικά» θα δεις «🏠 Pi».
- **Ο φύλακας του GitHub σταματά να γράφει big trades στο Firebase.** Αν το Pi πέσει για πάνω από 45′, ξαναρχίζει μόνος του.
- **Το ιστορικό μεταφέρεται.** Ό,τι είχε ήδη μαζευτεί στο Firebase περνάει στο Pi μία φορά.
- **Το ιστορικό είναι μόνο για μέλη.** Το API δέχεται μόνο συνδεδεμένα, εγκεκριμένα μέλη, με τους ίδιους κανόνες με το Firebase.
- **Κρατάει αντίγραφο ασφαλείας κάθε βράδυ στις 04:00**, στο `data/backup`. Κρατάει τα 7 τελευταία.

## Εγκατάσταση

```bash
git clone https://github.com/jimysnet/trading-journal.git
cd trading-journal/pi
cp .env.example .env
nano .env          # συμπλήρωσε τα στοιχεία (βλ. παρακάτω)
docker compose up -d --build
docker logs -f tj-bigtr
```

Στο `.env`:

| Τιμή | Από πού |
|---|---|
| `FIREBASE_PROJECT_ID`, `FIREBASE_API_KEY` | Vercel → Settings → Environment Variables → `FIREBASE_CONFIG` (`projectId`, `apiKey`) |
| `TJ_BOT_EMAIL`, `TJ_BOT_PASSWORD` | ίδια με τα GitHub secrets του φύλακα |
| `PUBLIC_URL` | η https διεύθυνση του Pi (βλ. παρακάτω) |
| `DATA_PATH` | πού θα γράφεται η βάση, π.χ. `/mnt/hdd/trading-journal` |

## Πώς φτάνει η σελίδα στο Pi (https)

Η σελίδα είναι σε https, οπότε και το Pi χρειάζεται https. Διάλεξε **έναν** από τους τρεις τρόπους.

**Α. Cloudflare Tunnel.** Είναι δωρεάν και δεν θέλει άνοιγμα θυρών στο ρούτερ.
1. Πήγαινε Cloudflare → Zero Trust → Networks → Tunnels → Create tunnel (Cloudflared). Αντέγραψε το token στο `TUNNEL_TOKEN`.
2. Στο Public hostname βάλε π.χ. `bigtr.το-domain-σου` → Service `http://tj-bigtr:8787`.
3. Βάλε `PUBLIC_URL=https://bigtr.το-domain-σου` και τρέξε `docker compose --profile tunnel up -d --build`.

**Β. Ο reverse proxy που ήδη έχεις** (π.χ. για το WordPress: Nginx Proxy Manager, Traefik, Caddy). Πρόσθεσε ένα host, π.χ. `bigtr.το-domain-σου`, που να δείχνει στο `http://IP-του-Pi:8787` με SSL.

**Γ. Tailscale Funnel.** Τρέξε `tailscale funnel 8787`, και η διεύθυνση `https://….ts.net` που σου δίνει μπαίνει στο `PUBLIC_URL`.

Για έλεγχο, άνοιξε το `https://η-διεύθυνσή-σου/health`. Πρέπει να δεις `"ok":true` και `"live":{"f":true,"s":true}`.

## Χρήσιμα

```bash
docker compose pull && docker compose up -d --build   # μετά από ενημέρωση (git pull)
docker logs --tail 50 tj-bigtr                         # τι κάνει
du -h data/                                            # πόσο χώρο πιάνει
```

Η βάση πιάνει περίπου **3–5 MB τη μέρα**, για 13 νομίσματα σε Futures και Spot.
