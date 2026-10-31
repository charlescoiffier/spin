# SPIN — Plan de la première course multijoueur

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task in the current session. Steps use checkbox (`- [ ]`) syntax for tracking. Le choix antérieur d’exécution directe est conservé ; ne pas déléguer l’implémentation sans nouvelle instruction.

**Goal:** Permettre à un compte de créer une course publique ou privée de 1 à 4 joueurs, rejointe par des invités, sur un terrain sauvegardé privé, avec départ et résultat communs.

**Architecture:** Ajouter une simulation pure commune au serveur et au client sans déplacer tout le projet dans un monorepo. Le serveur Node.js fait autorité ; le navigateur prédit le déplacement local et interpole les autres joueurs. La persistance des comptes et terrains est séparée de la vie d’un salon.

**Tech Stack:** Phaser 3, TypeScript, Vite et tests `node:test` existants. Choix proposé pour le premier essai : Colyseus pour salons/transport, Supabase Auth et PostgreSQL avec RLS pour comptes/terrains. La tâche 1 confirme les versions, l’adaptation et les coûts avant installation ; aucun service externe n’est créé pendant la planification.

**Spec:** [Document cadre validé](../specs/2026-10-31-spin-multiplayer-design.md). [Feuille de route complète](2026-10-31-spin-roadmap.md).

**État au 31 octobre :** socle des tâches 1 à 8 implémenté sur `feat/online-race`, revue corrigée ; vérifications de stockage réel, comptes, appareils et publication des tâches 5, 7, 8 et 9 encore en attente. Voir [journal de validation](2026-10-31-spin-online-race-validation.md). Les cases ci-dessous restent la liste complète des critères, pas une déclaration de livraison.

## Global Constraints

- Vitesse standard 5 rad/s, barre 80 px, zoom 0,7, lissage caméra 0,3 s ; recul réglable jusqu’à 100 px dans le laboratoire.
- Clic, toucher et espace échangent le pivot et inversent le sens sans saut de position. Le pivot ne se déplace que par un effet explicite, dont les chocs.
- Boules et barre participent aux contacts. Choc : pivot conservé, rotation inversée, recul progressif.
- 1 à 4 places ; traversée mutuelle ou répulsion choisie par le créateur.
- Compte pour créer/sauvegarder ; invités avec pseudo pour rejoindre ; terrains privés sans bibliothèque publique.
- Aucun bouton « Prêt » : compte à rebours automatique de trois secondes quand toutes les places sont présentes.
- Course : retour au départ après mort, temps continu. Arrivée contact ou personnage entier. Les murs mortels et le vide sont ajoutés au lot 2.
- Préserver les anciennes données locales, le laboratoire, ses réglages enregistrés, l’éditeur et les records locaux.
- Ne pas afficher « Maze », « Deux boules. Un seul geste. » ni le rappel de commande en bas. Panneau rabattable et titre compact conservés.
- Pas de compte à créer ni de déploiement payant sans présenter la configuration concrète. Aucun secret dans Vite ou GitHub Pages.

## Review Focus

- Import d’un ancien parcours `pivot` : copie conservée, conversion expliquée et confirmation requise avant sauvegarde du nouveau format (tâche 2).
- Commandes dupliquées, tardives ou arrivées en rafale : une séquence valide ne déclenche jamais deux spins (tâches 3 et 6).
- Joueur déconnecté au départ ou à l’arrivée : une seule transition de session et aucun résultat contradictoire (tâche 4).
- Deux comptes modifient le même identifiant ou une ancienne révision : refus explicite sans écrasement silencieux (tâche 5).
- Lien privé ouvert sur téléphone, focus UI ou saisie de pseudo : rejoindre et jouer sans spin involontaire, tout en conservant espace hors texte (tâches 7 et 8).

## Structure des fichiers et conventions

Conserver `src/core/SpinMotion.ts`, `src/core/FixedStepper.ts`, `src/collision` et les anciennes scènes tant que la migration n’est pas validée. Ajouter :

| Emplacement | Responsabilité |
| --- | --- |
| `src/shared/terrain.ts`, `terrainMigration.ts` | Types de terrain indépendants de Phaser, parseur et migration |
| `src/shared/raceProtocol.ts`, `raceSettings.ts` | Commandes/snapshots et paramètres physiques communs |
| `src/simulation/RaceWorld.ts`, `PlayerContacts.ts` | Monde autoritaire, joueurs et contacts réciproques |
| `server/race/RaceRoom.ts`, `LobbyDirectory.ts` | Salons, annuaire public et transitions de session |
| `server/auth/IdentityVerifier.ts` | Vérification des identités et permissions |
| `server/persistence/TerrainRepository.ts` | Lecture de révisions autorisées, sans accès arbitraire par les invités |
| `src/account/AccountClient.ts`, `src/terrain/CloudTerrainStore.ts` | Connexion et sauvegarde du propriétaire |
| `src/network/RaceClient.ts`, `PredictionBuffer.ts` | Transport client, reconnexion et réconciliation |
| `src/ui/LobbyPanel.ts`, `src/scenes/OnlineRaceScene.ts` | Création/rejoindre, affichage de la course |
| `supabase/migrations/`, `tests/integration/`, `docs/operations/` | Schéma distant, vérifications des services et exploitation |

Tous les fichiers ci-dessus sont à créer. Les tests unitaires restent dans `tests/*.test.ts`. Les tests nécessitant des services locaux sont séparés dans `tests/integration/*.test.ts` et un script `test:integration` ajouté à la tâche concernée. Les adaptateurs réseau ne doivent pas importer Phaser ; le navigateur ne doit jamais importer un fichier de `server/`.

Contrats communs : `PlayerId = string`, `Tick = number`, `SpinCommand = { seq: number; requestedTick: Tick }`. Le serveur décide du tick accepté, publie l’accusé de séquence et refuse les commandes dupliquées ; l’horloge du navigateur n’établit jamais un score. Tous les ticks sont des entiers. Simulation à 240 Hz initialement, publication de snapshots à 20 Hz ; la tâche 1 mesure la viabilité avant de figer ces fréquences.

### Task 1 — Choix technique vérifié et référence de performance

**Fichiers :** créer `docs/decisions/2026-10-31-online-stack.md`, `scripts/benchmark-race.ts` ; modifier `package.json` uniquement pour le script de mesure après validation des outils.

**Interfaces :** consomme `SpinMotion.update(seconds)`, `snapshot()` et les parcours existants ; produit une décision documentée de transport, authentification, déploiement et fréquence, sans interface produit nouvelle.

- [ ] Exécuter `npm test` puis `npm run build` ; noter la référence réelle et les avertissements, ne pas présumer que l’ancien résultat est encore valable.
- [ ] Comparer Colyseus et un serveur WebSocket minimal sur autorité, reconnexion, annuaire et entretien ; comparer Supabase et une solution comptes/base équivalente sur récupération de compte, droits privés et exploitation. Références officielles ci-dessous, versions exactes vérifiées au moment de l’installation.
- [ ] Écrire un benchmark reproductible de quatre personnages, contacts rapprochés et murs sur 60 secondes simulées ; mesurer temps par pas et allocations sans rendu. Exécuter `npm exec -- tsx scripts/benchmark-race.ts`.
- [ ] Documenter les résultats et le budget par instance : cible provisoire de moins de 50 % d’un cœur utilisé pour une salle pleine à 240 Hz ; aucune capacité promise sans mesure. Si la cible échoue, profiler puis choisir explicitement une autre fréquence et adapter les tests de trajectoire avant la suite.
- [ ] Retenir le transport et l’authentification dans la décision, préciser versions et commande de développement locale. Proposer email avec lien de connexion pour les comptes et jeton invité limité à rejoindre ; pas de fournisseur social imposé. Présenter région, coût et secrets requis avant une activation externe.
- [ ] Commit : `docs: define verified multiplayer stack and simulation budget`.

### Task 2 — Format de terrain commun et migration non destructive

**Fichiers :** créer `src/shared/terrain.ts`, `src/shared/terrainMigration.ts`, `src/shared/raceSettings.ts`, `tests/TerrainMigration.test.ts` ; adapter `src/editor/CourseStore.ts`, `src/editor/EditorDocument.ts`, `src/editor/EditorPanel.ts`, `src/modes/maze/MazeDefinition.ts`, `src/modes/maze/courses.ts`.

**Interfaces :** produit `TerrainV2 { schemaVersion: 2; id: string; revision: number; title: string; bounds: Rect; walls: readonly Wall[]; raceSpawns: readonly { a: Point; angle: number }[]; goal: { rect: Rect; mode: 'touch' | 'whole' }; theme: CourseTheme }`, `parseTerrain(value: unknown): TerrainV2`, `migrateLegacyTerrain(value: unknown): { terrain: TerrainV2; warnings: string[]; needsConfirmation: boolean }`. `Point`, `Rect`, `Wall`, `CourseTheme` sont importés des modules purs actuels. Produit `RacePhysics { speed: number; length: number; recoilDistance: number }`, extrait des réglages validés ; caméra et traînée restent locales.

- [ ] Ajouter les tests nommés `preservesLegacySource`, `requiresConfirmationForPivotGoal`, `rejectsOverlappingSpawns`, `rejectsNonFiniteGeometry` ; assertions : source inchangée, ancien `pivot` converti en `touch` uniquement sur une copie avec avertissement, 1 à 4 départs sûrs et limites identiques au format actuel.
- [ ] Exécuter `node --import tsx --test tests/TerrainMigration.test.ts` ; constater l’échec avant les nouveaux modules.
- [ ] Implémenter les contrats et l’adaptateur vers les parcours actuels. Pour les trois terrains fournis, placer explicitement quatre départs valides à proximité équitable du départ initial ; ne pas calculer un décalage aveugle susceptible de toucher un mur. Vérifier aussi les arrivées avec la physique choisie.
- [ ] Mettre à jour l’éditeur pour les départs multiples et les deux arrivées, avec prévisualisation de conversion. Conserver le JSON local original et les anciens podiums ; ne pas réattribuer d’anciens scores à une géométrie convertie.
- [ ] Relancer le test ciblé, `npm test` et `npm run build` ; vérifier import ancien, annulation de conversion et test/retour éditeur dans le navigateur.
- [ ] Commit : `feat: add versioned shared terrains and safe legacy migration`.

### Task 3 — Simulation commune et répulsion entre joueurs

**Fichiers :** créer `src/shared/raceProtocol.ts`, `src/simulation/RaceWorld.ts`, `src/simulation/PlayerContacts.ts`, `tests/RaceWorld.test.ts`, `tests/PlayerContacts.test.ts` ; adapter `src/collision/CollisionMotion.ts` pour les impulsions externes, sans toucher au rendu.

**Interfaces :** `RaceWorld(terrain: TerrainV2, physics: RacePhysics, contactsEnabled: boolean)`, `addPlayer(id: PlayerId, spawnIndex: number): void`, `enqueue(id: PlayerId, command: SpinCommand): void`, `step(): void`, `snapshot(): RaceSnapshot`, `removePlayer(id: PlayerId): void`. `RaceSnapshot` contient tick, poses `MotionState`, accusés de séquence et événements identifiés. Produit `resolvePlayerContacts(players, dt): ContactEvent[]`, paramètres typés avec les états de simulation, sans effets Phaser.

- [ ] Ajouter tests de quatre joueurs : même script de commandes → mêmes poses ; séquence répétée → un seul spin ; contact réciproque → deux reculs, pivot conservé et direction inversée ; traversée activée → aucun événement de choc joueur ; barre seule au contact → choc détecté.
- [ ] Exécuter `node --import tsx --test tests/RaceWorld.test.ts tests/PlayerContacts.test.ts` et observer les échecs attendus.
- [ ] Implémenter les contrats avec tri stable des paires par identifiant, détection continue/subdivision selon déplacement maximal et verrou de contact jusqu’à séparation. Borner les impulsions pour éviter emballement et empêcher que la répulsion pousse à travers un mur. N’appliquer aucun hasard de rendu à la simulation.
- [ ] Ajouter les régressions : trois joueurs coincés contre un mur, contact continu sur dix secondes, choc simultané barre/boules, rafale de commandes. Limiter chaque joueur à un spin accepté par tick et 30 par seconde ; conserver les séquences pour la réconciliation.
- [ ] Rejouer les tests ciblés, les traversées existantes et le benchmark. La simulation ne dépend ni de `window`, ni de Phaser, ni du temps de rendu.
- [ ] Commit : `feat: share authoritative race simulation and player repulsion`.

### Task 4 — Salon serveur, départ et résultat faisant autorité

**Fichiers :** créer `server/index.ts`, `server/tsconfig.json`, `server/race/RaceRoom.ts`, `server/race/LobbyDirectory.ts`, `server/auth/IdentityVerifier.ts`, `tests/RaceRoom.test.ts`, `tests/integration/RaceRoomTransport.test.ts` ; adapter `package.json`, ajouter configuration d’environnement exemple sans secrets.

**Interfaces :** `VerifiedIdentity = { id: string; kind: 'account' | 'guest'; displayName: string }` ; `IdentityVerifier.verify(token: string): Promise<VerifiedIdentity>` ; `LobbyConfig = { terrainId: string; revision: number; seats: 1 | 2 | 3 | 4; visibility: 'public' | 'private'; contactsEnabled: boolean; physics: RacePhysics }`. `RaceRoom` expose via transport `join`, `spin`, `leave`, `reconnect` ; états `waiting | countdown | running | finished`, transitions testables indépendamment du réseau. `LobbyDirectory.listPublic()` ne retourne ni salons privés ni leurs codes.

- [ ] Écrire tests : invité ne crée pas ; trois places prévues avec deux joueurs restent en attente ; dernière présence démarre trois secondes ; départ déconnecté annule le compte ; une place lance une course solo après compte à rebours ; arrivée et départ au même tick publient un seul résultat.
- [ ] Exécuter `node --import tsx --test tests/RaceRoom.test.ts` avant implémentation.
- [ ] Installer uniquement les versions retenues à la tâche 1, ajouter scripts `dev:server`, `build:server`, `test:integration`. Implémenter la salle avec temps serveur, terrain immuable et aucune position acceptée du client. Trier les fins au temps de contact, déclarer égalité si indiscernables dans la précision calculée.
- [ ] Implémenter codes privés aléatoires, limites de requêtes, maximum de quatre connexions actives et vérification des capacités de terrain. Les paramètres physiques passent par la même validation que le laboratoire ; signaler les parties personnalisées, sans podium standard.
- [ ] Tester transport réel local : création publique/privée, refus d’un cinquième joueur, faux tick, payload trop gros, jeton expiré. Une salle sans participants est fermée après expiration du délai de reconnexion.
- [ ] Exécuter tests unitaires, intégration locale, `npm run build:server` et `npm run build` ; vérifier que les fichiers serveur ne sont pas dans `dist`.
- [ ] Commit : `feat: add authoritative race rooms and automatic countdown`.

### Task 5 — Comptes et terrains privés sauvegardés

**Fichiers :** créer `src/account/AccountClient.ts`, `src/terrain/CloudTerrainStore.ts`, `server/persistence/TerrainRepository.ts`, `supabase/migrations/001_private_terrains.sql`, `tests/CloudTerrainStore.test.ts`, `tests/integration/TerrainPermissions.test.ts` ; adapter `src/editor/EditorPanel.ts`, `src/modes/maze/services.ts` et la vérification d’identité serveur.

**Interfaces :** `AccountClient.requestSignIn(email: string): Promise<void>`, `restoreSession()`, `signOut()` ; `CloudTerrainStore.list(): Promise<TerrainV2[]>`, `save(terrain: TerrainV2, expectedRevision: number): Promise<TerrainV2>` ; `TerrainRepository.getForOwner(ownerId, terrainId, revision)` retourne une copie validée. Les invités n’accèdent à une copie qu’après admission dans une salle autorisée, jamais par requête directe de terrain privé.

- [ ] Écrire tests : sauvegarde par propriétaire A, lecture/modification par B refusées, invité refusé, révision obsolète signalée, source locale intacte si échec distant. Exécuter le test unitaire et l’intégration contre l’environnement local avant de coder les droits.
- [ ] Créer schéma propriétaire/terrain/révision avec RLS, révisions immuables, titres et JSON validés, taille maximale 1 Mo et 40 terrains par propriétaire au départ. Réutiliser les limites existantes plutôt que les augmenter sans besoin.
- [ ] Implémenter lien de connexion, retour sur l’URL du site et restauration de session ; affichage générique en cas de demande d’email. Une session expirée propose une reconnexion et conserve les changements non sauvegardés.
- [ ] Ajouter choix explicite « Importer mes terrains de ce navigateur » avec aperçu et confirmation de conversion ; conflits créent une copie ou demandent une révision explicite, jamais un écrasement caché.
- [ ] Exécuter les tests de permission sur la vraie base locale, pas uniquement un faux stockage. Vérifier sur deux navigateurs : A retrouve son terrain, B ne le voit pas, un invité dans la partie de A peut jouer sans obtenir accès à sa bibliothèque.
- [ ] Commit : `feat: add accounts and private versioned terrain storage`.

### Task 6 — Client réseau réactif

**Fichiers :** créer `src/network/RaceClient.ts`, `src/network/PredictionBuffer.ts`, `tests/PredictionBuffer.test.ts` ; adapter `src/input/PointerControls.ts` pour émettre une commande vers un port plutôt que dépendre d’une scène précise.

**Interfaces :** `RaceClient.connect(join: { roomId?: string; code?: string; token: string }): Promise<void>`, `spin(): void`, `disconnect(): void`, abonnements snapshots/état ; `PredictionBuffer.record(command)`, `reconcile(snapshot)`, `getLocalPose(): MotionState`. Accusés et ticks consomment le protocole de la tâche 3. Les événements d’impact ont un identifiant pour ne pas rejouer le son à chaque correction.

- [ ] Ajouter tests : snapshot dupliqué ignoré, accusé supprime exactement les commandes traitées, commande non accusée rejouée une fois, snapshot ancien ignoré, correction conserve longueur rigide. Exécuter `node --import tsx --test tests/PredictionBuffer.test.ts` avant implémentation.
- [ ] Implémenter prédiction locale avec les mêmes règles et réconciliation sur snapshot, tampon borné à deux secondes ; au-delà, réinitialiser sur l’état serveur et afficher la reconnexion plutôt que rejouer une longue rafale.
- [ ] Interpoler les joueurs distants avec délai initial de 100 ms. La correction visuelle peut être lissée, mais la logique d’arrivée et de contact reste serveur ; aucune correction caméra ne modifie le monde.
- [ ] Vérifier latence simulée de 100 puis 200 ms, jitter et coupure brève. Séparer taux de snapshot et fréquence de rendu. Aucun spin n’est créé par un simple changement de focus ou un clic sur l’interface.
- [ ] Exécuter tests ciblés, régressions espace et build.
- [ ] Commit : `feat: add predicted race client and snapshot reconciliation`.

### Task 7 — Liste de parties, salon et reconnexion

**Fichiers :** créer `src/ui/LobbyPanel.ts`, `src/ui/AccountPanel.ts`, `src/network/JoinLink.ts`, `tests/JoinLink.test.ts`, `tests/integration/LobbyFlow.test.ts` ; modifier `src/ui/appShell.ts`, `src/main.ts`, `src/style.css`, `index.html`.

**Interfaces :** `LobbyPanel` consomme le compte, la liste publique, la création et `RaceClient` ; `parseJoinLink(url: string): { code: string } | null`. Utiliser un paramètre d’URL compatible GitHub Pages, pas une route nécessitant une réécriture serveur.

- [ ] Tester lien correct/malformé, code privé absent de la liste publique, pseudo rendu en texte, bouton création réservé au compte, place libérée pendant compte à rebours et reprise d’une connexion avec identité conservée.
- [ ] Exécuter tests ciblés avant implémentation, puis créer listes, formulaire de création, terrain/règles/places, invité et attente. Ne pas ajouter de bouton « Prêt ».
- [ ] Ajouter reconnexion sous 30 secondes : personnage retiré, autres continuent, retour au départ à temps continu ; après expiration abandon. Le créateur quittant une course ne l’arrête pas ; dans un salon, transférer à un compte présent ou fermer avec message.
- [ ] Vérifier lien privé sur mobile, actualisation de page, déconnexion volontaire et code invalide. Ne stocker aucun jeton dans une URL de partage ; masquer un code dans l’annuaire ne remplace pas la vérification d’admission.
- [ ] Exécuter tests/build et parcours navigateur clavier/tactile ; panneau rabattable et saisie d’espaces dans le pseudo conservés.
- [ ] Commit : `feat: add public and private lobbies with guest joining`.

### Task 8 — Course réseau dans Phaser et essais de bout en bout

**Fichiers :** créer `src/scenes/OnlineRaceScene.ts`, `src/ui/OnlineRaceHud.ts`, `tests/integration/OnlineRaceFlow.test.ts` ; adapter `src/rendering/SpinRenderer.ts`, `src/camera/PivotCamera.ts`, `src/main.ts`, `src/debug/DebugPanel.ts`, `README.md`.

**Interfaces :** scène consomme snapshots et pose locale, un rendu par joueur ; HUD consomme compte à rebours, statut, temps serveur et résultat. Le laboratoire fournit un `RacePhysics` enregistré à la création sans imposer ses préférences de caméra aux adversaires.

- [ ] Ajouter scénario intégration : A crée, B invité rejoint, départ commun, spins, résultat identique pour deux clients ; variantes sans contacts et avec contacts, quatre clients, égalité, reconnect et absence définitive.
- [ ] Exécuter l’intégration avant branchement UI, puis implémenter la scène et le HUD. Utiliser explicitement les données de scène à chaque démarrage pour éviter les contextes conservés par Phaser.
- [ ] Afficher couleurs distinctes, statut réseau et gagnant ; conserver le laboratoire et le mode solo existant accessibles. Préparer le renderer à retirer les lettres sans refaire toute la direction graphique avant le lot 3.
- [ ] Tester souris, toucher physique et espace après focus sur bouton/range, sans spin pendant saisie. L’arrière-plan ne doit plus invalider la partie réseau comme le fait une tentative solo locale ; le serveur poursuit et le client se resynchronise.
- [ ] Exécuter `npm test`, `npm run test:integration`, `npm run build:server`, `npm run build` ; documenter mesures et essais réels sur deux appareils puis quatre clients. Vérifier résultat unique lorsque arrivée et coupure coïncident.
- [ ] Commit : `feat: make online races playable end to end`.

### Task 9 — Exploitation et première publication réseau

**Fichiers :** créer `server/Dockerfile`, `docs/operations/online-race.md`, `.env.example` sans secrets ; adapter `.github/workflows/deploy.yml` et ajouter vérification serveur en CI. Ne pas inclure un déploiement payant automatique non approuvé.

**Interfaces :** navigateur configuré par URL HTTPS/WSS publique ; serveur configuré par variables privées. Ajouter `/health` sans données personnelles et arrêt gracieux signalant l’indisponibilité des salons.

- [ ] Documenter fournisseur/région, coût estimé à partir des mesures, sauvegarde/restauration, SMTP de connexion, limites initiales et procédure de retour arrière. Présenter cette configuration avant activation ; ne pas supposer qu’un palier gratuit suffira.
- [ ] Construire l’image et vérifier que secrets, sources privées d’environnement et clés de service n’entrent ni dans l’image publique ni dans `dist`. Définir origines autorisées et limite de connexions selon le benchmark, avec saturation explicite plutôt qu’un ralentissement silencieux.
- [ ] Ajouter CI tests unitaires, build client/serveur et tests de droits avec service local si disponible ; séparer production et environnement d’essai. Versionner le protocole et refuser proprement un client incompatible après mise à jour.
- [ ] Effectuer essai complet sur l’URL d’essai HTTPS depuis téléphone et ordinateur, test de restauration d’une sauvegarde et panne du service. Le mode solo doit rester disponible si le serveur est hors ligne.
- [ ] Après configuration autorisée, publier, vérifier création/join/connexion email et course réelle ; noter version et limites dans README et journal de validation.
- [ ] Commit : `chore: document and verify online race deployment`.

## Auto-relecture et couverture

Les sections comptes/salon/course/architecture du cadrage sont couvertes par les tâches 1 à 9. Les terrains spéciaux, nouvelles formes, bonus, sons et identité graphique complète relèvent explicitement des lots 2 et 3 ; combat et capture des lots 4 et 5. La séparation est un choix de livraison, pas une suppression de ces demandes.

Les cinq risques du Review Focus ont un test attribué. Les types partagés sont définis avant leurs consommateurs ; les adaptations fournisseurs restent derrière des ports. Le passage en réseau ne remplace pas implicitement les données locales ni le podium. L’exécution devra consigner les résultats réels ; ce plan n’atteste ni tests exécutés ni service disponible.

## Sources officielles du choix proposé

Consultées le 31 octobre 2026 ; vérifier à nouveau les versions lors de la tâche 1.

- [Colyseus — salons, autorité et cycle de vie](https://docs.colyseus.io/room).
- [Colyseus — reconnexion](https://docs.colyseus.io/room/reconnection).
- [Colyseus — prédiction et réconciliation](https://docs.colyseus.io/netcode/client-prediction) : vérifier la version des API avant utilisation ; ne pas supposer leur présence dans une ancienne version.
- [Supabase Auth](https://supabase.com/docs/guides/auth) et [droits par ligne PostgreSQL](https://supabase.com/docs/guides/database/postgres/row-level-security) : base de l’option comptes/terrains privés ; droits à éprouver par intégration, pas seulement par interface.
