# Labyrinthe contre-la-montre — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Livrer trois labyrinthes chronométrés avec rebonds et records locaux tout en conservant le laboratoire.

**Architecture:** Cinématique et collisions restent en TypeScript pur, sans moteur physique. Une scène de course assemble une simulation à pas fixe, des données de parcours, une session chronométrée et un HUD DOM distinct du laboratoire. Les composants d’entrée et de caméra restent partagés.

**Tech Stack:** Phaser 3, TypeScript strict, Vite, tests node:test via tsx, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-10-30-maze-time-trial-design.md` — à lire intégralement avant exécution.

## Global Constraints

- Réglages de course fixes : vitesse 5 rad/s, barre 80 px, zoom 0,7, lissage caméra 0,3 s.
- Les deux boules ET la barre déclenchent une collision avec les murs.
- Un choc inverse la rotation, conserve l’identité du pivot actif et produit un léger recul progressif de l’ensemble, comme un ressort de flipper.
- Un choc ne donne aucune pénalité chronométrique supplémentaire et ne ramène pas au départ.
- Le chronomètre démarre au premier toucher et s’arrête lorsque les deux boules sont dans la sortie.
- Une mise en arrière-plan interrompt la tentative afin de préserver des temps comparables.
- Aucun moteur physique, serveur, génération procédurale ou dépendance d’exécution supplémentaire.
- Les collisions emploient 1/240 s, rayon boule 17 px, rayon capsule barre 3,5 px, murs ≥24 px.
- Recul initial 8 px/80 ms ; dégagement de contact 1 px ; interruption de frame >250 ms en course.
- Conserver les commandes npm existantes et le déploiement GitHub Pages sur main.

## Review Focus

- Coin ou mur opposé : un recul ne traverse aucun mur et ne déclenche pas des inversions infinies (tâches 2–3).
- Appui pendant le recul et deux contacts simultanés : longueur intacte et ordre d’entrées conservé (tâche 3).
- Faible fréquence d’affichage : aucun passage à travers les murs et interruption explicite au-delà de 250 ms (tâches 3 et 5).
- Stockage corrompu ou interdit : partie et résultats restent utilisables (tâche 5).
- Retour d’arrière-plan et allers-retours entre scènes : aucun temps repris ni écouteur en double (tâches 5–6).

## Carte des fichiers

Conserver les modules existants et leurs responsabilités.

| Fichier | Responsabilité |
| --- | --- |
| `src/core/SpinMotion.ts` | Ajouter des primitives de cinématique sans Phaser |
| `src/collision/geometry.ts` | Types de murs et contacts, distances/intersections |
| `src/collision/CollisionMotion.ts` | Avancée sûre, recul, déverrouillage des contacts |
| `src/core/FixedStepper.ts` | Pas fixes, horodatage et file de touchers |
| `src/modes/maze/MazeDefinition.ts` | Contrat et validation des parcours |
| `src/modes/maze/courses.ts` | Trois tracés versionnés |
| `src/modes/maze/RaceSession.ts` | États et temps de course |
| `src/modes/maze/RecordStore.ts` | Records persistants avec repli mémoire |
| `src/rendering/MazeRenderer.ts` | Murs, départ et sortie |
| `src/ui/RaceHud.ts` | Temps, résultat, sélection et relance |
| `src/scenes/MazeScene.ts` | Assemblage du mode course |
| `src/scenes/PrototypeScene.ts` | Ajouter les murs de test et l’accès au mode course |
| `src/main.ts`, `index.html`, `src/style.css` | Enregistrement des scènes et conteneurs DOM |
| `tests/*.test.ts` | Tests purs de chaque composant |
| `README.md` | Règles et accès au jeu actualisés |

## Tâche 1 — Primitives de mouvement réutilisables

**Files:** modifier `src/core/SpinMotion.ts`, `tests/SpinMotion.test.ts`.

**Interfaces:** conserver constructeur, `update`, `switchPivot`, `reset`, `setLength`.
Ajouter `reverse(): void`, `translate(offset: Point): void`,
`snapshot(): MotionState`, `restore(state: MotionState): void`.
Exporter `MotionState` contenant copies de a/b, pivot, direction, angle, longueur et vitesse.
Ajouter `resetAt(a: Point, angle: number): void` : pivot A, sens +1, B dérivé.

- [ ] Écrire les tests : reverse conserve exactement a/b/pivot et inverse le sens ; translate({x:8,y:-3}) déplace a/b du même vecteur et conserve la longueur 80 ; snapshot ne partage aucune référence mutable ; restore puis update reproduit le même état ; resetAt place une barre de 80 à l’angle demandé.
- [ ] Exécuter `npm test` ; constater l’échec dû aux primitives absentes.
- [ ] Implémenter les signatures ci-dessus sans dépendance à Phaser. Conserver les invariants des tests existants.
- [ ] Exécuter `npm test` puis `npm run build` ; exiger zéro échec.
- [ ] Commit : `feat: add reversible and translatable motion state`.

## Tâche 2 — Géométrie des murs et du personnage

**Files:** créer `src/collision/geometry.ts`, `tests/geometry.test.ts`.

**Interfaces:** exporter `Rect { x:number; y:number; width:number; height:number }`,
`Wall extends Rect { id:string }`, `Contact { wallId:string; normal:Point; depth:number }`.
Produire `getContacts(a: Point, b: Point, ballRadius: number, barRadius: number, walls: readonly Wall[], margin?: number): Contact[]`.
La normale pointe du mur vers l’espace libre ; trier par wallId pour un résultat déterministe.
Produire `containsDisk(rect: Rect, center: Point, radius: number): boolean`.

- [ ] Écrire les tests : disque contre face et coin, tangence, capsule traversant un rectangle alors que les deux boules restent libres, capsule parallèle proche d’un mur, segment de longueur nulle, diagonale dans un coin, deux murs simultanés, marge de séparation 1 px, disque partiellement dans une sortie.
- [ ] Exécuter `npm test` ; constater les fonctionnalités manquantes.
- [ ] Implémenter la distance segment/rectangle exacte (intersection des arêtes puis minimum des distances segment/arêtes), sans se limiter à l’échantillonnage de points sur la barre. Déterminer une normale stable pour les contacts de profondeur nulle ou un point à l’intérieur ; départager les égalités de manière fixe.
- [ ] Vérifier les mêmes cas sous translation du monde de +1000,-500 : contacts relatifs identiques.
- [ ] Exécuter `npm test` et `npm run build`.
- [ ] Commit : `feat: detect ball and bar contacts with rectangular walls`.

## Tâche 3 — Rebond sûr dans le laboratoire

**Files:** créer `src/collision/CollisionMotion.ts`, `src/core/FixedStepper.ts`,
`tests/CollisionMotion.test.ts`, `tests/FixedStepper.test.ts` ; modifier
`src/scenes/PrototypeScene.ts`, `src/environment/TestEnvironment.ts`.

**Interfaces:** `CollisionMotion(motion: SpinMotion, walls: readonly Wall[])`,
`step(seconds: number): void`, `reset(): void`.
`FixedStepper` expose `reset(nowMs: number): void`, `enqueuePress(nowMs: number): void`,
`advance(nowMs: number, onPress: () => void, onStep: (dt: number, stepTimeMs: number) => void): boolean`.
Retour false si l’écart entre appels dépasse 250 ms ; aucun rattrapage partiel dans ce cas.
Le premier pas complet après un événement applique cet événement avant onStep ;
plusieurs événements dans ce pas sont tous appliqués dans leur ordre.
Le laboratoire réinitialise l’horloge à la reprise sans invalidation de session.

- [ ] Écrire les tests de rebond : pivot B reste B ; positions inchangées au déclenchement de l’inversion ; longueur 80 à chaque sous-pas ; rebond unique sur contact persistant ; séparation puis second impact autorise un nouveau rebond ; deux murs simultanés donnent une seule inversion ; coin concave et mur opposé ne permettent aucune pénétration ; toucher pendant recul échange normalement le pivot ; nouveau mur pendant recul reste solide.
- [ ] Écrire les tests de temps : rejouer une même liste d’appuis horodatés à 30, 60 et 120 FPS donne le même état après le même nombre de pas ; avance de 200 ms traitée intégralement ; avance de 251 ms retourne false sans avancer ; reset supprime les événements en attente.
- [ ] Exécuter `npm test`, constater les échecs attendus.
- [ ] Implémenter la tentative d’avancée sur copie d’état, recherche du contact par dichotomie (12 itérations), conservation du dernier état libre, inversion sans switchPivot et recul testé contre tous les murs. Gérer les contacts verrouillés jusqu’à 1 px de séparation. Le test de contact se fait avant tout commit d’état, y compris pendant le recul. Ne pas déplacer instantanément pour dépénétrer.
- [ ] Implémenter FixedStepper à 1/240 s avec origine monotone, en conservant le reliquat inférieur à un pas. Réinitialiser explicitement sa file en changeant la longueur ou en réinitialisant le laboratoire.
- [ ] Remplacer les obstacles décoratifs du laboratoire par un jeu de Wall partagé entre rendu et collision. Conserver quelques repères fixes. Connecter entrée → file d’événements, modèle → collisions → rendu → caméra ; caméra jamais réinjectée dans le modèle.
- [ ] Exécuter `npm test` et `npm run build`. Dans le laboratoire, essayer boule, milieu de barre, coin et deux murs proches ; noter les limites perceptibles du recul avant de figer le ressenti.
- [ ] Commit : `feat: add continuous wall rebounds to the movement lab`.

## Tâche 4 — Données et rendu des trois parcours

**Files:** créer `src/modes/maze/MazeDefinition.ts`, `src/modes/maze/courses.ts`,
`src/rendering/MazeRenderer.ts`, `tests/courses.test.ts`.

**Interfaces:** `MazeDefinition { id:string; version:number; title:string; walls:readonly Wall[]; spawn:{a:Point; angle:number}; exit:Rect }`.
Exporter `courses: readonly MazeDefinition[]` et `validateMaze(maze: MazeDefinition): string[]`.
`MazeRenderer(scene: Phaser.Scene, maze: MazeDefinition)` crée uniquement des objets monde.

- [ ] Écrire les tests : trois identifiants uniques, versions positives, dimensions finies, murs ≥24 px, spawn sans collision pour barre 80/rayon 17, sortie assez grande pour accueillir le personnage, aucun mur n’empiète sur la sortie. Donnée invalide : erreur explicite, pas de boucle de simulation.
- [ ] Exécuter `npm test` et constater les données/fonctions absentes.
- [ ] Construire les trois parcours décrits dans la spec : initiation, précision, choix de routes ; contour fermé, largeur libre principale ≥220 px. Fixer toutes les coordonnées dans les données, sans génération aléatoire.
- [ ] Implémenter validation et rendu distinct du laboratoire. Afficher clairement départ/sortie sans cacher les murs et sans texte technique.
- [ ] Exécuter `npm test` et `npm run build`. La traversabilité réelle de chaque tracé sera validée en tâche 6 ; ne pas la déduire de ces seuls tests de données.
- [ ] Commit : `feat: define and render three hand-built maze courses`.

## Tâche 5 — Course chronométrée et records

**Files:** créer `src/modes/maze/RaceSession.ts`, `src/modes/maze/RecordStore.ts`,
`tests/RaceSession.test.ts`, `tests/RecordStore.test.ts`.

**Interfaces:** `RaceStatus = 'ready' | 'running' | 'finished' | 'interrupted'`.
`RaceSession` expose `status`, `start(nowMs:number): void`,
`finish(nowMs:number): void`, `interrupt(): void`, `reset(): void`,
`elapsedMs(nowMs:number): number`.
Horodatages issus de la même origine performance.now que FixedStepper ; start
sur le premier appui, finish avec stepTimeMs de l’entrée complète dans la sortie.
`RecordStore(storage: Pick<Storage,'getItem'|'setItem'> | null)` expose
`get(maze: MazeDefinition): number | null`, `submit(maze: MazeDefinition, elapsedMs:number): {bestMs:number; improved:boolean}`.
Clé : `spin:maze:rules-v1:<id>:v<version>`.

- [ ] Écrire les tests de session avec horloge contrôlée : ready à zéro ; start(1000) puis elapsedMs(2234)=1234 ; finish(2234) fige 1234 ; appels répétés ignorés ; interrupt fige running, interdit finish et reprise ; reset remet ready ; start ne redémarre pas une session finished/interrupted.
- [ ] Écrire les tests de records : premier résultat, temps inférieur seulement, égalité non améliorée, séparation par parcours/version, NaN/Infinity/valeur négative/JSON corrompu ignorés ; getItem et setItem qui lèvent ne bloquent pas le record mémoire. Valider strictement les types avant toute coercition.
- [ ] Exécuter `npm test`, constater les fonctions absentes.
- [ ] Implémenter les états et le stockage. Acquérir localStorage dans un try/catch au niveau de l’assemblage (son accès peut lui-même lever). Conserver la meilleure valeur en mémoire même après un échec d’écriture.
- [ ] Exécuter `npm test` et `npm run build`.
- [ ] Commit : `feat: add race timing and local course records`.

## Tâche 6 — Assembler, jouer et publier

**Files:** créer `src/scenes/MazeScene.ts`, `src/ui/RaceHud.ts` ; modifier
`src/main.ts`, `src/scenes/PrototypeScene.ts`, `index.html`, `src/style.css`, `README.md`.

**Interfaces:** `RaceHud(root:HTMLElement, callbacks:{restart:()=>void;selectCourse:(id:string)=>void;openLab:()=>void})`,
`update(view:{status:RaceStatus;elapsedMs:number;bestMs:number|null;courseTitle:string}): void`,
`destroy(): void` nettoie DOM et écouteurs.
MazeScene reçoit `{ courseId?: string }` via init ; défaut premier parcours.

- [ ] Assembler spawn, session ready figée, collisions et FixedStepper. Premier appui démarre la session puis est appliqué comme switchPivot au prochain pas ; les suivants sont mis en file. Après chaque pas, vérifier containsDisk pour les deux boules, puis terminer avec stepTimeMs et soumettre le record une seule fois.
- [ ] Si advance retourne false en running, interrompre la tentative. Relier visibilitychange hidden et pagehide à interrupt ; désinscrire ces écouteurs à shutdown. Vérifier ready reste ready et finished conserve son résultat.
- [ ] Ajouter le HUD : temps au centième, record, parcours, Recommencer, accès direct aux trois parcours, accès laboratoire. Contrôles ≥44 px et hors zone de geste. Réinitialisation complète du modèle, de la session et de l’accumulateur au restart ; retour au premier parcours non imposé.
- [ ] Enregistrer les deux scènes, ouvrir le premier parcours par défaut. Conserver le panneau de debug uniquement au laboratoire et un accès à la course depuis celui-ci. Nettoyer DOM et écouteurs lors de chaque changement de scène.
- [ ] Exécuter `npm test` et `npm run build` ; zéro échec requis. Réutiliser le workflow Pages existant, sans ajouter de plateforme d’hébergement.
- [ ] Jouer et terminer chacun des trois parcours à la souris ; noter temps, blocages éventuels et corrections des tracés. Confirmer que sortie partielle ne termine pas, contour infranchissable, relance remet temps et spawn, nouveau record survit au rechargement.
- [ ] Vérifier à 30 et 120 FPS, frame longue, changement d’onglet, stockage refusé, redimensionnement portrait/paysage et cinq allers-retours laboratoire/course. Un toucher physique doit toujours produire un seul changement de pivot. Tester sur téléphone réel si disponible, sinon signaler cet essai non effectué.
- [ ] Mettre le README à jour : jeu/course/laboratoire, collision boule et barre, absence de pénalité, réglages fixes, records et interruption. Décrire les limites constatées, sans prétendre à des essais non effectués.
- [ ] Commit : `feat: ship maze time trials with replay and course selection`.
- [ ] Après vérifications et relecture du changement complet, pousser sur main (publication déjà demandée pour le jeu). Attendre la réussite GitHub Actions ; vérifier `https://charlescoiffier.github.io/spin/` et les assets qu’elle référence. Rapporter tests et éventuelles limitations mobiles.

## Point de revue avant exécution

Ce document prépare l’implémentation ; il ne modifie pas le jeu publié.
Faire relire les choix initiaux de recul, de largeur des couloirs et d’interruption
avant exécution. Une réalisation directement dans la session est recommandée :
les six tâches dépendent étroitement des interfaces de mouvement et de temps.
