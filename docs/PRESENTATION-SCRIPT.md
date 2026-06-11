# Telemedecine — Script de présentation (8 slides)

Guide complet pour le présentateur : ce qu'il faut dire à chaque diapositive, les
transitions, et les questions probables avec leurs réponses. Durée cible : **10–12 min**
de présentation + démo, puis questions. Le fichier de la présentation est
`docs/Soutenance-Telemedecine.pptx`.

> Conseil général : parler du **produit** et des **choix techniques**, pas du contexte
> scolaire. Montrer la maîtrise des décisions (« pourquoi ») plutôt que réciter des
> fonctionnalités.

---

## Slide 1 — Titre · *Plateforme de télémédecine*

**Ce que vous dites (≈ 45 s) :**
> « Bonjour. Je vais vous présenter Telemedecine, une plateforme de téléconsultation
> complète : une application web pour trois profils — patient, médecin et administrateur —
> doublée d'une application mobile patient. Le tout repose sur Angular 21 au front, Spring
> Boot / Java 21 au back, la vidéo temps réel avec LiveKit, et l'ensemble est conteneurisé
> avec Docker. »

**À retenir :** annoncer d'emblée les 3 espaces + web & mobile + « de bout en bout ».
**Transition :** « Commençons par le problème que ça résout et le périmètre. »

---

## Slide 2 — Contexte & objectifs · *Le problème et nos trois espaces*

**Ce que vous dites (≈ 1 min 15) :**
> « L'accès aux soins bute sur trois choses : la distance et les délais, la sensibilité des
> données médicales, et des outils éclatés — le RDV ici, l'ordonnance là, le paiement
> ailleurs. Nous avons réuni tout le parcours dans une seule plateforme, sécurisée et
> bilingue.
>
> Côté **patient** : il cherche un médecin, prend rendez-vous, consulte en vidéo, échange par
> messagerie, récupère ses ordonnances en PDF, paie, demande un remboursement, et note son
> médecin.
>
> Côté **médecin** : il gère son agenda et ses disponibilités, consulte en vidéo avec prise de
> notes, émet ordonnances et rapports, suit ses patients et ses revenus, et voit sa note
> moyenne.
>
> Côté **administrateur** : un tableau de bord en temps réel, la vérification des médecins, la
> validation des remboursements, et la gestion des comptes. »

**À retenir :** insister sur « un seul parcours, trois points de vue ».
**Transition :** « Voyons comment c'est construit. »

---

## Slide 3 — Architecture · *Topologie & pile technologique*

**Ce que vous dites (≈ 1 min 30) :**
> « À gauche, la topologie. Le point clé : **le client — web ou mobile — ne parle qu'à sa
> propre origine**. nginx fait office de reverse-proxy même origine : il relaie `/api` vers
> le backend, `/ws` pour la messagerie WebSocket, et `/lk` pour la vidéo LiveKit en wss.
> Conséquence : **aucun problème de CORS**, une seule URL, HTTPS terminé par nginx, et tout
> se lance en une commande Docker Compose.
>
> À droite, la pile : Angular 21 avec les Signals et Tailwind au front ; Spring Boot 3.5 sur
> Java 21 au back, en monolithe modulaire ; la sécurité par JWT, 2FA TOTP et HTTPS ;
> PostgreSQL 16 piloté par Flyway pour les migrations ; LiveKit pour la vidéo ; et Flutter +
> Docker côté mobile et DevOps. »

**Si on vous coupe :** le message d'or est « même origine = pas de CORS, configuration
simplifiée ».
**Transition :** « Zoom sur le backend, parce que sa structure est un choix fort. »

---

## Slide 4 — Backend modulaire & sécurité

**Ce que vous dites (≈ 1 min 15) :**
> « Le backend est un **monolithe modulaire** : un seul déployable, mais découpé en modules de
> contexte borné — auth, patient, doctor, appointment, consultation, prescription, payment,
> notification, admin. Chaque module suit le même empilement : `api` (REST) → `application`
> (la logique métier) → `domain` (les entités JPA) → `infrastructure` (les repositories).
>
> Ce qui est important : ces découpes sont **vérifiées automatiquement par des tests
> ArchUnit** — pas de dépendance cyclique entre modules, le domaine ne dépend jamais de la
> couche API. C'est ce qui donne la rigueur d'un microservice sans la complexité de
> déploiement.
>
> Côté sécurité : JWT avec un jeton d'accès court et un refresh à rotation, 2FA TOTP
> optionnelle, mots de passe en BCrypt, et le multi-rôles géré par Spring Security. Le HTTPS
> s'appuie sur une PKI maison : une autorité de certification locale signe le certificat
> serveur — avec l'IP de l'hôte dans le SAN — terminé par nginx. C'est indispensable car le
> navigateur **bloque la caméra et le micro hors contexte sécurisé**. »

**À retenir :** ArchUnit + « microservice sans la complexité » = la phrase qui marque.
**Transition :** « Voyons les fonctionnalités qui en découlent. »

---

## Slide 5 — Fonctionnalités clés

**Ce que vous dites (≈ 1 min 15) :**
> « Six fonctionnalités phares :
> - **Vidéo** : LiveKit auto-hébergé, le jeton est forgé côté backend, le client passe par le
>   proxy `/lk` en wss, avec un pré-vol caméra/micro qui donne des messages d'erreur précis.
> - **Messagerie** temps réel patient ↔ médecin en WebSocket, avec repli en polling.
> - **Ordonnances** émises depuis le rendez-vous, le patient est notifié et récupère un PDF
>   généré avec OpenPDF.
> - **Paiement & remboursement** : un seul moyen de paiement — mobile money — et la demande de
>   remboursement doit être **validée par l'administrateur**.
> - **Notation des médecins** : après une consultation terminée, le patient note de 1 à 5, et
>   la moyenne s'affiche sur la recherche et la fiche du médecin.
> - **Bilingue FR/EN** : bascule à l'exécution, sans rechargement de page. »

**À retenir :** sur paiement/remboursement et notation, dire « ce sont des ajouts récents,
pensés pour un vrai flux métier ».
**Transition :** « Place à la démonstration. »

---

## Slide 6 — Démonstration · *Tableaux de bord en direct*

**Ce que vous dites (≈ 45 s, puis démo live si possible) :**
> « Voici les trois tableaux de bord. Le point essentiel : **toutes ces données viennent de la
> base en temps réel**, il n'y a aucun contenu statique. Le patient voit ses statistiques,
> ses prochains RDV, ses ordonnances et factures ; le médecin voit ses KPIs du jour, son
> planning et sa file d'attente ; l'admin voit la répartition des RDV, la santé de la
> plateforme et les outils de gestion. »

**Si démo live :** se connecter en patient → montrer un dashboard → prise de RDV ; basculer
médecin → consultation. Garder une capture en secours si le réseau lâche.
**Transition :** « Et tout ça est aussi disponible sur mobile. »

---

## Slide 7 — Application mobile & temps forts

**Ce que vous dites (≈ 1 min) :**
> « L'application mobile Flutter met le soin dans la poche du patient, en **HTTPS de bout en
> bout**. Une subtilité technique : sous Android, `dart:io` a sa propre réserve de confiance,
> indépendante du système ; nous y injectons donc le certificat de notre CA pour que Dio
> **et** la vidéo LiveKit en wss l'acceptent. Le patient prend RDV, consulte en vidéo,
> consulte ses ordonnances et reçoit ses alertes ; la session est stockée de façon sécurisée.
> Un médecin ou un admin qui se connecte est invité à utiliser le portail web. »

**À retenir :** la confiance du certificat via `HttpOverrides` est le détail technique qui
impressionne.
**Transition :** « Pour conclure. »

---

## Slide 8 — Bilan, perspectives — merci

**Ce que vous dites (≈ 45 s) :**
> « En résumé, ce qui est livré : trois espaces web, l'app mobile en HTTPS, la vidéo, la
> messagerie et les notifications temps réel, les documents PDF, la sécurité JWT + 2FA, le
> paiement et le remboursement, la notation, et le tout 100 % dockerisé.
>
> Les perspectives naturelles : un paiement réel via Stripe ou mobile money, le stockage objet
> chiffré, le passage à Argon2id avec gestion de secrets, les notifications push natives,
> l'observabilité et un déploiement cloud avec CI/CD.
>
> Merci de votre attention — je suis à votre disposition pour vos questions. »

---

## Questions probables & réponses

**Pourquoi un monolithe modulaire plutôt que des microservices ?**
> Pour la rigueur des frontières sans le coût opérationnel : un seul déployable, une seule
> base, un seul pipeline. ArchUnit garantit le découplage. On pourrait extraire un module en
> service plus tard sans tout réécrire.

**Pourquoi HTTPS était-il obligatoire, pas juste un confort ?**
> Les navigateurs n'autorisent `getUserMedia` — caméra et micro — que dans un contexte
> sécurisé. Sans HTTPS, la vidéo ne démarre pas. D'où la PKI avec un certificat à SAN.

**Comment fonctionne la vidéo, concrètement ?**
> Le backend forge un jeton LiveKit signé (HS256). Le client se connecte au SFU LiveKit en
> wss, relayé par nginx sur `/lk`. LiveKit est auto-hébergé, donc aucune dépendance à un
> service tiers.

**Le paiement est-il réel ?**
> Non, il est simulé pour la démonstration : un seul moyen (mobile money) et un statut de
> facture. Le remboursement, lui, suit un vrai flux d'approbation par l'admin. Brancher
> Stripe est une perspective directe.

**Comment évitez-vous les dépendances circulaires entre modules ?**
> Des tests ArchUnit imposent les règles : `domain` ne dépend jamais de `api`/`infrastructure`,
> les contrôleurs restent dans `api`, et les découpes inter-modules sont acycliques. Le build
> échoue si une règle est violée.

**Où sont stockées les données sensibles / les fichiers ?**
> En base PostgreSQL (entités auditées, verrou optimiste). Les fichiers (PDF, justificatifs)
> sur disque via un module `storage`. Perspective : stockage objet chiffré (S3/MinIO).

**Comment la notation est-elle calculée ?**
> Chaque patient note un RDV terminé une seule fois (1–5). La moyenne et le nombre d'avis sont
> agrégés sur le profil du médecin et affichés sur la recherche et la fiche.

**Pourquoi MailHog ?**
> C'est un faux serveur SMTP de développement : l'application envoie réellement les e-mails
> (réinitialisation, OTP), et MailHog les capture dans une interface web sans rien envoyer à
> l'extérieur. Voir `docs/MAILHOG-AND-LIVEKIT.md`.

**Internationalisation : pourquoi pas la i18n native d'Angular ?**
> Nous voulions une bascule **à l'exécution**, sans recompiler ni recharger. Un `LocaleService`
> à base de Signal et un pipe de traduction impur re-rendent les chaînes instantanément.

**Combien de temps pour tout démarrer ?**
> Une commande `docker compose up`. Le stack monte postgres, le backend (avec migrations
> Flyway automatiques), le frontend nginx, LiveKit et MailHog.

---

## Aide-mémoire transitions (à mémoriser)

1 → 2 : « le problème et le périmètre »
2 → 3 : « comment c'est construit »
3 → 4 : « zoom sur le backend »
4 → 5 : « les fonctionnalités qui en découlent »
5 → 6 : « place à la démonstration »
6 → 7 : « aussi sur mobile »
7 → 8 : « pour conclure »
