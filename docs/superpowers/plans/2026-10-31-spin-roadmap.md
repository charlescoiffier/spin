# SPIN — Feuille de route de développement

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement each approved detailed plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Faire évoluer SPIN vers les trois modes multijoueurs du document cadre, par livraisons jouables.

**Architecture:** Conserver le navigateur Phaser et extraire une simulation TypeScript commune au client et au serveur. Séparer transport temps réel, comptes, sauvegardes privées, terrains et règles de mode. Chaque livraison conserve le laboratoire et les fonctions existantes jusqu’à migration explicite.

**Tech Stack:** Phaser 3, TypeScript, Vite ; serveur Node.js proposé ; Colyseus et Supabase à valider par l’étude technique du premier lot. Aucun service payant créé par ce plan.

**Spec:** [Document cadre validé](../specs/2026-10-31-spin-multiplayer-design.md).

## Global Constraints

- Jouable au navigateur, à la souris, au toucher et avec espace ; Capacitor ultérieur.
- La caméra ne modifie jamais les coordonnées du monde.
- Course : 1 à 4 ; combat : 2 à 4 avec cinq vies ; capture : 2 ou 4, deux équipes.
- Comptes pour création et sauvegarde ; invités autorisés à rejoindre.
- Terrains privés, sans bibliothèque publique ; aucun chat, monétisation ou classement mondial prévu.
- Deux arrivées futures : contact ou ensemble dans la zone ; préserver les anciennes données avant migration.
- Graphisme futur sans lettres A/B, couleurs pâles, contours noirs épais et contours unifiés.

## Review Focus

- Anciennes données locales : aucune perte silencieuse lors de leur import ou migration (lot 1, tâche 2).
- Arrivée et déconnexion dans le même pas : un seul résultat faisant autorité (lot 1, tâches 4 et 7).
- Formes presque tangentes et superposées : contour continu et collision cohérente (lot 2).
- Fin de bonus au milieu d’un mur : aucune téléportation arbitraire ou immobilisation permanente (lot 3).
- Éliminations/captures simultanées : règles symétriques communes aux clients (lots 4 et 5).

## Ordre et dépendances

`Lot 1 : course réseau → Lot 2 : éditeur et surfaces → Lot 3 : effets et présentation → Lot 4 : combat → Lot 5 : capture`

Le lot 1 possède un plan exécutable séparé. Les lots suivants ont ici des limites et des critères précis ; leurs plans de tâches seront rédigés sur le code livré, afin de ne pas figer prématurément des interfaces non éprouvées.

## Lot 1 — Première course multijoueur complète

**Livrable :** un compte crée un salon public ou privé, choisit un terrain rectangulaire personnel ou de base, 1 à 4 places et les contacts activés ou non. Des invités rejoignent, le compte à rebours automatique lance la course, le serveur établit le résultat. Les terrains privés sont sauvegardés et accessibles sur un autre appareil.

**Inclus :** format commun versionné, simulation sans Phaser, collisions joueurs, connexion de compte, pseudonymes invités, sauvegarde privée, import local explicite, liste des salons publics, code/lien privé, reconnexion, essais réseau réels. Réutiliser les trois parcours actuels, avec départs multiples validés.

**Différé :** nouvelles formes, matériaux spéciaux, apparition de bonus, combat et capture. Aucun bouton actif ne doit promettre ces fonctions avant leur livraison. Conserver l’éditeur rectangulaire, le laboratoire et ses essais enregistrés.

**Critère de sortie :** course terminée sur deux appareils physiques et quatre clients ; résultat identique, aucune pénétration durable, retour après coupure, terrain privé inaccessible à un autre compte hors session de jeu. Mesurer coût CPU et latence avant de choisir la capacité d’hébergement.

**Plan :** [Tâches détaillées du lot 1](2026-10-31-spin-online-race.md).

## Lot 2 — Nouvel éditeur, géométrie et sols

**Modules prévus :** `src/terrain/shapes.ts`, `src/terrain/materials.ts`, `src/collision/shapeContacts.ts`, `src/rendering/terrainOutline.ts`, `src/editor/TransformHandles.ts`, `src/editor/ShapeTools.ts`, `src/editor/TerrainProperties.ts`, `src/simulation/SurfaceSystem.ts` et adaptation du schéma/éditeur du lot 1.

- [ ] Livrer les rectangles arrondis et ovales pivotés, avec contacts boules/barre et approximation géométrique partagée à tolérance documentée ; tests tangence, grande vitesse et formes minces.
- [ ] Livrer dessin souris, Maj carré/cercle, rotation, poignées, dimensions exactes, annuler/rétablir et équivalents tactiles ; chaque transformation conserve la précision sans accumuler d’erreur.
- [ ] Livrer union des contours pour formes jointives/superposées, trous préservés, motifs selon matériaux ; tester quasi-tangence et destruction d’un objet dans un ensemble.
- [ ] Livrer rebond variable, destruction après N impacts séparés et mort au contact ; un contact continu ne consomme pas plusieurs coups.
- [ ] Livrer vide, tapis roulant et sol collant référencés au pivot ; tests changement de pivot au-dessus du vide, tapis contre une paroi et surfaces superposées.
- [ ] Permettre réglage des dimensions du cadre sans manipulation libre, valider départs/arrivées et zones sûres, synchroniser les révisions privées.

**Critère de sortie :** les mêmes données produisent les mêmes collisions sur serveur et client ; les contours sont continus au zoom mobile ; un terrain de chaque matériau est éditable, sauvegardable et jouable en course réseau.

## Lot 3 — Effets, identité visuelle et sonore, quatre courses

**Modules prévus :** `src/simulation/EffectSystem.ts`, `src/simulation/PickupSystem.ts`, `src/rendering/EffectRenderer.ts`, `src/audio/AudioManager.ts`, `src/ui/EffectHud.ts`, `src/content/raceCourses.ts`.

- [ ] Ajouter les six effets demandés : petite taille, barre courte, lenteur, traversée intérieure, forte poussée, invisibilité. Paramètres de durée/amplitude dans des données typées ; effets différents cumulés, même effet renouvelé.
- [ ] Définir les valeurs initiales dans une table d’équilibrage du laboratoire, puis tester ; la première version du système n’invente pas d’effets supplémentaires.
- [ ] Ajouter génération serveur pondérée, option de salon, fréquence globale, poids par effet, plafond et expiration ; contact de ramassage unique même si plusieurs parties du personnage touchent l’objet.
- [ ] Traiter fin d’effet dans un mur par restauration sûre bornée, disparition des effets à la mort et impossibilité de traverser un mur extérieur ; tests obligatoires de retour à taille normale en passage étroit.
- [ ] Appliquer les couleurs de joueur, retrait A/B, contour épais noir, tons pâles, motifs discrets et traînée courte. Conserver palettes de terrain et différenciation visuelle des effets sans dépendre uniquement de la couleur.
- [ ] Ajouter sons de pivot, impact, victoire, volume et sourdine ; vérifier démarrage audio mobile après interaction et limitation des sons répétés lors d’un contact continu.
- [ ] Livrer quatre courses de base équilibrées, en adaptant les trois existantes et en créant une quatrième ; ne pas compter deux fois des variantes d’un même terrain.

**Critère de sortie :** effets identiques pour tous, invisibilité compréhensible, aucune restauration coincée ; quatre courses testées avec 1 à 4 joueurs et fonctions audio/visuelles vérifiées sur téléphone.

## Lot 4 — Combat et quatre arènes

**Modules prévus :** `src/modes/combat/CombatRules.ts`, `src/modes/combat/CombatState.ts`, `src/content/combatArenas.ts`, HUD et outils de départs correspondants.

- [ ] Définir cinq vies, mort unique par événement, respawn au départ, protection initiale de deux secondes avec signal visuel et sans poussée offensive pendant cette protection.
- [ ] Utiliser le vide du lot 2 pour éliminer : seul le pivot est mortel. Selon le terrain, vide autour d’une plateforme, dans des ouvertures ou dans des zones internes. Ne pas ajouter une règle concurrente de simple franchissement de bord.
- [ ] Éliminer à zéro vie, afficher le dernier survivant et traiter éliminations simultanées/abandon sans vainqueur arbitraire.
- [ ] Adapter salon, HUD de vies, spectateur après élimination et éditeur pour 2 à 4 départs sûrs.
- [ ] Créer quatre arènes distinctes et tester les apparitions pour éviter des morts en boucle ; départ protégé situé sur du sol sûr.

**Critère de sortie :** manche à quatre terminable avec et sans bonus, vie décomptée une seule fois par mort et résultat cohérent après déconnexion ou élimination simultanée.

## Lot 5 — Capture de drapeau et quatre terrains

**Modules prévus :** `src/modes/flag/FlagRules.ts`, `src/modes/flag/FlagState.ts`, `src/content/flagCourses.ts`, HUD de score/durée et outils bases/drapeaux.

- [ ] Ajouter deux équipes : duel à deux ou 2 contre 2, couleurs communes et identification discrète des coéquipiers.
- [ ] Ajouter deux bases et drapeaux, prise/transport/retour et capture seulement si son drapeau est dans sa base ; objectif configuré de 1 à 8.
- [ ] Ajouter possession de 30 secondes par défaut réglable ; délai de trois secondes pour le même porteur après perte ; adversaire, mort, déconnexion et expiration provoquent le retour, mais pas une paroi ni un allié.
- [ ] Garder drapeau et temps lisibles même avec invisibilité ; ordre stable pour capture, retour et expiration dans un même pas, avec tests symétriques sur les deux équipes.
- [ ] Ajouter UI, options de salon et outils de bases ; quatre terrains testés en duel et en équipes, dont test de double possession et de reprise après expiration.

**Critère de sortie :** partie complète aux objectifs 1 et 8, aucune capture sans drapeau propre, règles de délai identiques pour tous, quatre terrains jouables. Observer les parties longues : le délai de possession ne garantit pas à lui seul la fin du match.

## Validation commune et publication

Chaque lot : tests de règles et régressions, compilation TypeScript et Vite, essais navigateur puis appareils physiques, documentation des règles, revue et publication d’une version jouable. Ne pas réécrire toute l’architecture en une seule livraison. Une nouvelle API publique, une migration et un nouveau mode doivent chacun pouvoir être vérifiés séparément.

La première publication réseau requiert les choix de région, capacité, sauvegarde et coût. Présenter la configuration et le coût concret avant toute ouverture payante. Ne pas annoncer une charge maximale, un calendrier ou un prix sans mesure. Le site solo existant demeure utilisable si les services réseau sont indisponibles.
