# Scripts de maintenance

## Reset complet des utilisateurs

Pour repartir d'une base vide quand tu as des erreurs d'auth persistantes.

### 1. Arrêter le serveur backend

Coupe `npm run dev` / `npm start` avant de lancer les scripts, sinon le serveur
peut recréer des lignes pendant la purge (cron, sockets).

### 2. Purger la base PostgreSQL

```bash
cd backend
node scripts/reset-users-db.js
```

Le script affiche la liste des users, demande de taper `DELETE` pour confirmer,
puis `TRUNCATE ... RESTART IDENTITY CASCADE` sur :

- `users`
- `tasks`
- `email_verification_codes`
- `task_shares`
- `task_activity_log`
- `notifications`

Les séquences d'ID repartent à 1.

Pour une exécution non-interactive : `node scripts/reset-users-db.js --yes`.

### 3. Purger Firebase Authentication

```bash
cd backend
node scripts/reset-users-firebase.js
```

Prérequis : `FIREBASE_SERVICE_ACCOUNT` ou `GOOGLE_APPLICATION_CREDENTIALS` dans
`.env`. Le script liste tous les users Firebase, demande confirmation, puis
appelle `auth().deleteUsers(...)` par lots de 1000.

### 4. Vider le state côté frontend

Dans le navigateur (DevTools → Application → Storage) :

- Supprimer `localStorage` et `sessionStorage` du domaine
- Se déconnecter / vider les cookies si besoin

Ça évite qu'un ancien token JWT ou session Firebase traîne et provoque
`ACCOUNT_NOT_FOUND` après la purge.
