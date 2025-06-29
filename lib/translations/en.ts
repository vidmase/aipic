export const en = {
  // Navigation & Header
  header: {
    title: "AI IMAGE STUDIO",
    signIn: "Sign In →"
  },

  // Landing Page
  landing: {
    title: {
      create: "Create",
      stunningAI: "Stunning AI",
      images: "Images"
    },
    subtitle: "Transform your imagination into reality with our minimalist AI image generation platform.",
    cta: "START CREATING",
    features: {
      ideogram: {
        title: "Ideogram v3",
        description: "Create hyper-realistic images with unparalleled detail and artistic charm"
      },
      imagen: {
        title: "Imagen 4", 
        description: "Google's latest AI engine for photorealistic masterpieces"
      },
      flux: {
        title: "Flux Pro Ultra",
        description: "Next-generation model for stunning artistic styles and perfect compositions"
      },
      more: {
        title: "More Inside",
        description: "Explore our complete collection of premium AI models and advanced features"
      }
    },
    footer: "© {year} AI IMAGE STUDIO, created by Vdma",
    featuresTitle: "Powered by Leading AI Models",
    featuresSubtitle: "Choose from the world's most advanced AI image generation models",
    mobileReady: "Ready to create stunning AI images?",
    getStarted: "Get Started",
    viewGallery: "View Gallery"
  },

  // Authentication
  auth: {
    signIn: {
      title: "Sign In",
      welcomeBack: "Welcome Back",
      subtitle: "Sign in to your AI Image Studio account",
      emailPlaceholder: "Enter your email",
      passwordPlaceholder: "Enter your password",
      submitButton: "Sign In",
      submitButtonLoading: "Signing in...",
      noAccount: "Don't have an account?",
      signUpLink: "Sign up",
      successMessage: "Signed in successfully!"
    },
    signUp: {
      title: "Sign Up",
      welcomeTitle: "Create Your Account",
      subtitle: "Join AI Image Studio and start creating",
      fullNamePlaceholder: "Enter your full name",
      emailPlaceholder: "Enter your email",
      passwordPlaceholder: "Create a password",
      confirmPasswordPlaceholder: "Confirm your password",
      submitButton: "Create Account",
      submitButtonLoading: "Creating Account...",
      hasAccount: "Already have an account?",
      signInLink: "Sign in",
      successMessage: "Account created successfully! Please check your email to verify your account."
    }
  },

  // Dashboard
  dashboard: {
    tabs: {
      generate: "Generate",
      history: "History",
      gallery: "Gallery",
      albums: "Albums",
      profile: "Profile",
      admin: "Admin"
    },
    actions: {
      createImage: "Create Image",
      viewGallery: "View Gallery",
      albums: "Albums",
      logOut: "Log Out"
    },
    generate: {
      title: "Generate AI Image",
      description: "Describe your vision and let AI bring it to life",
      prompt: "Prompt",
      smartBuilder: "Smart Builder",
      promptPlaceholder: "Describe the image you want to generate...",
      enhance: "Enhance",
      currentModel: "Current Model",
      active: "ACTIVE",
      chooseModel: "Choose Different Model",
      loadingModel: "Loading current model...",
      aspectRatio: "Aspect Ratio",
      squareIcon: "Square (1:1)",
      squareHdIcon: "Square HD (1:1)",
      portraitSmallIcon: "Portrait 3:4",
      portraitLargeIcon: "Portrait 9:16",
      landscapeSmallIcon: "Landscape 4:3",
      landscapeLargeIcon: "Landscape 16:9",
      customIcon: "Custom",
      generateButton: "Generate Image",
      generatingButton: "Generating...",
      editButton: "Edit Image",
      editingButton: "Editing...",
      latestCreation: "Latest Creation",
      showPrompt: "Show Prompt",
      promptTitle: "Image Prompt",
      promptDescription: "View and copy the prompt used to generate this image.",
      copyPrompt: "Copy Prompt",
      copied: "Copied!",
      copiedDescription: "Prompt copied to clipboard",
      close: "Close",
      // Form fields for fal-ai/fast-sdxl
      imageSize: "Image Size",
      numImages: "Number of Images",
      guidanceScale: "Guidance Scale (CFG)",
      inferenceSteps: "Inference Steps",
      expandPrompt: "Expand Prompt",
      enableSafetyChecker: "Enable Safety Checker",
      negativePrompt: "Negative Prompt",
      format: "Format",
      seed: "Seed (optional)",
      // Form fields for Ideogram
      style: "Style",
      renderingSpeed: "Rendering Speed",
      styleCodes: "Style Codes (comma separated, optional)",
      styleCodesPlaceholder: "e.g. 1a2b3c4d,5e6f7a8b",
      styleCodesHelper: "Overrides Style if provided. 8-char hex codes, comma separated.",
      colorPalette: "Color Palette (optional)",
      customPaletteLabel: "Custom (enter hex codes below)",
      customPaletteHelper: "#ff0000,#00ff00,#0000ff",
      seedPlaceholder: "Random",
      negativePromptPlaceholder: "What to avoid...",
      // Size options
      squareHd: "Square HD",
      square: "Square",
      portrait43: "Portrait 4:3",
      portrait169: "Portrait 16:9",
      landscape43: "Landscape 4:3",
      landscape169: "Landscape 16:9",
      // Style options
      auto: "Auto",
      general: "General",
      realistic: "Realistic",
      design: "Design",
      // Rendering speed options
      turbo: "Turbo",
      balanced: "Balanced",
      quality: "Quality",
      // Color palette options
      none: "None",
      ember: "Ember",
      fresh: "Fresh",
      jungle: "Jungle",
      magic: "Magic",
      melon: "Melon",
      mosaic: "Mosaic",
      pastel: "Pastel",
      ultramarine: "Ultramarine",
      // Custom aspect ratio dialog
      customAspectTitle: "Custom Aspect Ratio",
      customAspectDescription: "Enter your desired width and height for the aspect ratio.",
      setAspectRatio: "Set Aspect Ratio",
      cancel: "Cancel",
      // Dialogs
      deleteImageTitle: "Delete Image",
      deleteImageDescription: "Are you sure you want to delete this image? This action cannot be undone.",
      delete: "Delete",
      download: "Download",
      share: "Share",
      // AI Models section
      aiModels: "AI Models",
      modelsCount: "{current}/{total} models",
      refreshing: "Refreshing...",
      refresh: "Refresh",
      unlockAll: "Unlock All ⭐",
      premiumModel: "🔒 Premium Model",
      upgradeToUnlock: "Upgrade to unlock {modelName}!",
      loadingModels: "Loading models...",
      missingModels: "Missing {count} models!",
      upgradeNow: "Upgrade Now 🚀",
      // SeedEdit model fields
      referenceImage: "Reference Image",
      urlMethod: "URL",
      uploadMethod: "Upload",
      imageUrl: "Image URL",
      imageUrlPlaceholder: "https://example.com/image.jpg",
      uploadImage: "Upload Image",
      selectedFile: "Selected file",
      readyForEditing: "Ready for editing",
      removeFile: "Remove file",
      guidanceScaleHelper: "Controls how closely the edit follows the prompt (0.0 = loose, 1.0 = strict)",
      // Inpainting
      paintMode: "Paint Mode",
      exitPaintMode: "Exit Paint",
      paintAreas: "Paint areas you want to replace, then describe the changes",
      paintingTools: "Painting Tools",
      brushSize: "Brush Size",
      clearMask: "Clear",
      applyInpainting: "Apply Inpainting",
      inpainting: "Inpainting...",
      inpaintSuccess: "Inpainting completed successfully and saved to Inpainted album",
      inpaintError: "Please paint areas to edit and provide a description",
      undoInpainting: "Undo Inpainting",
      undoSuccess: "Inpainting undone successfully",
    },
    history: {
      title: "Your Generated Images",
      noImages: "No images generated yet. Start creating your first AI image!",
      generateImage: "Generate Image"
    },
    gallery: {
      title: "Your Images",
      noImages: "No generated images yet",
      download: "Download",
      share: "Share",
      delete: "Delete",
      moveToAlbum: "Move to Album",
      showPrompt: "Show Prompt",
      copyPrompt: "Copy Prompt",
      copied: "Copied!",
      deleteConfirm: "Are you sure you want to delete this image?",
      deleteSuccess: "Image deleted successfully"
    },
    profile: {
      title: "Profile Settings",
      subtitle: "Manage your account settings",
      welcome: "Welcome, {name}",
      welcomeGeneric: "Welcome",
      creativeArtist: "Creative AI Artist",
      editAvatar: "Edit Avatar",
      imagesGenerated: "Images Generated",
      dailyUsage: "Daily Usage",
      remaining: "{count} remaining today",
      thisWeek: "+{count} this week",
      modelsUsed: "Models Used",
      favoriteModel: "Favorite Model",
      createdAt: "Member Since",
      accountType: "Account Type",
      exploreMore: "Explore more models",
      keepCreating: "Keep creating!",
      daysActive: "Days Active",
      enjoyUnlimited: "Enjoy unlimited generations!",
      premiumMember: "Premium member ✨",
      unlimited: "UNLIMITED"
    },
    quota: {
      daily: "Daily",
      used: "Used",
      remaining: "Remaining",
      limitReached: "Daily limit reached",
      limitDescription: "You've reached your daily generation limit. Try again tomorrow."
    },
    user: {
      profile: "Profile",
      admin: "Admin Dashboard",
      signOut: "Sign Out",
      tier: "Tier"
    }
  },

  // Common
  common: {
    loading: "Loading...",
    error: "Error",
    success: "Success",
    selectLanguage: "Select Language",
    cancel: "Cancel",
    confirm: "Confirm",
    close: "Close",
    save: "Save",
    edit: "Edit",
    delete: "Delete",
    back: "Back",
    next: "Next",
    previous: "Previous",
    search: "Search",
    filter: "Filter",
    clear: "Clear",
    refresh: "Refresh",
    copy: "Copy",
    share: "Share",
    download: "Download"
  },

  // Error Messages
  errors: {
    generic: "An unexpected error occurred",
    network: "Network error. Please check your connection.",
    authentication: "Authentication failed",
    permission: "Permission denied",
    notFound: "Not found",
    quotaExceeded: "Generation limit reached"
  }
}

export type EnglishMessages = typeof en 