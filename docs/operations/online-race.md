# Première course en réseau — mise en service

## État et commandes

Cette branche ajoute le serveur de course et le client navigateur. Sans configuration Supabase, l’interface indique que les comptes ne sont pas configurés et interdit la création de parties ; aucun faux compte administrateur n’est fourni. Les parcours solo et le laboratoire restent utilisables.

```sh
npm install
npm run supabase:start
npm test
npm run test:database
npm run build
npm run build:server
npm run test:integration
npm run dev:server
# Dans un autre terminal
npm run dev -- --port 5174
```

Le serveur écoute sur 2567. Le client utilise `VITE_RACE_SERVER_URL` (par défaut `http://localhost:2567`). Sur téléphone, cette URL doit désigner l’ordinateur hôte, jamais `localhost` ; autoriser l’origine exacte du client dans `ALLOWED_ORIGINS`. Ne pas utiliser le service local avec des secrets de production.

## Comptes et terrains

1. Exécuter `npm run supabase:start`. La CLI officielle 2.122.0 et son mode natif expérimental sont verrouillés dans le dépôt ; ce mode fonctionne sur ce Mac Apple Silicon sans Docker. Linux récent est également pris en charge. Le premier démarrage télécharge les services officiels et applique les migrations versionnées. [Conditions du runtime natif](https://supabase.com/docs/guides/local-development/docker-and-native-runtimes).
2. Le script crée `.env` local automatiquement, sans afficher de clé ni écraser une configuration distante. Les données et journaux restent dans `.supabase-local/`, ignoré par Git et Docker. Client et serveur utilisent seulement l’URL et la clé publique ; la lecture d’un terrain par le serveur utilise le JWT du créateur et respecte ses règles RLS. Aucune clé administrateur n’est nécessaire au serveur de jeu.
3. Les adresses locales de retour sont définies dans `supabase/config.toml`. `npm run supabase:status` affiche les URL réelles (ports attribués par la CLI), dont la boîte Mailpit qui capture les liens de connexion localement. Les emails doivent être confirmés ; ne pas envoyer à de vraies adresses dans les tests automatisés.
4. Exécuter `npm run test:database` : cette commande exige un environnement local disponible et ne masque pas une absence de base par un test ignoré. Elle charge les clés de test en mémoire, crée des comptes temporaires sur localhost puis les supprime. La commande générique `test:integration` peut ignorer ces tests si les variables `TEST_SUPABASE_*` sont absentes ; la CI exécute donc aussi explicitement `test:database`.
5. Se connecter dans « En ligne », créer ou importer explicitement un terrain personnel, puis vérifier la récupération dans un second navigateur. Une conversion de l’ancien type d’arrivée nécessite un second clic de confirmation ; le stockage local original reste intact.

Le schéma conserve une tête de terrain et ses révisions immuables. Un appel RPC vérifie le propriétaire, sérialise les écritures, refuse une révision obsolète et limite à 40 terrains / 128 murs / 1 Mo par document. Les tables ne sont pas modifiables directement par le navigateur. Les révisions ne sont pas publiques ; le serveur ne transmet qu’une copie validée aux participants d’une partie autorisée.

Pour arrêter sans effacer les données : `npm run supabase:stop`. Pour rétablir `.env` à partir du service déjà démarré : `npm run supabase:configure`. L’environnement hébergé utilise une configuration séparée ; le script local refuse de remplacer ses URL.

## Projet Supabase en ligne

Projet SPIN créé le 31 octobre 2026 : `gqqhworxlpowipszmyav`, organisation SPIN gratuite, région West Europe (London), instance Nano. [Tableau de bord](https://supabase.com/dashboard/project/gqqhworxlpowipszmyav).

La migration `202610310001_private_terrains.sql` a été appliquée via l’éditeur SQL et inscrite au journal `supabase_migrations.schema_migrations`. Les deux tables ont RLS activé, aucune lecture anonyme ni insertion/mise à jour directe pour le rôle utilisateur. Les écritures passent par la fonction propriétaire. Le journal de migrations est également protégé par RLS.

Connexion email activée avec confirmation requise. Site URL et seule URL de redirection explicite : `https://charlescoiffier.github.io/spin/`. La clé publiable existante est configurée comme variable publique GitHub ; aucune clé secrète du projet ni mot de passe PostgreSQL n’a été copié. Le serveur accède aux terrains sous l’identité de son créateur.

Choix utilisateur : hébergement Render gratuit pour les essais ; **SMTP dédié reporté**. Tant qu’il n’est pas configuré, le service email intégré ne livre qu’aux adresses membres du projet et impose ses limites. Les invités du jeu rejoignent avec un pseudo sans compte Supabase. [Limites officielles des emails intégrés](https://supabase.com/docs/guides/auth/auth-smtp).

## Proposition de déploiement à approuver avant activation

Choix confirmé : **Render Free pour les essais**, sans option payante. `render.yaml` décrit une instance Node 22 à Francfort, construite depuis `feat/online-race`, sans déploiement automatique, avec `/health` et les seules variables publiques Supabase. Après fusion du code, remplacer la branche de référence par `main`. Le SMTP dédié est reporté.

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
