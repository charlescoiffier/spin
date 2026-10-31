# SPIN — Parcours et éditeur intégré

Un jeu d’arcade 2D de parcours contre-la-montre, inspiré de la mécanique de
_Twin Spin_ (GlobZ), avec un éditeur visuel dans le navigateur.

**[Jouer et créer un parcours](https://charlescoiffier.github.io/spin/)** ·
[Code source](https://github.com/charlescoiffier/spin)

## Évolution multijoueur en cours

La branche `feat/online-race` prépare la première course à 1–4 joueurs : serveur
autoritaire, contacts optionnels, salons publics/privés, invités, comptes et
terrains privés versionnés. Elle n’est pas encore publiée : l’authentification,
les droits en base réelle et les essais sur plusieurs appareils restent à valider.
L’interface indique clairement lorsque les services ne sont pas configurés.

- [Document cadre validé](docs/superpowers/specs/2026-10-31-spin-multiplayer-design.md)
- [Feuille de route](docs/superpowers/plans/2026-10-31-spin-roadmap.md)
- [Plan de la course réseau](docs/superpowers/plans/2026-10-31-spin-online-race.md)
- [Configuration et commandes réseau](docs/operations/online-race.md)

Pour développer le réseau : `npm run dev:server` dans un terminal et
`npm run dev` dans un autre. Les comptes et sauvegardes nécessitent la
configuration décrite dans le guide ; aucun compte de démonstration ne contourne
les permissions. Le mode solo conserve son fonctionnement local.

## Jouer

Un clic, un toucher du terrain ou un appui sur **espace** échange le pivot et
inverse la rotation. L’appui maintenu sur espace ne répète pas le geste ; la
saisie de texte (notamment le nom du joueur) conserve les espaces. Hors saisie,
espace déclenche le spin même lorsqu’un bouton ou un réglage possède le focus.
Le premier geste démarre le chronomètre.

Les murs font rebondir les deux boules et la barre : rotation inversée,
pivot conservé, léger recul progressif de l’ensemble. Aucun supplément de temps
ni retour au départ. Les murs jointifs ou superposés forment une silhouette
continue : les arêtes internes ne sont pas dessinées.

Trois parcours sont fournis : **Le détour**, **Les lacets**, **La bifurcation**.
Les parcours enregistrés dans l’éditeur rejoignent cette liste.

Chaque parcours choisit sa condition d’arrivée :

- **Une boule pivot immobile** : le disque du pivot entièrement dans la zone,
  sans translation de recul en cours. Un geste permet d’immobiliser l’autre boule.
- **L’ensemble dans la zone** : les deux disques entièrement à l’intérieur.
- **Cible à toucher** : contact d’une boule ou de la barre avec la cible ; il
  s’agit d’un contact du personnage, pas d’un clic sur la cible.

Le passage en arrière-plan ou une interruption de calcul de plus de 250 ms
invalide la tentative. Recommencer rétablit le départ et remet le temps à zéro.
Le chronomètre est monotone, affiché au centième et calculé à environ 4,17 ms près.

## Podium

Les **trois meilleurs temps** sont affichés par parcours et version. À l’entrée
dans ce classement, le jeu demande un nom (24 caractères maximum) ; **Passer**
enregistre le temps sous « Anonyme ». Les égalités gardent l’ordre d’enregistrement.
Les anciens records sont conservés sous « Anonyme ».

Parcours et résultats restent dans **ce navigateur**, sans compte ni classement
en ligne. Si le stockage est refusé, ils restent disponibles pour la session.

## Éditeur de parcours

Ouvrez **Éditeur de parcours** depuis la course ou le laboratoire.

1. Choisissez un parcours existant ou **Nouveau parcours**.
2. **Dessiner un mur** : glissez sur le terrain ; un clic crée un bloc de 80 px.
   Les coordonnées sont aimantées sur une grille de 20 px.
3. **Sélection** : cliquez un mur ou l’arrivée, puis glissez pour le déplacer.
   Le panneau permet de modifier largeur/hauteur et de supprimer un mur.
4. Placez le départ et son orientation, puis l’arrivée et sa condition.
5. Dans **Couleurs du décor**, choisissez fond, quadrillage, remplissage et
   contours des blocs, remplissage et contour d’arrivée, couleur du départ.
   La palette s’applique au parcours entier, y compris aux blocs contigus.
6. **Tester le parcours** lance un essai avec retour à l’éditeur, sans modifier
   le podium. Le document et son historique restent disponibles au retour.
7. **Enregistrer le parcours** le conserve localement ; **Exporter JSON** et
   **Importer JSON** permettent de le partager ou de le sauvegarder en fichier.

**Annuler/Rétablir**, **Cadrer**, le zoom et l’outil **Déplacer la vue** facilitent
l’édition. La molette zoome ; le bouton central de souris déplace aussi la vue.
Le surlignage orange identifie l’élément sélectionné uniquement pendant l’édition.

La validation refuse notamment un départ ou une arrivée dans un mur, les données
invalides et les arrivées trop petites. Limites : 128 murs, 40 parcours locaux,
coordonnées ±8000, fichier importé de 1 Mo maximum. Elle ne garantit pas la
traversabilité : testez les passages avec le personnage. Un changement de tracé,
de départ ou de condition d’arrivée crée une nouvelle version pour les scores ;
changer uniquement les couleurs ou le titre conserve le podium.

## Interface et laboratoire

**Masquer le panneau / Afficher le panneau** replie les contrôles et agrandit
le terrain. Le titre occupe 44 px. L’interface s’adapte au portrait et au paysage.

Le laboratoire conserve le quadrillage, des repères et les réglages libres :

| Paramètre         | Défaut (fixe en course) | Réglage au laboratoire |
| ----------------- | ----------------------- | ---------------------- |
| Vitesse angulaire | 5 rad/s                 | 0 à 6 rad/s            |
| Barre             | 80 px                   | 60 à 280 px            |
| Zoom              | 0,7                     | 0,4 à 2                |
| Lissage caméra    | 0,3 s                   | 0 à 1,5 s              |
| Recul             | 8 px                    | **0 à 100 px**         |

**Enregistrer ces réglages** conserve le jeu de paramètres courant dans ce navigateur.
**Enregistrer et tester en parcours** l’applique directement à une partie d’essai.
Les réglages enregistrés sont aussi accessibles depuis les parcours avec
**Tester les réglages enregistrés** et survivent au rechargement de la page.
Le bouton **Revenir aux réglages standards** rétablit les règles du classement.
Les essais avec ces paramètres sont chronométrés mais sans podium ; une barre
qui touche un mur au départ ou ne peut pas tenir dans l’arrivée est signalée.
La réinitialisation du laboratoire ne remplace la sauvegarde que si vous
choisissez de l’enregistrer à nouveau. Si le stockage est refusé, les réglages
restent disponibles pour la session.

Le recul dure 80 ms ; zéro supprime sa translation et conserve le rebond.
Un changement de recul s’applique au prochain choc, sans saut pendant un recul
engagé. La caméra ne modifie jamais les coordonnées du monde. Une longueur qui
placerait le personnage dans un mur est refusée. La réinitialisation restaure
les valeurs ci-dessus. La trajectoire représente le centre de la barre.

## Développement

Phaser 3, TypeScript strict, Vite, sans moteur physique ni serveur de jeu.
Node.js 22.12+ recommandé (ou 20.19+).

```sh
npm install
npm run dev
```

Utilisez l’URL Vite affichée. Pour un téléphone du même réseau, ouvrez l’adresse
réseau indiquée (port 5173 par défaut).

```sh
npm test
npm run build
npm run preview
```

- `src/core`, `src/collision` : cinématique pure, pas fixe, contacts et recul sûr.
- `src/rendering` : personnage et contours de l’union des rectangles.
- `src/modes/maze` : définitions, palettes, arrivées, sessions et podium.
- `src/editor` : document avec historique, stockage et panneau d’édition.
- `src/scenes`, `src/ui`, `src/debug` : assemblage et interfaces.
- `tests` : géométrie, parcours, édition, stockage, chronométrage et contrôles.

Les traversées automatisées terminent les trois parcours et les deux routes de
La bifurcation sans pénétration des murs. Les contrôles de navigateur couvrent
l’édition, le test/retour, l’export/import, le podium, le repli de panneau et le
format mobile. Ces vérifications ne remplacent pas un essai tactile sur un
appareil physique, restant à effectuer pour affiner le ressenti.

Chaque push sur `main` exécute tests et build, puis publie `dist/` sur GitHub Pages.
Capacitor, son, monétisation et classement en ligne ne sont pas intégrés.
