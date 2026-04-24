# 🚀 Commandes à lancer aujourd'hui — dans l'ordre

---

## ÉTAPE 1 — Backend : installer les packages

```bash
cd backend
npm install helmet express-rate-limit express-validator nodemailer socket.io morgan node-cron
```

---

## ÉTAPE 2 — Frontend : installer les packages

```bash
cd ../frontend
npm install socket.io-client
```

---

## ÉTAPE 3 — Migration de la base de données sur Render

### 3a. Récupère ta connection string Render
1. Va sur https://dashboard.render.com
2. Clique sur ton service **PostgreSQL**
3. Dans l'onglet **"Info"**, copie la ligne **"External Database URL"**
   Elle ressemble à : `postgresql://user:password@host/dbname`

### 3b. Lance la migration (dans ton terminal Windows)

```bash
# Depuis la racine du projet
psql "postgresql://USER:PASSWORD@HOST/DBNAME" -f migrations/001_add_features.sql
```

> Si psql n'est pas installé sur Windows :
> - Télécharge PostgreSQL : https://www.postgresql.org/download/windows/
> - Ou utilise le **Render Shell** (onglet "Shell" sur ton service Render) et colle le SQL directement

### Alternative — Render Shell (plus simple)
1. Va sur ton service Render → onglet **"Shell"**
2. Ouvre le fichier `migrations/001_add_features.sql` et copie-colle le contenu
3. Lance-le directement dans le shell Render

---

## ÉTAPE 4 — Configurer les variables d'environnement sur Render (Backend)

Dans Render → ton service backend → **"Environment"**, ajoute ces variables :

| Clé | Valeur |
|-----|--------|
| `JWT_SECRET` | `<générer-avec : node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">` |
| `FRONTEND_URL` | `https://TON-APP.vercel.app` (ton URL Vercel) |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | `tonmail@gmail.com` |
| `SMTP_PASS` | `xxxx xxxx xxxx xxxx` (App Password Gmail) |

### Comment obtenir un App Password Gmail :
1. Va sur https://myaccount.google.com/security
2. Active la **vérification en 2 étapes** (si pas déjà fait)
3. Cherche **"Mots de passe des applications"**
4. Crée-en un pour "Mail" → copie le code à 16 caractères

---

## ÉTAPE 5 — Déployer le backend sur Render

```bash
cd backend
git add .
git commit -m "feat: add email verification, archive, sharing, analytics, real-time, security"
git push
```

Render redéploie automatiquement dès que tu push.

---

## ÉTAPE 6 — Déployer le frontend sur Vercel

```bash
cd frontend
git add .
git commit -m "feat: new dashboard with tabs, task aging, insights, share modal"
git push
```

Vercel redéploie automatiquement.

---

## ÉTAPE 7 — Test final (checklist)

- [ ] Register → reçois un email avec le code 6 chiffres
- [ ] Entre le code → tu arrives sur le dashboard
- [ ] Crée une tâche avec priorité High → bord gauche rouge
- [ ] Archive une tâche → elle disparaît de "My Tasks", apparaît dans "Archive"
- [ ] Restore → elle revient dans "My Tasks"
- [ ] Partage une tâche avec un autre compte → l'autre voit dans "Shared"
- [ ] Panel "Productivity Insights" → stats visibles
- [ ] Tâches vieilles de +7 jours → section "Needs attention"

---

## En cas de problème

### Le backend ne démarre pas ?
```bash
cd backend
npm run dev
# Lis l'erreur dans le terminal
```

### Erreur "column does not exist" ?
La migration ne s'est pas lancée. Relance-la sur ta DB Render.

### Emails qui ne partent pas ?
C'est normal si SMTP_USER/SMTP_PASS sont vides.
Le backend continue de fonctionner — les emails sont juste ignorés.
Configure Gmail App Password quand tu veux.

### CORS error dans la console ?
Sur Render, vérifie que FRONTEND_URL = ton URL Vercel exact (sans slash à la fin).
