import type { Dictionary } from './en';

/** French. Typed against English, so nothing can be forgotten. */
export const fr: Dictionary = {
  language: { label: 'Langue', change: 'Changer de langue' },

  nav: {
    menu: 'Menu',
    closeMenu: 'Fermer le menu',
    openMenu: 'Ouvrir le menu',
    directory: 'Annuaire',
    community: 'Communauté',
    howVerificationWorks: 'Comment fonctionne la vérification',
    emergency: 'Aide urgente',
    signIn: 'Se connecter',
    createAccount: 'Créer un compte',
    signOut: 'Se déconnecter',
    skipToContent: 'Aller au contenu',
  },

  groups: {
    explore: 'Explorer',
    yourCases: 'Vos dossiers',
    findHelp: 'Trouver de l’aide',
    yourAccount: 'Votre compte',
    yourPractice: 'Votre cabinet',
    yourProfile: 'Votre profil',
    communityAndHelp: 'Communauté et assistance',
    console: 'Console',
    public: 'Public',
  },

  items: {
    dashboard: 'Tableau de bord',
    myCases: 'Mes dossiers',
    fees: 'Honoraires et reçus',
    rooms: 'Salles de conférence',
    reviews: 'Avis',
    inquiries: 'Demandes',
    verification: 'Vérification',
    support: 'Assistance',
    alerts: 'Alertes',
    myProfile: 'Mon profil',
    accountSecurity: 'Compte et sécurité',
    publicDirectory: 'Annuaire public',
    portfolio: 'Mon portefeuille',
    pending: 'Dossiers en attente d’examen',
    clients: 'Clients',
    calendar: 'Agenda',
    emergencyDesk: 'Bureau des urgences',
    enquiryPool: 'Réseau de demandes',
    legalDetails: 'Informations juridiques',
    listing: 'Fiche de l’annuaire',
    receiptLayout: 'Mise en page du reçu',
    firmLawyers: 'Avocats inscrits',
    invitations: 'Invitations du cabinet',
    practiceOversight: 'Supervision du cabinet',
    myDetails: 'Mes informations',
    myAlerts: 'Mes alertes',
    pushNotifications: 'Notifications push',
    activityRegister: 'Journal d’activité',
    settings: 'Paramètres',
    accounts: 'Comptes',
    verificationQueue: 'File de vérification',
    casesOversight: 'Dossiers (supervision)',
    emergencies: 'Urgences',
    meetings: 'Réunions et salles',
    payments: 'Paiements',
  },

  tabs: { home: 'Accueil', community: 'Communauté', allBoards: 'Tous les forums' },

  landing: {
    badge: 'Émirats arabes unis',
    heroTitle: 'Trouvez un avocat que vous pouvez vraiment vérifier.',
    heroBody:
      'Dubai Legal vous met en relation avec des avocats et des cabinets de tous les Émirats : titres vérifiés, dossier suivi du premier message au dernier, et tout ce qui compte réuni au même endroit.',
    findLawyer: 'Trouver un avocat',
    iAmProfessional: 'Je suis avocat ou un cabinet',
    urgentHelp: 'Aide urgente, sans compte',
    legalFirms: 'Cabinets',
    lawyers: 'Avocats',
    clientReviews: 'Avis de clients',
  },

  community: {
    heading: 'Demandez à ceux qui sont déjà passés par là',
    intro:
      'Des réponses réelles de membres qui sont déjà passés par là : en quoi consiste une procédure, ce qu’elle a coûté, qui a aidé. Tout le monde peut le lire ; un compte permet de réagir, de répondre ou de poser sa propre question.',
    readOnlyTitle: 'Lisez tout ; connectez-vous pour participer',
    readOnlyBody:
      'Chaque publication et chaque réponse est ouverte à tous. Pour réagir, commenter ou poser votre question, connectez-vous ou créez un compte : vous reviendrez directement sur cette page.',
    writePost: 'Écrire une publication',
    writePostHelp:
      'Posez une question, recommandez un professionnel que vous avez consulté ou racontez ce qui s’est passé. Un modérateur la lit d’abord, surtout pour vérifier que la question n’a pas déjà une réponse.',
    empty:
      'Rien n’a encore été publié. Le fil est vide plutôt que rempli d’exemples : les recommandations viennent de vrais clients, et la première le sera aussi.',
    browseBoards: 'Voir les forums',
    createToPost: 'Créez un compte pour publier',
    openFull: 'Ouvrir la communauté complète',
    writeComment: 'Écrivez un commentaire…',
    reply: 'Répondre',
    comment: 'Commenter',
    reactions: { like: 'J’aime', love: 'J’adore', surprised: 'Surpris' },
  },

  auth: {
    signInTitle: 'Se connecter',
    email: 'Adresse e-mail',
    password: 'Mot de passe',
    fullName: 'Votre nom complet',
    fullNameHint: 'Tel qu’il figure sur votre pièce d’identité, pour qu’un vérificateur puisse le comparer.',
    phone: 'Numéro de téléphone',
    phoneHint: 'Comment l’autre partie d’un dossier vous joint, et comment une réponse vous est signalée.',
    accountType: 'Comment utiliserez-vous Dubai Legal ?',
    accountTypeHint:
      'Cela détermine ce que vous devez fournir pour être vérifié et ne peut pas être modifié ensuite. Vos informations d’identité et vos documents sont demandés dans l’onglet de vérification, où un vérificateur les lit.',
    createAccountTitle: 'Créez votre compte',
    haveAccount: 'Vous avez déjà un compte ?',
    noAccount: 'Nouveau sur Dubai Legal ?',
    forgotPassword: 'Mot de passe oublié ?',
  },

  common: {
    save: 'Enregistrer',
    cancel: 'Annuler',
    delete: 'Supprimer',
    back: 'Retour',
    loading: 'Chargement…',
    readMore: 'En savoir plus',
    comingSoon: 'En cours de développement',
  },

  footer: {
    disclaimer:
      'Dubai Legal n’est pas un cabinet d’avocats et ne fournit pas de conseil juridique. Les informations de l’annuaire sont fournies par ses membres. Vérifiez toujours qu’un professionnel est inscrit avant de le mandater.',
  },
};
