# Rotation des secrets — À faire avant tout autre push

Ce document liste les actions de sécurité à exécuter suite à l'audit du projet.
Coche les cases au fur et à mesure.

## Résumé de la fuite

Le repo `bedo-48/productivity-saas` sur GitHub est public. L'audit a trouvé :

| Élément | Exposé publiquement ? | Gravité |
|---------|----------------------|---------|
| `JWT_SECRET` en clair dans `COMMANDES_DU_JOUR.md` ligne 55 | OUI (commit `d0d38e0`) | CRITIQUE |
| `frontend/.env` (clés Firebase web) | OUI | Faible — ces clés sont publiques par design |
| `backend/.env` (password DB, JWT, Resend) | NON — jamais commité | OK, mais à garder tel quel |

Le fichier `COMMANDES_DU_JOUR.md` a déjà été nettoyé (JWT remplacé par un placeholder) dans cette session, mais la version compromise **reste dans l'historique git**. Il faut :
1. Faire tourner le secret (sinon quelqu'un qui a cloné avant peut forger des tokens)
2. Optionnellement purger l'historique

---

## ÉTAPE 1 — Commit les corrections déjà faites

```bash
cd C:\Users\obedm\OneDrive\Documents\productivity-saas
git add COMMANDES_DU_JOUR.md backend/.gitignore frontend/.gitignore
git commit -m "security: scrub JWT secret from docs, tighten .gitignore"
```

---

## ÉTAPE 2 — Sortir frontend/.env du tracking

Même si les clés Firebase web sont publiques par design, c'est une mauvaise habitude de commiter des `.env`. Le fichier `frontend/.gitignore` l'ignore désormais, mais il faut retirer le fichier déjà tracké :

```bash
git rm --cached frontend/.env
git commit -m "security: untrack frontend/.env (now in .gitignore)"
```

Le fichier reste sur ton disque — seul le tracking git est retiré.

- [ ] Commité

---

## ÉTAPE 3 — Régénérer le JWT_SECRET (CRITIQUE)

Le secret actuel a fuité publiquement. Tant qu'il est actif, quelqu'un peut forger des tokens JWT valides pour n'importe quel utilisateur.

### 3a. Générer un nouveau secret

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Copie la valeur imprimée.

- [ ] Nouveau secret généré

### 3b. Mettre à jour le backend local

Édite `backend/.env` et remplace la valeur de `JWT_SECRET` par le nouveau secret.

- [ ] `backend/.env` mis à jour

### 3c. Mettre à jour Render

1. Va sur https://dashboard.render.com
2. Sélectionne ton service backend (productivity-saas)
3. Onglet **Environment**
4. Édite la variable `JWT_SECRET` → colle le nouveau secret
5. Save — Render redéploie automatiquement

- [ ] Render mis à jour

### 3d. Effet

Toutes les sessions actives qui utilisent encore un JWT legacy seront invalidées et les utilisateurs concernés devront se reconnecter. Les sessions Firebase (ID tokens) ne sont pas affectées — elles sont signées par Google, pas par ce secret. Comme le projet est en pleine migration vers Firebase, l'impact utilisateur devrait être minime.

---

## ÉTAPE 4 — (Optionnel mais recommandé) Purger l'historique git

L'ancien JWT secret reste dans l'historique sur GitHub même après le scrub. Pour vraiment le faire disparaître, il faut réécrire l'historique.

### Option A — `git filter-repo` (recommandé)

```bash
# Installer (une fois)
pip install git-filter-repo

# Remplacer toutes les occurrences du secret dans l'historique.
# NE PAS commiter replacements.txt — il contient la valeur compromise.
cd C:\Users\obedm\OneDrive\Documents\productivity-saas

# Récupère l'ancien secret depuis le commit d0d38e0 et écris-le dans
# un fichier TEMPORAIRE (sera supprimé après), au format "ancien==>REDACTED" :
git show d0d38e0:COMMANDES_DU_JOUR.md | \
  grep -oE "[a-f0-9]{128}" | head -1 | \
  awk '{print $0"==>REDACTED"}' > replacements.txt

git filter-repo --replace-text replacements.txt
rm replacements.txt

# Force-push (réécrit l'historique distant)
git push --force origin main
```

### Option B — BFG Repo Cleaner

```bash
# Télécharge bfg.jar depuis https://rtyley.github.io/bfg-repo-cleaner/
java -jar bfg.jar --replace-text replacements.txt
git reflog expire --expire=now --all && git gc --prune=now --aggressive
git push --force
```

### Avertissements

- Tout clone/fork existant deviendra incompatible — coordonner avec tes collaborateurs s'il y en a
- Les anciens commits ne seront plus accessibles par leur SHA
- **Même après filter-repo, considère que le secret EST compromis** (quelqu'un a pu le copier). La rotation de l'ÉTAPE 3 est non-négociable

- [ ] Historique purgé (optionnel)

---

## ÉTAPE 5 — Par précaution : changer le password Postgres

Le password `Obedmavungu28@` n'a **pas** été trouvé dans l'historique git. Il n'est que dans `backend/.env` local. Donc il n'est *probablement* pas compromis. Par contre :

- Si tu as partagé ton écran dans un stream ou une vidéo, le password a pu fuiter visuellement
- Il contient ton prénom, ce qui le rend devinable

Recommandation : le changer quand même.

```bash
# Sur Render, Dashboard → PostgreSQL service → Info
# Clique "Rotate Password" si dispo, sinon :

# Ou directement dans psql :
ALTER USER postgres WITH PASSWORD '<nouveau-password-fort-aléatoire>';
```

Puis mettre à jour `DB_PASSWORD` dans :
- `backend/.env` local
- Variables d'environnement Render

Si le backend Render utilise `DATABASE_URL` (format `postgres://user:pass@host/db`), il faut aussi la mettre à jour.

- [ ] Password DB changé (facultatif mais conseillé)

---

## ÉTAPE 6 — Vérification finale

```bash
# 1. Vérifier qu'aucun .env n'est tracké
git ls-files | grep -E "^(backend|frontend)/\.env$"
# Ne doit rien retourner

# 2. Vérifier qu'aucun secret évident ne traîne
git grep -n -E "(password|secret|api_key|token)\s*=\s*[a-zA-Z0-9]{16,}" -- ':!*.example' ':!SECURITY_ROTATION.md'
# Doit retourner seulement des placeholders ou rien

# 3. Vérifier que les .env.example sont bien là
ls backend/.env.example frontend/.env.example
```

- [ ] Toutes les vérifications OK

---

## À retenir pour la suite

- **Jamais** coller un secret dans un fichier `.md` ou `.txt` — toujours référencer une variable d'environnement
- Avant chaque commit : `git diff --cached | grep -iE "password|secret|api.?key|token"`
- Activer la protection "Push protection" de GitHub (Settings → Code security) — elle bloque le push si elle détecte un secret
- Utiliser `git-secrets` ou `trufflehog` en pre-commit hook
