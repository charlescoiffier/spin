# v0.1 — compte rendu d’implémentation

## Livré

Les six tâches du plan sont implémentées : cinématique, collisions/recul,
laboratoire, trois labyrinthes, chronomètre/records et interface de course.

## Vérifications

- 32 tests purs/intégration passent ; compilation TypeScript et build Vite réussis.
- Quatre traversées automatisées par les seules commandes de toucher terminent
  les trois parcours, dont les deux routes de La bifurcation, sans pénétration des murs.
- Navigateur : démarrage, relance, sélection, cinq allers-retours laboratoire/course ;
  affichage inspecté en 1280×800, 390×844 et 844×390, sans erreur console.
- Une relecture indépendante du changement complet n’a relevé aucun défaut bloquant.
- L’incohérence de case trajectoire signalée par la relecture a été reproduite dans
  le navigateur puis corrigée et revérifiée sur le serveur de développement.

## Choix d’exécution et écarts

- Branche dédiée dans le même dossier pour respecter le travail dans cette session.
  Conséquence : le checkout partagé a changé de branche pendant l’implémentation.
- Module pur `MazeRun` ajouté pour tester l’assemblage entrées/collisions/course
  sans Phaser. Coût : un module supplémentaire, scène plus légère.
- Au laboratoire, une longueur qui provoquerait un chevauchement de mur est refusée,
  plutôt que de téléporter le joueur. Conséquence : le curseur revient à la dernière
  valeur valide dans ce cas.
- Les traversées complètes ont été contrôlées par simulations d’appuis, complétées
  par des essais d’interface dans le navigateur. Des parties manuelles complètes et
  l’essai tactile sur téléphone réel restent à effectuer.

## Limites et réglages à éprouver

Le recul initial (8 px sur 80 ms), le seuil d’interruption (250 ms), la difficulté
et le compromis entre les deux routes doivent être évalués lors des parties
réelles. Les collisions testent des sous-pas bornés et recherchent le contact par
dichotomie ; ce n’est pas un balayage analytique exact des arcs. Les paramètres
bornés de cette version et les tests n’ont montré aucune traversée de mur.

Le build conserve l’avertissement Vite de taille du bundle Phaser, sans échec.
Aucun problème fonctionnel connu n’est laissé volontairement en attente.
