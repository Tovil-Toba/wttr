export interface TranslationDictionary {
  common: {
    searchPlaceholder: string;
    searchBtn: string;
    locateMe: string;
    retry: string;
    errorTitle: string;
    close: string;
    copy: string;
    copied: string;
    updated: string;
    hours: string;
    km: string;
    mm: string;
  };
  navbar: {
    subtitle: string;
    quick: string;
    settingsTooltip: string;
    themeLightTooltip: string;
    themeDarkTooltip: string;
    langTooltip: string;
    langHeader: string;
    tempLabel: string;
    windLabel: string;
    pressureLabel: string;
    unitMs: string;
    unitKmh: string;
    unitMph: string;
    unitMmHg: string;
    unitHpa: string;
  };
  hero: {
    feelsLike: string;
    max: string;
    min: string;
    humidity: string;
    wind: string;
    pressure: string;
    uvIndex: string;
    cloudcover: string;
    precipitation: string;
    visibility: string;
    addFavorite: string;
    removeFavorite: string;
    uvLow: string;
    uvModerate: string;
    uvHigh: string;
    uvVeryHigh: string;
    uvExtreme: string;
  };
  hourly: {
    title: string;
    subtitle: string;
    feelsLikeShort: string;
    rain: string;
    scrollLeft: string;
    scrollRight: string;
    cardsView: string;
    chartView: string;
    precipitationChance: string;
    temperature: string;
    chartHint: string;
  };
  comfort: {
    title: string;
    subtitle: string;
    uvTitle: string;
    uvAdviceLow: string;
    uvAdviceModerate: string;
    uvAdviceHigh: string;
    uvAdviceVeryHigh: string;
    uvAdviceExtreme: string;
    windTitle: string;
    gustsLabel: string;
    calm: string;
    lightBreeze: string;
    moderateWind: string;
    gustyWind: string;
    stormWind: string;
    precipTitle: string;
    rainChance: string;
    snowChance: string;
    thunderChance: string;
    noPrecip: string;
    airTitle: string;
    dewPoint: string;
    humidity: string;
    dryAir: string;
    comfortableAir: string;
    humidAir: string;
    muggyAir: string;
    snowCover: string;
    noSnow: string;
    visibilityGood: string;
    fogRisk: string;
  };
  daily: {
    title: string;
    subtitle: string;
    sun: string;
    sunHours: string;
    today: string;
    tomorrow: string;
    afterTomorrow: string;
  };
  moon: {
    newMoon: string;
    waxingCrescent: string;
    firstQuarter: string;
    waxingGibbous: string;
    fullMoon: string;
    waningGibbous: string;
    lastQuarter: string;
    waningCrescent: string;
  };
  features: {
    title: string;
    subtitle: string;
    tabWeb: string;
    tabTerminal: string;
    tabPng: string;
    tabOneline: string;

    // Shared actions & buttons
    refreshBtn: string;
    refreshTitle: string;
    copyLink: string;
    copyCommand: string;
    openNewTab: string;
    loading: string;

    // Tab 1: Web
    webReportTitle: string;
    webInteractiveFrame: string;
    webLoaderTitle: string;
    webIframeTitle: string;

    // Tab 2: Terminal
    terminalHeader: string;
    terminalLoaderTitle: string;
    terminalLoaderStatus: string;
    terminalRefreshTitle: string;

    // Tab 3: PNG
    pngTransparent: string;
    pngBorder: string;
    pngCurrentOnly: string;
    pngDownload: string;
    pngLoaderTitle: string;
    pngLoaderStatus: string;
    pngEmbedCode: string;

    // Tab 4: One-line
    onelineSelectFormat: string;
    onelineFormat: string;
    onelinePreviewTitle: string;
    onelinePreviewFor: string;
    onelineTmux: string;
    onelinePowerShell: string;

    // Loading statuses
    statusConnecting: string;
    statusGenerating: string;
    statusProcessing: string;
    statusDelay: string;
  };
  favorites: {
    title: string;
    empty: string;
    recentTitle: string;
    deleteTooltip: string;
  };
  cheatsheet: {
    title: string;
    subtitle: string;
    cityDesc: string;
    airportDesc: string;
    moonDesc: string;
    mirrorDesc: string;
  };
  footer: {
    dataProvidedBy: string;
    help: string;
    about: string;
  };
  modals: {
    aboutTitle: string;
    aboutSubtitle: string;
    instructionsTitle: string;
    instructionsSubtitle: string;
  };
  instructions: {
    tabSearch: string;
    tabSettings: string;
    tabFeatures: string;
    tabCurl: string;

    // Search
    searchTitle: string;
    searchSubtitle: string;
    cityTitle: string;
    cityDesc: string;
    airportTitle: string;
    airportDesc: string;
    airportSheremetyevo: string;
    airportDomodedovo: string;
    coordsTitle: string;
    coordsDesc: string;
    sightTitle: string;
    sightDesc: string;
    sightRedSquare: string;
    autoLocationTitle: string;
    autoLocationDesc: string;

    // Settings
    settingsTitle: string;
    settingsSubtitle: string;
    tempTitle: string;
    tempDesc: string;
    windTitle: string;
    windDesc: string;
    pressureTitle: string;
    pressureDesc: string;
    favoritesTitle: string;
    favoritesDesc: string;
    themeTitle: string;
    themeDesc: string;
    langTitle: string;
    langDesc: string;

    // Features
    featuresTitle: string;
    featuresSubtitle: string;
    webTitle: string;
    webDesc: string;
    terminalTitle: string;
    terminalDesc: string;
    pngTitle: string;
    pngDesc: string;
    onelineTitle: string;
    onelineDesc: string;

    // Curl
    curlTitle: string;
    curlSubtitle: string;
    cmd1Desc: string;
    cmd2Desc: string;
    cmd3Desc: string;
    cmd4Desc: string;
    cmd5Desc: string;

    // Footer
    escHint: string;
  };
  about: {
    aiBannerTitle: string;
    aiBannerP1: string;
    aiBannerP2: string;

    // Tech Stack
    techStackTitle: string;
    techStackSubtitle: string;
    techAngularDesc: string;
    techPrimengDesc: string;
    techTailwindDesc: string;
    techSassDesc: string;
    techVitestDesc: string;
    techApiDesc: string;
    techI18nDesc: string;
    techTsDesc: string;

    // Authorship
    authorLabel: string;
    authorName: string;
    sourceLabel: string;
    sourceAuthor: string;
  };
}

export type RecursivePartial<T> = {
  [P in keyof T]?: T[P] extends (infer U)[]
    ? RecursivePartial<U>[]
    : T[P] extends object | undefined
      ? RecursivePartial<T[P]>
      : T[P];
};
