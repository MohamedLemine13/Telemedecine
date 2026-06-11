/**
 * Runtime translation dictionary for the FR/EN language switch. Keys are
 * semantic dot-paths; each entry carries the English and French copy. Add new
 * keys here and reference them with the {@link TranslatePipe} (`'key' | t`) or
 * {@link LocaleService.t}. Missing keys fall back to the key itself, so an
 * untranslated string is obvious rather than blank.
 */
export type Lang = 'en' | 'fr';

export const LANGS: { code: Lang; label: string; flag: string }[] = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' }
];

export const TRANSLATIONS: Record<string, Record<Lang, string>> = {
  // ── Shell / navigation ────────────────────────────────────────────────────
  'shell.patient':            { en: 'Health space',  fr: 'Espace santé' },
  'shell.practice':           { en: 'Practice',       fr: 'Cabinet' },
  'shell.admin':              { en: 'Administration',  fr: 'Administration' },
  'nav.group.main':           { en: 'Main',            fr: 'Principal' },
  'nav.group.overview':       { en: 'Overview',        fr: 'Aperçu' },
  'nav.group.care':           { en: 'Care',            fr: 'Soins' },
  'nav.group.account':        { en: 'Account',         fr: 'Compte' },
  'nav.group.practice':       { en: 'Practice',        fr: 'Cabinet' },
  'nav.group.management':     { en: 'Management',       fr: 'Gestion' },
  'nav.dashboard':            { en: 'Dashboard',        fr: 'Tableau de bord' },
  'nav.doctors':              { en: 'Find a doctor',    fr: 'Trouver un médecin' },
  'nav.appointments':         { en: 'Appointments',     fr: 'Rendez-vous' },
  'nav.medicalRecord':        { en: 'Medical record',   fr: 'Dossier médical' },
  'nav.prescriptions':        { en: 'Prescriptions',    fr: 'Ordonnances' },
  'nav.messages':             { en: 'Messages',         fr: 'Messagerie' },
  'nav.payments':             { en: 'Payments',         fr: 'Paiements' },
  'nav.settings':             { en: 'Settings',         fr: 'Paramètres' },
  'nav.agenda':               { en: 'Agenda',           fr: 'Agenda' },
  'nav.availability':         { en: 'Availability',     fr: 'Disponibilités' },
  'nav.patients':             { en: 'Patients',         fr: 'Patients' },
  'nav.payouts':              { en: 'Payouts',          fr: 'Revenus' },
  'nav.profile':              { en: 'Profile',          fr: 'Profil' },
  'nav.verifications':        { en: 'Verifications',    fr: 'Vérifications' },
  'nav.accounts':             { en: 'Accounts',         fr: 'Comptes' },
  'nav.reports':              { en: 'Reports',          fr: 'Rapports' },

  // ── Common ────────────────────────────────────────────────────────────────
  'common.search':            { en: 'Search…',          fr: 'Rechercher…' },
  'common.viewAll':           { en: 'View all',         fr: 'Tout voir' },
  'common.all':               { en: 'All',              fr: 'Tout' },
  'common.loading':           { en: 'Loading…',         fr: 'Chargement…' },
  'common.save':              { en: 'Save',             fr: 'Enregistrer' },
  'common.cancel':            { en: 'Cancel',           fr: 'Annuler' },
  'common.join':              { en: 'Join',             fr: 'Rejoindre' },
  'common.download':          { en: 'Download',         fr: 'Télécharger' },
  'common.language':          { en: 'Language',         fr: 'Langue' },

  // ── Patient dashboard ─────────────────────────────────────────────────────
  'pd.hello':                 { en: 'Hello',            fr: 'Bonjour' },
  'pd.subtitle':              { en: "Here's a quick look at your health space.", fr: 'Un aperçu rapide de votre espace santé.' },
  'pd.findDoctor':            { en: '+ Find a doctor',  fr: '+ Trouver un médecin' },
  'pd.stat.upcoming':         { en: 'Upcoming',         fr: 'À venir' },
  'pd.stat.upcomingSub':      { en: 'scheduled visits', fr: 'visites programmées' },
  'pd.stat.prescriptions':    { en: 'Prescriptions',    fr: 'Ordonnances' },
  'pd.stat.prescriptionsSub': { en: 'on file',          fr: 'enregistrées' },
  'pd.stat.due':              { en: 'Amount due',       fr: 'Montant dû' },
  'pd.stat.duePending':       { en: 'pending',          fr: 'en attente' },
  'pd.stat.reimbursed':       { en: 'Reimbursed',       fr: 'Remboursé' },
  'pd.stat.reimbursedSub':    { en: 'to date',          fr: 'à ce jour' },
  'pd.action.findDoctor':     { en: 'Find a doctor',    fr: 'Trouver un médecin' },
  'pd.action.appointments':   { en: 'Appointments',     fr: 'Rendez-vous' },
  'pd.action.medicalRecord':  { en: 'Medical record',   fr: 'Dossier médical' },
  'pd.action.messages':       { en: 'Messages',         fr: 'Messagerie' },
  'pd.upcoming':              { en: 'Upcoming appointments', fr: 'Prochains rendez-vous' },
  'pd.noUpcoming':            { en: 'No upcoming appointments.', fr: 'Aucun rendez-vous à venir.' },
  'pd.recentPrescriptions':   { en: 'Recent prescriptions', fr: 'Ordonnances récentes' },
  'pd.noPrescriptions':       { en: 'No prescriptions yet. They appear here after a consultation.', fr: 'Aucune ordonnance pour le moment. Elles apparaîtront après une consultation.' },
  'pd.transactions':          { en: 'Recent transactions', fr: 'Transactions récentes' },
  'pd.noTransactions':        { en: 'No transactions yet — invoices are raised after a completed consultation.', fr: 'Aucune transaction — les factures sont émises après une consultation terminée.' },
  'pd.col.doctor':            { en: 'Doctor',           fr: 'Médecin' },
  'pd.col.amount':            { en: 'Amount',           fr: 'Montant' },
  'pd.col.status':            { en: 'Status',           fr: 'Statut' },
  'pd.col.date':              { en: 'Date',             fr: 'Date' },

  // ── Medical record ────────────────────────────────────────────────────────
  'mr.gender':                { en: 'Gender',           fr: 'Sexe' },
  'mr.gender.female':         { en: 'Female',           fr: 'Femme' },
  'mr.gender.male':           { en: 'Male',             fr: 'Homme' },
  'mr.dob':                   { en: 'Date of birth',    fr: 'Date de naissance' },
  'mr.history':               { en: 'Medical history',  fr: 'Antécédents médicaux' }
};
