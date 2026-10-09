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
    minutes: string;
    km: string;
    mm: string;
    scrollTop: string;
  };
  navbar: {
    subtitle: string;
    quick: string;
    installTooltip: string;
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
  astro: {
    title: string;
    subtitle: string;
    sunTitle: string;
    moonTitle: string;
    sunrise: string;
    sunset: string;
    daylight: string;
    untilSunset: string;
    untilSunrise: string;
    sunHours: string;
    moonrise: string;
    moonset: string;
    illumination: string;
    daytime: string;
    nighttime: string;
    goldenHour: string;
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
    openNewTabShort: string;
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
    tabShortcuts: string;
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

    // Shortcuts
    shortcutsTitle: string;
    shortcutsSubtitle: string;
    shortcutSlash: string;
    shortcutSlashDesc: string;
    shortcutT: string;
    shortcutTDesc: string;
    shortcutL: string;
    shortcutLDesc: string;
    shortcutF: string;
    shortcutFDesc: string;
    shortcutR: string;
    shortcutRDesc: string;
    shortcutC: string;
    shortcutCDesc: string;
    shortcutQuestion: string;
    shortcutQuestionDesc: string;
    shortcutEsc: string;
    shortcutEscDesc: string;
    shortcutsProTip: string;

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
  compare: {
    title: string;
    subtitle: string;
    buttonTooltip: string;
    compareWithThis: string;
    city1Badge: string;
    city2Badge: string;
    searchPlaceholder: string;
    searchBtn: string;
    quickPick: string;
    sameTemp: string;
    warmerThan: string;
    colderThan: string;
    tempDifference: string;
    feelsLikeDifference: string;
    windDifference: string;
    humidityDifference: string;
    pressureDifference: string;
    precipDifference: string;
    calmerWind: string;
    strongerWind: string;
    moreRain: string;
    lessRain: string;
    swapBtn: string;
    makePrimary: string;
    loading: string;
    error: string;
    noComparisonData: string;
  };
  share: {
    buttonTooltip: string;
    copied: string;
    downloadPngTooltip: string;
    pngDownloaded: string;
    shareTitle: string;
    weatherIn: string;
    feelsLike: string;
    wind: string;
    humidity: string;
    rainChance: string;
    summaryFooter: string;
  };
  searchChips: {
    recent: string;
    popular: string;
    clearRecent: string;
    noMatches: string;
    pressEnter: string;
  };
  offline: {
    badge: string;
    cachedDataTooltip: string;
    offlineBanner: string;
    reconnected: string;
    dataFrom: string;
  };
}

export type RecursivePartial<T> = {
  [P in keyof T]?: T[P] extends (infer U)[]
    ? RecursivePartial<U>[]
    : T[P] extends object | undefined
      ? RecursivePartial<T[P]>
      : T[P];
};
