# Première course en réseau — mise en service

## État et commandes

Cette branche ajoute le serveur de course et le client navigateur. Sans configuration Supabase, l’interface indique que les comptes ne sont pas configurés et interdit la création de parties ; aucun faux compte administrateur n’est fourni. Les parcours solo et le laboratoire restent utilisables.

```sh
npm install
npm test
npm run build
npm run build:server
npm run test:integration
npm run dev:server
# Dans un autre terminal
npm run dev -- --port 5174
```

Le serveur écoute sur 2567. Le client utilise `VITE_RACE_SERVER_URL` (par défaut `http://localhost:2567`). Sur téléphone, cette URL doit désigner l’ordinateur hôte, jamais `localhost` ; autoriser l’origine exacte du client dans `ALLOWED_ORIGINS`. Ne pas utiliser le service local avec des secrets de production.

## Comptes et terrains

1. Démarrer Docker et initialiser un environnement Supabase local avec la CLI officielle ; appliquer les migrations versionnées dans `supabase/migrations`.
2. Copier `.env.example` vers `.env` et saisir les clés dans ce fichier ignoré par Git. Client : URL publique et clé anonyme. Serveur : URL et clés anonyme/service. Ne jamais préfixer la clé de service par `VITE_`.
3. Autoriser `http://localhost:5174/` comme URL de retour de connexion et activer l’authentification email. Les liens locaux sont consultables dans l’outil email local de Supabase ; ne pas utiliser l’envoi à de vraies adresses pour les tests automatisés.
4. Exécuter les tests de droits avec `TEST_SUPABASE_URL`, `TEST_SUPABASE_ANON_KEY`, `TEST_SUPABASE_SERVICE_ROLE_KEY` définis dans le terminal local. Ils ne créent des utilisateurs temporaires que sur localhost et les suppriment après les assertions. Sans ces variables, le test est **ignoré**, pas réussi.
5. Se connecter dans « En ligne », créer ou importer explicitement un terrain personnel, puis vérifier la récupération dans un second navigateur. Une conversion de l’ancien type d’arrivée nécessite un second clic de confirmation ; le stockage local original reste intact.

Le schéma conserve une tête de terrain et ses révisions immuables. Un appel RPC vérifie le propriétaire, sérialise les écritures, refuse une révision obsolète et limite à 40 terrains / 128 murs / 1 Mo par document. Les tables ne sont pas modifiables directement par le navigateur. Les révisions ne sont pas publiques ; le serveur ne transmet qu’une copie validée aux participants d’une partie autorisée.

## Proposition de déploiement à approuver avant activation

- Frontend : GitHub Pages existant, variables publiques injectées au build.
- Serveur : un conteneur Node 22 sur Render en région européenne, une seule instance au départ (annuaire et jetons invités en mémoire), HTTPS/WSS et `/health`. Dockerfile : `server/Dockerfile`, contexte racine. Une autre offre de conteneur persistant peut convenir sans modifier la simulation.
- Comptes/base : projet Supabase dédié en région européenne, migrations versionnées, URL de retour `https://charlescoiffier.github.io/spin/`, fournisseur SMTP configuré avant ouverture aux invités externes.
- Coût indicatif au 31 octobre 2026 : petite instance Render autour de 7 USD/mois ; Supabase gratuit pour les essais avec ses limites, ou Pro à partir de 25 USD/mois. Donc environ 7 USD/mois pour un essai avec base gratuite, ou 32 USD/mois avec Pro, **hors emails, taxes, dépassements et évolutions tarifaires**. Ce n’est ni une souscription ni une capacité garantie. [Tarifs Render](https://render.com/pricing), [tarifs Supabase](https://supabase.com/pricing).

Le palier gratuit peut suspendre un projet ou un service inactif. Pour les premières courses ouvertes, préférer un serveur sans mise en veille. Limites de protection initiales du code : 64 salles simultanées au maximum, trois créations actives par compte et 120 requêtes HTTP/minute/adresse ; ces plafonds protègent les entrées mais ne prouvent pas que le serveur supporte 64 salles. Le plafond d’exploitation doit être abaissé après mesure sur l’instance réellement choisie. Ne pas déployer plusieurs instances avant de partager annuaire/présence et identité invitée.

## Avant publication

- Tests unitaires, compilation client/serveur et droits réels verts ; aucun test de droits ignoré ne vaut validation de sécurité.
- Deux appareils physiques et quatre clients terminent une course ; contacts activés/désactivés, mauvaise invitation, résultat simultané, arrière-plan et rechargement testés.
- Réseau à 100 et 200 ms et jitter : commande locale réactive, correction acceptable, résultat commun.
- Coupure : personnage retiré, retour possible sous 30 secondes ; si son départ est occupé, réapparition différée au départ, chronomètre continu, sans superposition forcée. Les autres poursuivent.
- Vérifier HTTPS, origines, quotas et secret de service absent de `dist`. Révoquer les anciennes versions incompatibles par numéro de protocole.
- Sauvegarder PostgreSQL via les outils Supabase, conserver la sauvegarde hors du dépôt et tester sa restauration dans un environnement d’essai. La seule présence d’une sauvegarde n’est pas une restauration vérifiée.

## Retour arrière et limites actuelles

Déployer d’abord en essai ; conserver le frontend solo précédent pour retour arrière. Un redémarrage serveur termine les salles en mémoire ; les terrains de compte persistent. Ne pas restaurer arbitrairement une salle après redémarrage avec un état de score incertain.

Les essais avec la physique du laboratoire sont identifiés séparément des records solo standards. Aucun classement réseau persistant n’est créé dans ce lot. Les nouvelles formes, sols spéciaux, bonus, sons, combat et capture restent les lots suivants de la feuille de route.
