# SPIN — Labyrinthes contre-la-montre · v0.1

Deux boules reliées par une barre, un seul geste : changez de pivot pour rejoindre
la sortie le plus rapidement possible. Un prototype d’arcade 2D inspiré de la
mécanique de déplacement de _Twin Spin_ (GlobZ).

**[Jouer dans le navigateur](https://charlescoiffier.github.io/spin/)** ·
[Code source](https://github.com/charlescoiffier/spin)

## Jouer

- Touchez le terrain ou cliquez avec le bouton principal : le pivot change et
  le sens de rotation s’inverse, sans saut de position.
- Le premier toucher démarre la course et exécute ce même geste.
- Les murs réagissent aux deux boules **et à la barre** : ils inversent la rotation
  et repoussent légèrement l’ensemble, en conservant le pivot actif et la longueur.
- Aucun supplément de temps ni retour au départ lors d’un choc.
- Placez les **deux boules entièrement dans la zone menthe** pour terminer.
- Recommencez pour améliorer votre record, enregistré localement par parcours.
- Les boutons des trois parcours sont accessibles dès le départ. La petite carte
  montre votre position en abricot et la sortie en menthe.

### Trois parcours

| Parcours       | Principe                                                    |
| -------------- | ----------------------------------------------------------- |
| Le détour      | Apprendre à contourner un mur et négocier de larges virages |
| Les lacets     | Enchaîner les changements de direction                      |
| La bifurcation | Choisir un chemin autour de l’îlot central                  |

Le passage en arrière-plan interrompt une tentative. Une pause de calcul de plus
de 250 ms l’interrompt également : il faut recommencer pour obtenir un temps valide.
Le chronomètre utilise une horloge monotone, avec affichage au centième et
résolution de simulation d’environ 4,17 ms. Les records ne sont ni partagés ni
synchronisés ; si le stockage est refusé, ils sont conservés pour la session.

## Laboratoire

Le bouton **Ouvrir le laboratoire** donne accès aux réglages libres, au quadrillage,
aux repères et à quelques murs pour observer les rebonds. Le panneau de débogage
est séparé de l’interface de course. **Jouer aux labyrinthes** permet de revenir.

| Paramètre         | Valeur par défaut et valeur fixe en course |
| ----------------- | ------------------------------------------ |
| Vitesse angulaire | 5 rad/s                                    |
| Longueur de barre | 80 px                                      |
| Zoom caméra       | 0,7                                        |
| Lissage caméra    | 0,3 s                                      |

Au laboratoire, les réglages s’appliquent immédiatement. Modifier la longueur
conserve le pivot et déplace la boule mobile ; une valeur qui placerait la barre
ou une boule dans un mur est refusée. La réinitialisation remet les réglages par
défaut, les positions, la trajectoire et la caméra.

Le lissage caméra est une constante de temps : environ 63 % du recentrage est
effectué après cette durée, zéro donnant un suivi immédiat. La caméra ne modifie
jamais les positions du monde. Le sens de rotation utilise le repère écran (Y vers
le bas). La trajectoire représente le centre de la barre et conserve 1200 points.

## Installation et développement

Phaser 3 + TypeScript strict + Vite, sans moteur physique ni serveur de jeu.
Node.js 22.12+ recommandé (ou 20.19+).

```sh
npm install
npm run dev
```

Ouvrez l’URL affichée par Vite. Sur un téléphone du même réseau, utilisez l’adresse
réseau affichée (port 5173 par défaut).

```sh
npm test
npm run build
npm run preview
```

## Architecture

- `src/core` : cinématique pure, états et simulation à pas fixe de 1/240 s.
- `src/collision` : contacts disque/capsule contre rectangles, arrêt au contact,
  inversion et recul progressif de 8 px sur 80 ms, limité par les autres murs.
- `src/modes/maze` : parcours versionnés, session, chronomètre et records.
- `src/rendering` : personnage, trajectoire et labyrinthes.
- `src/input`, `src/camera` : entrées souris/tactile et suivi du pivot partagés.
- `src/scenes` : assemblage du laboratoire et du mode course.
- `src/ui`, `src/debug` : interface de course et contrôles de développement distincts.
- `tests` : invariants de mouvement, contacts, temps, stockage défaillant et
  traversées complètes des parcours par suites de touchers.
- `docs/superpowers` : conception et plan de développement.

Une même suite d’appuis horodatés donne le même mouvement à pas fixe,
à la précision flottante près. Les contacts persistants sont verrouillés jusqu’à
séparation ; les murs restent solides pendant le recul. Aucune correction par
téléportation et aucune fenêtre d’immunité aux collisions.

## Publication et validation

GitHub Actions exécute les tests, compile puis publie `dist/` sur GitHub Pages à
chaque push sur `main`. La source Pages est **GitHub Actions** dans les paramètres
du dépôt. Le workflow peut aussi être relancé manuellement.

Les tests automatisés vérifient des traversées complètes des trois parcours et
les deux routes de La bifurcation, sans pénétration des murs. L’interface est
contrôlée dans le navigateur aux formats ordinateur, portrait et paysage.
Ces simulations ne remplacent pas un essai tactile sur un téléphone réel,
qui reste à effectuer pour affiner le ressenti du rebond et la difficulté.

Capacitor, sons, monétisation et classement en ligne ne sont pas intégrés.
Le build statique `dist/` pourra servir de `webDir` lors de l’adaptation Capacitor.
