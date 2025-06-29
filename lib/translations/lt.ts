import type { EnglishMessages } from './en'

export const lt: EnglishMessages = {
  // Navigation & Header
  header: {
    title: "AI VAIZDŲ STUDIJA",
    signIn: "Prisijungti →"
  },

  // Landing Page
  landing: {
    title: {
      create: "Kurkite",
      stunningAI: "Nuostabius AI",
      images: "Vaizdus"
    },
    subtitle: "Paversti savo vaizduotę realybe su mūsų minimalistine AI vaizdų generavimo platforma.",
    cta: "PRADĖTI KURTI",
    features: {
      ideogram: {
        title: "Ideogram v3",
        description: "Kurkite hiper-realistiškus vaizdus su neprilygstamu detalumu ir meniniu žavesiu"
      },
      imagen: {
        title: "Imagen 4", 
        description: "Google naujausias AI variklis fotorealistiškiems šedevrams"
      },
      flux: {
        title: "Flux Pro Ultra",
        description: "Naujos kartos modelis nuostabiems meniniai stiliams ir tobuloms kompozicijoms"
      },
      more: {
        title: "Daugiau Galimybių",
        description: "Tyrinėkite mūsų pilną premium AI modelių ir išplėstinių funkcijų kolekciją"
      }
    },
    footer: "© {year} AI VAIZDŲ STUDIJA, sukūrė Vdma",
    featuresTitle: "Geriausių AI Modelių Galia",
    featuresSubtitle: "Rinkitės iš pažangiausių pasaulio dirbtinio intelekto vaizdų generavimo modelių",
    mobileReady: "Pasiruošę kurti nuostabius AI vaizdus?",
    getStarted: "Pradėti",
    viewGallery: "Žiūrėti Galeriją"
  },

  // Authentication
  auth: {
    signIn: {
      title: "Prisijungti",
      welcomeBack: "Sveiki Sugrįžę",
      subtitle: "Prisijunkite prie savo AI Vaizdų Studijos paskyros",
      emailPlaceholder: "Įveskite savo el. paštą",
      passwordPlaceholder: "Įveskite savo slaptažodį",
      submitButton: "Prisijungti",
      submitButtonLoading: "Prisijungiama...",
      noAccount: "Neturite paskyros?",
      signUpLink: "Registruotis",
      successMessage: "Sėkmingai prisijungėte!"
    },
    signUp: {
      title: "Registruotis",
      welcomeTitle: "Sukurkite Savo Paskyrą",
      subtitle: "Prisijunkite prie AI Vaizdų Studijos ir pradėkite kurti",
      fullNamePlaceholder: "Įveskite savo vardą ir pavardę",
      emailPlaceholder: "Įveskite savo el. paštą",
      passwordPlaceholder: "Sukurkite slaptažodį",
      confirmPasswordPlaceholder: "Patvirtinkite slaptažodį",
      submitButton: "Sukurti Paskyrą",
      submitButtonLoading: "Kuriama Paskyra...",
      hasAccount: "Jau turite paskyrą?",
      signInLink: "Prisijungti",
      successMessage: "Paskyra sėkmingai sukurta! Patikrinkite savo el. paštą patvirtinimo nuorodai."
    }
  },

  // Dashboard
  dashboard: {
    tabs: {
      generate: "Generuoti",
      history: "Istorija",
      gallery: "Galerija",
      albums: "Albumai",
      profile: "Profilis",
      admin: "Administratorius"
    },
    actions: {
      createImage: "Kurti Vaizdą",
      viewGallery: "Žiūrėti Galeriją",
      albums: "Albumai",
      logOut: "Atsijungti"
    },
    generate: {
      title: "Kurti AI Vaizdus",
      description: "Apibūdinkite savo viziją ir leiskite AI ją atkurti",
      prompt: "Aprašymas",
      smartBuilder: "Išmanusis Kūrėjas",
      promptPlaceholder: "Apibūdinkite vaizdą, kurį norite sugeneruoti...",
      enhance: "Pagerinti",
      currentModel: "Dabartinis Modelis",
      active: "AKTYVUS",
      chooseModel: "Pasirinkti Kitą Modelį",
      loadingModel: "Kraunamas dabartinis modelis...",
      aspectRatio: "Formato Santykis",
      squareIcon: "Kvadratas (1:1)",
      squareHdIcon: "Kvadratas HD (1:1)",
      portraitSmallIcon: "Portretas 3:4",
      portraitLargeIcon: "Portretas 9:16",
      landscapeSmallIcon: "Kraštovaizdis 4:3",
      landscapeLargeIcon: "Kraštovaizdis 16:9",
      customIcon: "Pasirinktinis",
      generateButton: "Kurti Vaizdą",
      generatingButton: "Kuriama...",
      editButton: "Redaguoti Vaizdą",
      editingButton: "Redaguojama...",
      latestCreation: "Naujausias Kūrinys",
      showPrompt: "Rodyti Aprašymą",
      promptTitle: "Vaizdo Aprašymas",
      promptDescription: "Peržiūrėkite ir nukopijuokite aprašymą, naudotą šiam vaizdui generuoti.",
      copyPrompt: "Kopijuoti Aprašymą",
      copied: "Nukopijuota!",
      copiedDescription: "Aprašymas nukopijuotas į iškarpinę",
      close: "Uždaryti",
      // Form fields for fal-ai/fast-sdxl
      imageSize: "Vaizdo Dydis",
      numImages: "Vaizdų Skaičius",
      guidanceScale: "Vadovavimo Skalė (CFG)",
      inferenceSteps: "Išvados Žingsniai",
      expandPrompt: "Išplėsti Aprašymą",
      enableSafetyChecker: "Įjungti Saugumo Tikrinimą",
      negativePrompt: "Neigiamas Aprašymas",
      format: "Formatas",
      seed: "Sėkla (neprivaloma)",
      // Form fields for Ideogram
      style: "Stilius",
      renderingSpeed: "Atvaizdavimo Greitis",
      styleCodes: "Stiliaus Kodai (atskirti kableliais, neprivaloma)",
      styleCodesPlaceholder: "pvz. 1a2b3c4d,5e6f7a8b",
      styleCodesHelper: "Perrašo stilių, jei pateikta. 8 simbolių hex kodai, atskirti kableliais.",
      colorPalette: "Spalvų Paletė (neprivaloma)",
      customPaletteLabel: "Pasirinktinė (įveskite hex kodus žemiau)",
      customPaletteHelper: "#ff0000,#00ff00,#0000ff",
      seedPlaceholder: "Atsitiktinė",
      negativePromptPlaceholder: "Ko vengti...",
      // Size options
      squareHd: "Kvadratas HD",
      square: "Kvadratas",
      portrait43: "Portretas 4:3",
      portrait169: "Portretas 16:9",
      landscape43: "Kraštovaizdis 4:3",
      landscape169: "Kraštovaizdis 16:9",
      // Style options
      auto: "Automatinis",
      general: "Bendras",
      realistic: "Realistinis",
      design: "Dizainas",
      // Rendering speed options
      turbo: "Turbinas",
      balanced: "Subalansuotas",
      quality: "Kokybė",
      // Color palette options
      none: "Nėra",
      ember: "Žarija",
      fresh: "Šviežias",
      jungle: "Džiunglės",
      magic: "Magija",
      melon: "Melionas",
      mosaic: "Mozaika",
      pastel: "Pastelė",
      ultramarine: "Ultramarinas",
      // Custom aspect ratio dialog
      customAspectTitle: "Pasirinktinis Formato Santykis",
      customAspectDescription: "Įveskite norimą plotį ir aukštį formato santykiui.",
      setAspectRatio: "Nustatyti Formato Santykį",
      cancel: "Atšaukti",
      // Dialogs
      deleteImageTitle: "Ištrinti Vaizdą",
      deleteImageDescription: "Ar tikrai norite ištrinti šį vaizdą? Šio veiksmo negalima atšaukti.",
      delete: "Ištrinti",
      download: "Atsisiųsti",
      share: "Dalintis",
      // AI Models section
      aiModels: "AI Modeliai",
      modelsCount: "{current}/{total} modeliai",
      refreshing: "Atnaujinama...",
      refresh: "Atnaujinti",
      unlockAll: "Atrakinti Visus ⭐",
      premiumModel: "🔒 Premium Modelis",
      upgradeToUnlock: "Pagerinkite planą, kad atrakintumėte {modelName}!",
      loadingModels: "Kraunami modeliai...",
      missingModels: "Trūksta {count} modelių!",
      upgradeNow: "Atnaujinti Dabar 🚀",
      // SeedEdit model fields
      referenceImage: "Atskaitos Vaizdas",
      urlMethod: "URL",
      uploadMethod: "Įkelti",
      imageUrl: "Vaizdo URL",
      imageUrlPlaceholder: "https://example.com/image.jpg",
      uploadImage: "Įkelti Vaizdą",
      selectedFile: "Pasirinktas failas",
      readyForEditing: "Paruoštas redagavimui",
      removeFile: "Pašalinti failą",
      guidanceScaleHelper: "Kontroliuoja, kaip tiksliai redagavimas seka aprašymą (0.0 = laisvas, 1.0 = griežtas)",
      // Inpainting
      paintMode: "Piešimo Režimas",
      exitPaintMode: "Išeiti iš Piešimo",
      paintAreas: "Nuspalvinkite sritis, kurias norite pakeisti, tada aprašykite pakeitimus",
      paintingTools: "Piešimo Įrankiai",
      brushSize: "Teptukas",
      clearMask: "Išvalyti",
      applyInpainting: "Taikyti Inpainting",
      inpainting: "Taikomas Inpainting...",
      inpaintSuccess: "Inpainting sėkmingai užbaigtas ir išsaugotas į Inpainted albumą",
      inpaintError: "Prašome nuspalvinti sritis redagavimui ir pateikti aprašymą",
      undoInpainting: "Atšaukti Inpaint",
      undoSuccess: "Inpaint sėkmingai atšaukta",
    },
    history: {
      title: "Jūsų Sugeneruoti Vaizdai",
      noImages: "Dar nėra sugeneruotų vaizdų. Pradėkite kurti savo pirmą AI vaizdą!",
      generateImage: "Generuoti Vaizdą"
    },
    gallery: {
      title: "Jūsų Vaizdai",
      noImages: "Dar nėra sugeneruotų vaizdų",
      download: "Atsisiųsti",
      share: "Dalintis",
      delete: "Ištrinti",
      moveToAlbum: "Perkelti į Albumą",
      showPrompt: "Rodyti Aprašymą",
      copyPrompt: "Kopijuoti Aprašymą",
      copied: "Nukopijuota!",
      deleteConfirm: "Ar tikrai norite ištrinti šį vaizdą?",
      deleteSuccess: "Vaizdas sėkmingai ištrintas"
    },
    profile: {
      title: "Profilio Nustatymai",
      subtitle: "Tvarkykite savo paskyros nustatymus",
      welcome: "Sveiki, {name}",
      welcomeGeneric: "Sveiki",
      creativeArtist: "Kūrybingas AI Menininkas",
      editAvatar: "Redaguoti Avatarą",
      imagesGenerated: "Sugeneruoti Vaizdai",
      dailyUsage: "Dieninis Naudojimas",
      remaining: "liko {count} šiandien",
      thisWeek: "+{count} šią savaitę",
      modelsUsed: "Naudoti Modeliai",
      favoriteModel: "Mėgstamiausias Modelis",
      createdAt: "Narys Nuo",
      accountType: "Paskyros Tipas",
      exploreMore: "Tyrinėti daugiau modelių",
      keepCreating: "Tęskite kūrimą!",
      daysActive: "Aktyvių Dienų",
      enjoyUnlimited: "Mėgaukitės neribotais generavimais!",
      premiumMember: "Premium narys ✨",
      unlimited: "NERIBOTA"
    },
    quota: {
      daily: "Dieninis",
      used: "Panaudota",
      remaining: "Liko",
      limitReached: "Dieninis limitas pasiektas",
      limitDescription: "Pasiekėte dieninį generavimo limitą. Bandykite dar kartą rytoj."
    },
    user: {
      profile: "Profilis",
      admin: "Administratoriaus Skydelis",
      signOut: "Atsijungti",
      tier: "Lygis"
    }
  },

  // Common
  common: {
    loading: "Kraunama...",
    error: "Klaida",
    success: "Sėkmė",
    selectLanguage: "Pasirinkti Kalbą",
    cancel: "Atšaukti",
    confirm: "Patvirtinti",
    close: "Uždaryti",
    save: "Išsaugoti",
    edit: "Redaguoti",
    delete: "Ištrinti",
    back: "Atgal",
    next: "Toliau",
    previous: "Ankstesnis",
    search: "Ieškoti",
    filter: "Filtruoti",
    clear: "Išvalyti",
    refresh: "Atnaujinti",
    copy: "Kopijuoti",
    share: "Dalintis",
    download: "Atsisiųsti"
  },

  // Error Messages
  errors: {
    generic: "Įvyko netikėta klaida",
    network: "Tinklo klaida. Patikrinkite savo interneto ryšį.",
    authentication: "Autentifikacijos klaida",
    permission: "Prieiga uždrausta",
    notFound: "Nerasta",
    quotaExceeded: "Generavimo limitas pasiektas"
  }
} 