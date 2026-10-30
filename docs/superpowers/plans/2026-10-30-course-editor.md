# Éditeur intégré, rendu continu et podium — Implementation Plan

> Exécution dans cette session avec superpowers:executing-plans ; tests avant implémentation et relecture globale avant publication.

## Objectif validé

Éditeur visuel intégré : murs rectangulaires aimantés à une grille, sélection/déplacement, suppression, départ orientable, arrivée, couleurs, test immédiat avec retour à l’éditeur, sauvegarde locale et import/export JSON. Conserver les parcours intégrés et le laboratoire. Afficher seulement les contours extérieurs continus des murs qui se touchent ou se superposent. Interface compacte en français, sans slogan ni instruction superposée au bas du terrain, colonne repliable. Recul maximal 100 px. Podium local top 3 par parcours/version et saisie du nom lors de chaque entrée dans ce top 3 (réponse utilisateur).

## Interprétations de réalisation

- Arrivée « pivot arrêté » : disque du pivot entièrement dans la zone, pivot immobile depuis le sous-pas précédent, aucune translation de recul active. Pas de touche d’arrêt supplémentaire.
- Arrivée « ensemble » : les deux disques entièrement dans la zone.
- Arrivée « cible à toucher » : collision d’une boule ou de la barre avec le rectangle cible (élément non solide), sans clic direct sur l’objet.
- Palette par parcours : fond, quadrillage, remplissage des blocs, contour, remplissage/contour arrivée, départ. Tous les blocs contigus utilisent la même palette pour former une silhouette unique.
- Les parcours personnalisés et records restent locaux. Export/import JSON pour partager manuellement, sans serveur. Validation stricte des imports et rendu des textes par textContent.
- Les records historiques anonymes sont migrés dans le podium. Un même nom peut avoir plusieurs temps ; égalité départagée par ordre d’enregistrement.

## Tâches et interfaces

### 1. Contours continus et sécurité du recul

- [ ] Tests purs `tests/wallOutline.test.ts` : jonction complète/partielle, superposition, forme en L, trou et rectangles séparés ; aucun segment interne, périmètre attendu.
- [ ] Créer `src/rendering/wallOutline.ts`, API `wallOutline(rects:readonly Rect[]): Segment[]`, puis rendu partagé `drawWalls` : remplissage de tous les rectangles puis contour de leur union uniquement. Employer le même résultat dans les cartes et l’éditeur.
- [ ] Porter le réglage et la validation à 100 ; tester les murs opposés à cette valeur. Borner les sous-mouvements de recul à 2 px pour conserver la sécurité aux grandes impulsions.

### 2. Parcours enrichis et conditions d’arrivée

- [ ] Ajouter `finishMode: 'pivot'|'whole'|'touch'` et palette optionnels avec valeurs par défaut rétrocompatibles.
- [ ] Tests des trois arrivées, notamment pivot en recul refusé, boule orbitante dans zone ne suffit pas, barre touchant cible, ensemble partiel refusé.
- [ ] Créer `finishReached` pur, intégrer dans MazeRun sans casser les parcours existants.
- [ ] Validation bornée : <=128 murs, coordonnées ±8000, rectangles finis, couleurs hex strictes ; départ et sortie libres, taille de sortie adaptée à son mode, titres et IDs bornés.

### 3. Modèle d’édition et stockage

- [ ] `EditorDocument` : murs sélectionnables, grille 20 px, outils mur/sélection/départ/arrivée/navigation, déplacement, taille du mur sélectionné, annuler/rétablir.
- [ ] `CourseStore` : liste locale versionnée, JSON importé non fiable contrôlé avant chargement, repli mémoire, sauvegarder un tracé modifié incrémente sa version (couleurs seules ne changent pas les règles).
- [ ] Tests sauvegarde/restauration, version, validation, limite de murs, import corrompu et données hors limites.

### 4. Podium

- [ ] Étendre RecordStore sans casser get/submit existants ; `top(maze)`, `qualifies(maze,time)`, `submitNamed(maze,time,name)`.
- [ ] MazeRun sait finir sans soumettre automatiquement pour la scène ; garder l’option actuelle par défaut pour les tests existants.
- [ ] Saisie DOM au résultat top 3, validation nom 1..24 caractères, option Passer → Anonyme, aucune injection HTML, pas d’écouteurs accumulés, records périmètre version.
- [ ] Tests classement, égalités, migration ancien record, nom, stockage défaillant, soumission unique.

### 5. Éditeur Phaser et interface

- [ ] `EditorScene`, `EditorPanel` : dessin tactile/souris, poignée logique de sélection (taille via panneau), placement départ/arrivée, panoramique et zoom, couleurs en direct, validation visible, test et retour conservant le document, liste personnalisée et import/export.
- [ ] Données temporaires passées à la scène de course et retour éditeur ; palette appliquée à la caméra et au rendu, pas de perte au changement de scène.
- [ ] Réduire le titre à 44 px, texte « Parcours »/« Laboratoire »/« Éditeur », supprimer slogan et instruction bas de terrain, bouton global de repli de colonne, resize canvas observé via ResizeObserver. Colonne réouvrable à la souris et au clavier sur mobile.
- [ ] Séparer et nettoyer les trois panneaux ; espace ne déclenche pas d’édition ni ne vole la saisie de nom.

### 6. Vérification et publication

- [ ] Suite complète et build, revue globale, corrections avec régressions.
- [ ] Navigateur : dessin de murs jointifs sans couture, sélection/déplacement/suppression, couleurs, les trois arrivées, sauvegarde/import/export, test/retour, repli/réouverture, nom/podium, formats portrait et ordinateur.
- [ ] Mettre README à jour, intégrer sur main et publier via workflow existant. Vérifier l’interface publique. Signaler les essais physiques non effectués.
