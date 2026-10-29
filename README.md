# SPIN — prototype v0.1

Prototype d’arcade 2D inspiré de la mécanique de déplacement de *Twin Spin* (GlobZ).
Deux boules reliées par une barre : touchez le terrain pour changer de pivot et
inverser la rotation, puis explorez l’environnement.

**[Jouer dans le navigateur](https://charlescoiffier.github.io/spin/)** ·
[Code source](https://github.com/charlescoiffier/spin)

Phaser 3 + TypeScript + Vite, sans moteur physique.
Node.js 22.12+ (ou 20.19+) requis.

## Démarrage

```sh
npm install
npm run dev
```

Ouvrir l’URL affichée par Vite. Pour tester sur un téléphone du même réseau,
utiliser l’adresse réseau affichée par Vite (port 5173 par défaut).

```sh
npm test
npm run build
npm run preview
```

## Commandes

Cliquer avec le bouton principal ou toucher le terrain pour changer de pivot
et inverser simultanément la rotation. Le panneau de test n’active pas le geste.
Le sens est exprimé dans le repère écran (Y vers le bas).

Les réglages s’appliquent immédiatement. Modifier la longueur déplace la boule
mobile en conservant le pivot ; contrairement au changement de pivot, ce réglage
peut donc déplacer instantanément une boule. La réinitialisation rétablit tous
les réglages, les positions, le suivi et la trajectoire.

Le lissage caméra est une constante de temps en secondes : après cette durée,
environ 63 % du recentrage est effectué. Zéro donne un suivi immédiat.
La trajectoire montre le centre de la barre, conserve au maximum 1200 points et
s’efface quand on modifie la longueur, bascule son affichage ou réinitialise.
Le quadrillage couvre une aire de 8000 × 8000 unités, librement traversable,
sans limites physiques ni collisions. Le mouvement reste possible au-delà.

## Organisation

- `src/core` : cinématique pure et paramètres, réutilisables par de futurs modes.
- `src/rendering` : boules, barre et trajectoire.
- `src/input` : entrées Phaser souris/tactile.
- `src/camera` : suivi indépendant des coordonnées du monde.
- `src/environment` : terrain de test, repères et obstacles décoratifs.
- `src/debug` : panneau DOM de développement.
- `src/scenes` : assemblage des composants.

La simulation utilise une rotation analytique en fonction du temps écoulé.
À chaque changement de pivot, les positions restent intactes et l’angle est
reconstruit depuis le vecteur entre les boules. Une même suite d’événements
aux mêmes temps produit le même mouvement, à la précision flottante près.
Les tests vérifient pivot fixe, longueur, continuité, inversion et indépendance
du découpage temporel. Les futures scènes de modes peuvent partager SpinMotion
sans dépendre du terrain de test ni du panneau DOM.

Capacitor n’est pas intégré dans cette version. Le build statique `dist/` pourra
servir de `webDir` lors de cette adaptation.

## Réglages par défaut

| Paramètre | Valeur |
| --- | --- |
| Vitesse angulaire | 5 rad/s |
| Longueur de barre | 80 px |
| Zoom caméra | 0,7 |
| Lissage caméra | 0,3 s |

## Publication

GitHub Actions exécute les tests, compile le projet et publie `dist/` sur
GitHub Pages à chaque push sur `main`. La source Pages doit être **GitHub Actions**
dans les paramètres du dépôt. Le workflow peut aussi être relancé manuellement.

## Suite envisagée

Un mode labyrinthe contre-la-montre est en cours de conception. Les labyrinthes,
le chronomètre et les rebonds sur les murs ne sont pas encore implémentés.
