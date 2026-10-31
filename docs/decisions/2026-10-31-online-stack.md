# Choix techniques — première course réseau

Statut : choix d’implémentation locale, 31 octobre 2026. Aucun abonnement ni serveur externe ouvert.

## Transport et autorité

Retenir Colyseus : `@colyseus/core` 0.18.23, `@colyseus/ws-transport` 0.18.4 et `@colyseus/sdk` 0.18.9, versions vérifiées dans le registre npm. [Documentation officielle des salles](https://docs.colyseus.io/room).

Un serveur WebSocket minimal éviterait une dépendance mais nous ferait entretenir admission, cycle de vie, reconnexion et annuaire. Colyseus apporte ces primitives. Garder nos propres règles pures et un protocole versionné : ne pas faire dépendre la cinématique du système de schémas du fournisseur. Snapshots complets à 20 Hz initialement, prédiction locale et réconciliation explicites ; optimiser les deltas après mesure.

## Comptes et stockage

Retenir Supabase Auth + PostgreSQL RLS ; `@supabase/supabase-js` 2.118.0. Connexion par lien email et stockage de révisions privées. Les invités reçoivent une identité limitée aux salons, sans compte permanent requis. La vérification serveur fait autorité ; aucune clé de service dans le navigateur. [Connexion email](https://supabase.com/docs/guides/auth/auth-email-passwordless), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

Firebase serait une alternative gérée ; PostgreSQL convient mieux ici aux révisions immuables et contrôles d’appartenance. Une base et authentification entièrement développées à la main ajoutent une charge de maintenance disproportionnée. L’accès aux services reste derrière des ports testables.

## Mesure initiale

Commande : `node --import tsx scripts/benchmark-race.ts`. Machine locale Node v23.5.0 ; production visée Node 22 LTS. Quatre personnages, 60 secondes simulées à 240 Hz, murs existants, cinq mesures après préchauffage : médiane 511,60 ms, maximum 558,09 ms, 0,0355 ms par tick ; environ 0,85 % d’un cœur en temps de calcul rapporté au temps simulé. Tas utilisé en fin de mesure : 10,06 Mio (ce n’est pas une mesure d’allocations cumulées).

Ce test exclut contacts entre joueurs, comptes et transport ; il ne prouve aucune capacité de serveur ni coût final. Répéter après ajout des contacts et en transport réel. Conserver 240 Hz pour les règles actuelles et 20 Hz pour les snapshots sous réserve de ces mesures.

## Développement et hébergement

Le client reste Vite et GitHub Pages ; le serveur Node doit être hébergé sur un service supportant une connexion WebSocket persistante. Développement : serveur local, Supabase local via Docker pour Auth/Postgres ; le daemon Docker est indisponible au début de cette session, donc les tests de droits réels ne sont pas encore exécutables.

Avant activation externe : comparer une petite instance Node en région européenne avec l’offre gérée Colyseus, puis un projet Supabase dans la même région. Établir un coût à partir du nombre de salles mesuré, de la mémoire, du stockage et de l’envoi des emails. Ne pas promettre qu’un palier gratuit suffit. Présenter ce coût et la configuration SMTP, sauvegarde et rétention avant ouverture.

Défaillance réseau : mode solo local conservé. Journaux sans jetons ni emails ; métriques anonymes de charge et fréquence d’erreurs. Prévoir restauration d’une sauvegarde et protocole client/serveur compatible avant la première publication.
