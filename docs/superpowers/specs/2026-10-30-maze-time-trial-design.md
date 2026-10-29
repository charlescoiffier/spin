# SPIN — v0.1 labyrinthe contre-la-montre

## Objectif et périmètre

Transformer le prototype libre en jeu de parcours : atteindre la sortie d’un
labyrinthe le plus rapidement possible, puis améliorer son record personnel.
Conserver le laboratoire existant pour régler et observer la mécanique.
Livrer dans le même projet Phaser 3, TypeScript et Vite et sur GitHub Pages.
Pas de serveur, compte, classement en ligne, son, monétisation, génération
procédurale ni intégration Capacitor dans cette version.

## Décisions validées avec le joueur

- Un toucher échange le pivot et inverse la rotation sans déplacer instantanément les boules.
- Les deux boules ET la barre déclenchent une collision avec les murs.
- Un choc inverse la rotation, conserve l’identité du pivot actif et produit un léger recul progressif de l’ensemble, comme un ressort de flipper.
- Le recul conserve la longueur de la barre ; le pivot peut exceptionnellement se déplacer pendant ce recul, puis redevient fixe.
- Un contact persistant ne doit pas produire des inversions en boucle.
- Un choc ne donne aucune pénalité chronométrique supplémentaire et ne ramène pas au départ.
- Réglages de course fixes : vitesse 5 rad/s, barre 80 px, zoom 0,7, lissage caméra 0,3 s.
- Le laboratoire conserve ses réglages libres.
- Le chronomètre démarre au premier toucher et s’arrête lorsque les deux boules sont dans la sortie.
- Une mise en arrière-plan interrompt la tentative afin de préserver des temps comparables.
- Record local par parcours, relance rapide, trois parcours courts à difficulté progressive.

## Choix de réalisation proposés par le concepteur

Les valeurs ci-dessous sont des choix initiaux à ajuster après essai tactile,
pas des demandes supplémentaires du joueur.

### Cinématique et collisions

Conserver SpinMotion indépendant de Phaser. La rotation reste analytique ; aucun
moteur physique généraliste. Le système de collisions pilote une simulation à
pas fixe de 1/240 s. À 5 rad/s et 80 px, la boule mobile parcourt au plus 1,67 px
par pas. Les changements de pivot sont appliqués au début du prochain pas ; les
événements conservent leur ordre, sans doublon souris/tactile.

Murs rectangulaires alignés sur les axes, épaisseur minimale 24 px. Boules de
rayon 17 px ; barre traitée comme une capsule de rayon 3,5 px, cohérente avec le
rendu. Tester les disques et la capsule contre les rectangles ; détecter aussi
les intersections au milieu d’un segment et les contacts dans les coins.

Chaque sous-pas conserve le dernier état libre. Si une proposition traverse un
mur, rechercher par dichotomie le premier contact entre les deux états, rester
juste avant le contact et annuler la fraction de rotation bloquée. Déclencher
une seule inversion pour le groupe de murs touchés simultanément. Le léger
recul repousse l’ensemble vers l’espace libre : distance initiale 8 px sur
80 ms, translation progressive à vitesse décroissante. Chaque translation est
elle-même testée contre TOUS les murs et raccourcie si nécessaire. Le recul ne
peut donc pas pousser l’autre boule à travers un mur opposé. En cas de coin,
combiner les normales et utiliser une direction libre testée ; si aucune
translation n’est possible, supprimer le recul sans téléporter le personnage.

Regrouper les contacts simultanés. Verrouiller leur déclenchement jusqu’à
séparation de 1 px ; un autre mur rencontré reste actif et peut rebondir. Si le
personnage reste bloqué, suspendre la seule rotation qui pénètre le mur, sans
nouvelles inversions ; un toucher doit toujours pouvoir changer le pivot pour
se dégager. Ne pas instaurer une période d’immunité permettant de traverser.

Les touchers restent actifs pendant le recul et ne suppriment pas la translation
en cours. Une nouvelle collision peut remplacer le recul en cours par une
impulsion sûre. Ni changement de pivot, ni inversion ne modifie les positions.
La caméra suit le pivot, y compris sa translation lors d’un recul.

### Parcours

Trois tracés manuels, sans hasard, décrits par des données typées et versionnées.
Spawn sans contact, boules et barre libres. Couloirs principaux d’au moins
220 px de largeur libre ; éviter les pièges dont on ne peut pas sortir. Tester
la traversabilité par une partie complète, pas uniquement par la connectivité
d’une grille.

1. Initiation : parcours court avec deux grands virages, sans impasse.
2. Précision : virages alternés et quelques passages plus exigeants.
3. Choix : deux routes vers la sortie, avec compromis distance/facilité.

Un contour de murs fermé interdit les raccourcis par l’extérieur. Départ,
sortie et orientation initiale sont définis pour chaque parcours. Les trois
parcours sont accessibles directement ; aucun déblocage ou médaille requis.
La sortie est un rectangle : les DEUX disques doivent être entièrement inclus
pour finir. La barre est alors incluse puisque le rectangle est convexe.

### Course et interface

États : ready, running, finished, interrupted. Avant le premier toucher,
rotation figée ; ce toucher démarre le temps et exécute aussi le changement de
pivot habituel. Après finish/interrupted, le personnage et le temps sont figés.
Recommencer rétablit le spawn, l’orientation, le sens initial, le pivot A,
la caméra, la trajectoire et le compteur. Un bouton distinct remet le même
parcours en ready. Les contrôles DOM ne déclenchent jamais un toucher de jeu.

Chronomètre monotone fondé sur performance.now(), et non sur le nombre d’images
ou de sous-pas. Affichage en secondes au centième ; record stocké en millisecondes,
comparaison sur cette valeur brute. La fin est mesurée à l’instant de simulation
de l’entrée complète dans la sortie. Utiliser une origine commune monotone entre
simulation et chronomètre. Aucune avance silencieuse quand le budget de calcul
est dépassé : si une interruption entre images dépasse 250 ms pendant running,
marquer la tentative interrupted ; en dessous, rattraper tous les pas.

visibilitychange vers hidden et pagehide interrompent running. En ready,
rester ready. Au retour, afficher une indication et le bouton Recommencer ; pas
de reprise de temps. Les limites 250 ms et 1/240 s sont des choix initiaux.

HUD minimal : temps, record, parcours, recommencer et accès aux parcours ou au
laboratoire. Contrôles tactiles de taille suffisante (44 px minimum). Panneau de
débogage visible uniquement au laboratoire ; aucune modification des réglages
de course. Séparer les conteneurs DOM pour éviter les éléments orphelins après
plusieurs changements de scène. Pas d’ajout d’un système de menus complexe.

Records via localStorage : clé comprenant le mode, une version des règles et
l’identifiant/version du parcours. Valeurs finies positives uniquement.
Données corrompues, stockage indisponible ou quota dépassé : continuer à jouer
avec un record en mémoire pour la session, sans erreur bloquante.

## Architecture cible

- core/SpinMotion : cinématique, sauvegarde/restauration, translation et inversion sans échange de pivot.
- collision/geometry : calculs géométriques purs disques/capsules/rectangles.
- collision/CollisionMotion : résolution à pas fixe, recul et contacts verrouillés.
- modes/maze/MazeDefinition, courses : données des trois parcours.
- modes/maze/RaceSession : états et chronométrage purs, horloge injectée.
- modes/maze/RecordStore : stockage isolé avec repli mémoire.
- scenes/MazeScene : assemblage des composants, aucune géométrie dans la scène.
- rendering/MazeRenderer et ui/RaceHud : murs/départ/sortie et interface de course.
- scenes/PrototypeScene : laboratoire existant, complété de murs de test.
- input/PointerControls et camera/PivotCamera : composants partagés.

Les noms et limites de fichiers peuvent être ajustés par le développeur si les
responsabilités restent séparées. Les signatures d’interface sont fixées dans
le plan pour permettre une réalisation par étapes.

## Validation attendue

Tests purs : continuité des positions, longueur fixe, pivot conservé au choc,
inversion unique, barre contre mur, coin, recul bloqué par un mur opposé,
contact persistant, nouveau mur pendant un recul, pas temporels et entrées
rejoués, chronomètre, interruption, redémarrage et stockage défaillant.

Tests manuels : chaque parcours terminé à la souris et au toucher ; aucun
raccourci par le contour ; sortie partielle ne termine pas la course ; interface
utilisable en portrait/paysage ; plusieurs changements laboratoire/course sans
doublons d’écouteurs ; passage en arrière-plan invalide la tentative.

npm test et npm run build doivent réussir. Vérifier le workflow GitHub Pages,
l’URL publique et ses assets. Signaler explicitement tout essai sur téléphone
réel qui n’a pas pu être effectué.
