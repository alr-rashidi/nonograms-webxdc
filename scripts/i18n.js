/**
 * nonograms - Internationalization (i18n)
 * Supports English (en) and Persian (fa) with RTL
 */

const I18N_DATA = {
  en: {
    appTitle: "nonograms",
    tagline: "Logic Pixel Art Puzzles",
    play: "Play",
    levels: "Levels & Puzzles",
    levelsSubtitle: "A rich collection of logic puzzles in various grid sizes",
    dailyChallenge: "Daily Challenge",
    dailySubtitle: "A fresh unique logic challenge every day for your brain!",
    howToPlay: "How to Play",
    howToPlaySubtitle: "Rules, logic & interactive sample",
    settings: "Settings",
    settingsSubtitle: "Themes, sounds & controls",
    continueGame: "Continue",
    newGame: "New Game",
    category: "Category",
    allPuzzles: "All Puzzles",
    catAll: "All",
    catSmall: "Small (≤15)",
    catMedium: "Medium (16-25)",
    catLarge: "Large (26+)",
    catColor: "Multi-Color",
    catAdult: "18+ Adult",
    catCompleted: "Completed",
    adultFilterTitle: "Content Rating",
    adultFilterAll: "All Content (Safe & 18+)",
    adultFilterSafe: "Family Friendly (Safe)",
    adultFilterAdult: "18+ Adult Only",
    colorFilterAll: "All Colors",
    colorFilterMono: "Monochrome",
    colorFilterMulti: "Multi-Color",
    statusFilterTitle: "Status:",
    statusFilterAll: "All Statuses",
    statusFilterUnsolved: "Unsolved Only",
    statusFilterCompleted: "Solved Only",
    pageSizeLabel: "Per page:",
    pageSizeAll: "All (Single List)",
    quickSizeAll: "All Sizes",
    prevPuzzleInGame: "Previous Puzzle",
    nextPuzzleInGame: "Next Puzzle",
    confirmReset: "Are you sure you want to reset the puzzle?",
    resetConfirmSubtitle: "All cells on the board will be cleared.",
    randomTitle: "Random Puzzle",
    showResultPreview: "Solution Preview",
    showResultPreviewDesc: "Show revealed pixel art on puzzle preview cards",
    previewShowResult: "Preview: Visible",
    previewMystery: "Preview: Mystery",
    adultBadge: "18+",
    searchPuzzlesPlaceholder: "Search puzzles by name or size...",
    colorCount: "Colors",
    dimensions: "Dimensions",
    puzzlesCount: "Puzzles",
    monochrome: "Monochrome",
    multiColor: "Multi-Color",
    activeColor: "Active Color",
    sharedPuzzles: "Shared Puzzles",
    easy: "Easy (≤15)",
    medium: "Medium (16-25)",
    hard: "Hard (26+)",
    master: "Master (20×20)",
    completed: "Completed",
    bestTime: "Best Time",
    time: "Time",
    mistakes: "Mistakes",
    hints: "Hints",
    reset: "Reset",
    pause: "Pause",
    gamePaused: "Game Paused",
    resume: "Resume",
    restart: "Restart",
    confirmResetAction: "Yes, Reset",
    cancelReset: "No, Continue",
    giveUp: "Surrender & Show Solution",
    confirmSurrender: "Are you sure you want to surrender?",
    surrenderConfirmSubtitle: "The complete solution will be revealed and current game will end.",
    confirmSurrenderAction: "Yes, Surrender & Show Solution",
    cancelSurrender: "No, Continue",
    surrendered: "Surrendered",
    myAnswers: "My Answers",
    correctSolution: "Correct Solution",
    backToMenu: "Menu",
    backToHome: "Back to Home",
    backToGame: "Back to Game",
    backToSelectPuzzle: "Exit Puzzle",
    selectLevel: "Select Puzzle",
    all: "All",
    modeFill: "Fill",
    modeCross: "Cross",
    modeMark: "Mark",
    modePan: "Pan",
    dragHint: "Tap or drag across cells. Right-click for cross. Middle-click or drag to clear.",
    victoryTitle: "Puzzle Solved!",
    victorySubtitle: "Brilliant deduction! You revealed the hidden pixel art.",
    victorySurrenderedTitle: "Puzzle Solution Revealed",
    nextLevel: "Next Puzzle",
    nextPuzzle: "Next Puzzle",
    playAgain: "Play Again",
    shareSolution: "Share Victory",
    gameOverTitle: "Game Over",
    gameOverSubtitle: "You reached the maximum mistakes allowed.",
    tryAgain: "Try Again",
    continueZen: "Continue in Zen Mode",
    zenModeHint: "Tip: Switch to Zen Mode in Settings for unlimited tries.",

    // Loading Puzzles
    loadingPuzzles: "Loading Puzzles...",
    openingPuzzlesGz: "Opening puzzles.gz...",
    extractingPuzzlesGz: "Decompressing & parsing puzzles...",
    puzzlesLoaded: "Puzzles ready!",
    
    // Tutorial
    tutorialTitle: "How to Play Nonograms",
    tutStep1Title: "1. The Goal",
    tutStep1Desc: "Reveal the hidden pixel picture by filling in the correct squares according to the number clues on the top and left of the grid.",
    tutStep2Title: "2. Clue Numbers",
    tutStep2Desc: "Numbers indicate consecutive filled blocks in that row or column. For example, '3 1' means a group of 3 filled cells, followed by at least 1 empty cell, and then 1 filled cell.",
    tutStep3Title: "3. Use X to Mark Empties",
    tutStep3Desc: "When you are certain a cell must be empty, mark it with an 'X'. This eliminates guesswork and helps you complete surrounding lines!",
    tutStep4Title: "4. Middle-Click & Drag to Clear",
    tutStep4Desc: "Left-click fills or drags, Right-click marks 'X', and Middle-click (or Middle-click drag) resets cells back to empty.",
    sampleTutorialTitle: "Interactive Solved Sample",
    sampleTutorialDesc: "Try tapping or clicking the cells below to experiment with filling and crossing! Notice how the top and side numbers align with each row and column.",
    controlsGuideTitle: "Controls Guide (Mouse, Keyboard & Touch)",
    controlsMouseTitle: "Mouse Controls (Desktop)",
    ctrlMouse1: "Left-Click & Drag: Quickly fill or unfill cells along any row or column",
    ctrlMouse2: "Right-Click & Drag: Place or remove 'X' markers on empty cells",
    ctrlMouse3: "Middle-Click Drag or Ctrl + Drag: Move and pan around the board seamlessly",
    controlsKeyboardTitle: "Keyboard Shortcuts (Desktop)",
    ctrlKey1: "Arrow Keys or WASD: Move cursor smoothly across the grid",
    ctrlKey2: "Space / Enter: Fill cell, X / C: Mark Cross, Q: Question Mark, Delete / Backspace: Clear cell",
    ctrlKey3: "Keys 1 to 5: Select colors, + / - / 0: Zoom in / Zoom out / Zoom reset, Z / Y: Undo & Redo",
    controlsTouchTitle: "Touch Controls (Phone & Tablet)",
    ctrlTouch1: "Tap / Drag: Apply the current active tool across cells seamlessly",
    ctrlTouch2: "Hold (300ms): Quickly toggle 'X' on a cell without switching tools",
    ctrlTouch3: "Bottom Toolbar: Tap tool buttons to switch tools, or tap active tool again to toggle Pan/Move mode",
    startPractice: "Start Solving Puzzles",
    
    // Settings
    settingsTitle: "Game Settings",
    language: "Language",
    languageDesc: "Change interface language",
    langAuto: "Auto (System)",
    theme: "Visual Theme",
    themeDesc: "Choose color appearance",
    themeAuto: "Auto (System)",
    themeDark: "Dark",
    themeLight: "Light",
    pixelFont: "Pixel Font",
    pixelFontDesc: "Use retro pixel typography (RooyinFree)",
    soundFX: "Sound Effects",
    soundFXDesc: "Audio feedback on cell actions & victory",
    vibration: "Haptic Feedback",
    vibrationDesc: "Gentle device vibration on mobile touches",
    gameplayRules: "Gameplay Options",
    gameMode: "Mistake Limit",
    gameModeDesc: "Number of lives per attempt",
    mode3Hearts: "3 Hearts (Standard)",
    modeZen: "Zen Mode (Infinite)",
    autoCrossNumbers: "Auto-Cross Numbers",
    autoCrossNumbersDesc: "Automatically cross out clue numbers when completed",
    autoFillCrosses: "Auto-Fill 'X' on Completed Lines",
    autoFillCrossesDesc: "Automatically place 'X' in remaining empty cells of a finished line",
    highlightCrosshairs: "Highlight Row & Column",
    highlightCrosshairsDesc: "Highlight active row and column crosshair on hover",
    showTimer: "Show Timer",
    showTimerDesc: "Display elapsed time in game header",
    webxdcBroadcast: "Share Solved Puzzles",
    webxdcBroadcastDesc: "Broadcast an update to chat when you solve a puzzle",
    saveSettings: "Close",

    // Random generator
    randomGenerator: "Random Puzzle Generator",
    gridSize: "Grid Size",
    difficulty: "Difficulty",
    diffEasy: "Easy (Clean Patterns)",
    diffMedium: "Medium (Balanced)",
    diffHard: "Hard (Complex)",
    startRandom: "Start Random Puzzle",
    progressiveModeTitle: "Progressive Growth Mode",
    progressiveModeDesc: "When enabled, each solved puzzle automatically increases grid size by +1 (5×5 → 6×6 → 7×7...)",

    // Daily & Sharing
    dailyTitle: "Daily Challenge",
    dailySubtitle: "A fresh unique logic challenge every day for your brain!",
    copiedToClipboard: "Share summary copied to clipboard!",
    noPuzzlesInCategory: "No puzzles found in this category.",
    pagePrev: "Previous",
    pageNext: "Next"
  },
  fa: {
    appTitle: "نونوگرام",
    tagline: "پازل‌های منطقی پیکسل آرت و جدول ژاپنی",
    play: "شروع بازی",
    levels: "مراحل و پازل‌ها",
    levelsSubtitle: "مجموعه‌ای غنی از پازل‌های متنوع در ابعاد گوناگون",
    dailyChallenge: "چالش روزانه",
    dailySubtitle: "هر روز یک پازل اختصاصی و جذاب برای ورزش مغز!",
    howToPlay: "راهنمای بازی",
    howToPlaySubtitle: "قوانین، منطق و نمونه حل شده",
    settings: "تنظیمات",
    settingsSubtitle: "پوسته، صدا و کنترل‌ها",
    continueGame: "ادامه بازی",
    newGame: "بازی جدید",
    category: "دسته‌بندی",
    allPuzzles: "همه پازل‌ها",
    catAll: "همه",
    catSmall: "کوچک (تا ۱۵)",
    catMedium: "متوسط (۱۶ تا ۲۵)",
    catLarge: "بزرگ (۲۶+)",
    catColor: "چند رنگ",
    catAdult: "۱۸+ بزرگسال",
    catCompleted: "حل شده",
    adultFilterTitle: "رده سنی محتوا",
    adultFilterAll: "همه محتوا (عادی و ۱۸+)",
    adultFilterSafe: "خانوادگی (بدون ۱۸+)",
    adultFilterAdult: "فقط ۱۸+ بزرگسال",
    colorFilterAll: "همه رنگ‌ها",
    colorFilterMono: "تک‌رنگ",
    colorFilterMulti: "چند رنگ",
    statusFilterTitle: "وضعیت:",
    statusFilterAll: "همه وضعیت‌ها",
    statusFilterUnsolved: "حل نشده",
    statusFilterCompleted: "حل شده",
    pageSizeLabel: "تعداد در صفحه:",
    pageSizeAll: "همه (یک‌جا)",
    quickSizeAll: "همه ابعاد",
    prevPuzzleInGame: "پازل قبلی",
    nextPuzzleInGame: "پازل بعدی",
    confirmReset: "آیا از شروع دوباره پازل اطمینان دارید؟",
    resetConfirmSubtitle: "تمامی خانه‌های بورد پاک خواهند شد.",
    randomTitle: "پازل تصادفی",
    showResultPreview: "پیش‌نمایش تصویر پازل",
    showResultPreviewDesc: "نمایش تصویر پیکسلی کامل روی کارت‌های پازل",
    previewShowResult: "پیش‌نمایش: روشن",
    previewMystery: "پیش‌نمایش: مخفی",
    adultBadge: "۱۸+",
    searchPuzzlesPlaceholder: "جستجوی پازل با نام یا اندازه...",
    colorCount: "رنگ‌ها",
    dimensions: "ابعاد",
    puzzlesCount: "پازل",
    monochrome: "تک‌رنگ",
    multiColor: "چند رنگ",
    activeColor: "رنگ انتخابی",
    sharedPuzzles: "پازل‌های اشتراکی",
    easy: "ساده (تا ۱۵)",
    medium: "متوسط (۱۶ تا ۲۵)",
    hard: "سخت (۲۶+)",
    master: "حرفه‌ای (۲۰×۲۰)",
    completed: "حل شده",
    bestTime: "بهترین زمان",
    time: "زمان",
    mistakes: "خطاها",
    hints: "راهنمایی",
    reset: "شروع دوباره",
    pause: "توقف",
    gamePaused: "بازی متوقف شد",
    resume: "ادامه بازی",
    restart: "از اول",
    confirmResetAction: "بله، شروع دوباره",
    cancelReset: "خیر، ادامه بازی",
    giveUp: "تسلیم و مشاهده نتیجه",
    confirmSurrender: "آیا از تسلیم شدن اطمینان دارید؟",
    surrenderConfirmSubtitle: "پاسخ کامل پازل نمایش داده خواهد شد و بازی جاری پایان می‌یابد.",
    confirmSurrenderAction: "بله، تسلیم و نمایش نتیجه",
    cancelSurrender: "خیر، ادامه بازی",
    surrendered: "تسلیم شدید",
    myAnswers: "پاسخ من",
    correctSolution: "پاسخ درست",
    backToMenu: "منوی اصلی",
    backToHome: "بازگشت به خانه",
    backToGame: "بازگشت به بازی",
    backToSelectPuzzle: "خروج از پازل",
    selectLevel: "انتخاب پازل",
    all: "همه",
    modeFill: "رنگ",
    modeCross: "ضربدر",
    modeMark: "شک",
    modePan: "جابه‌جایی",
    dragHint: "کلیک یا کشیدن روی خانه‌ها. کلیک راست برای ضربدر و کلیک یا درگ وسط برای پاک کردن.",
    victoryTitle: "آفرین! پازل حل شد",
    victorySubtitle: "با استدلال منطقی تصویر پیکسلی مخفی را آشکار کردید.",
    victorySurrenderedTitle: "نمایش حل پازل",
    nextLevel: "پازل بعدی",
    nextPuzzle: "پازل بعدی",
    playAgain: "بازی دوباره",
    shareSolution: "اشتراک‌گذاری پیروزی",
    gameOverTitle: "پایان بازی",
    gameOverSubtitle: "تعداد خطاهای شما به سقف مجاز رسید.",
    tryAgain: "تلاش مجدد",
    continueZen: "ادامه در حالت آرامش (Zen)",
    zenModeHint: "نکته: می‌توانید در تنظیمات، حالت آرامش (Zen Mode) را برای بازی بدون باخت فعال کنید.",

    // Loading Puzzles
    loadingPuzzles: "در حال بارگذاری پازل‌ها...",
    openingPuzzlesGz: "در حال باز کردن puzzles.gz...",
    extractingPuzzlesGz: "در حال استخراج و تحلیل پازل‌ها...",
    puzzlesLoaded: "پازل‌ها آماده شدند!",

    // Tutorial
    tutorialTitle: "آموزش و قوانین بازی نونوگرام (پیکروس)",
    tutStep1Title: "۱. هدف بازی",
    tutStep1Desc: "با پر کردن خانه‌های صحیح بر اساس اعداد راهنما در سطرها و ستون‌ها، تصویر پیکسلی مخفی را آشکار کنید.",
    tutStep2Title: "۲. معنای اعداد راهنما",
    tutStep2Desc: "اعداد نشان‌دهنده دسته‌های متوالی خانه‌های پر هستند. برای مثال، «۳ ۱» یعنی ۳ خانه متوالی پر، حداقل ۱ خانه خالی، و سپس ۱ خانه پر.",
    tutStep3Title: "۳. استفاده از ضربدر (X)",
    tutStep3Desc: "وقتی مطمئن شدید خانه‌ای باید خالی بماند روی آن ضربدر بگذارید تا مسیر بقیه سطرها مشخص شود.",
    tutStep4Title: "۴. کلیک وسط و کشیدن برای پاک‌کردن",
    tutStep4Desc: "کلیک چپ رنگ می‌کند، کلیک راست ضربدر می‌زند و کلیک یا درگ دکمه وسط ماوس خانه‌ها را پاک و خالی می‌کند.",
    sampleTutorialTitle: "نمونه تعاملی و قابل بازی",
    sampleTutorialDesc: "می‌توانید روی خانه‌های جدول زیر ضربه بزنید یا کلیک کنید تا پر کردن یا ضربدر زدن را امتحان کنید! به تطابق اعداد با سطرها و ستون‌ها دقت کنید.",
    controlsGuideTitle: "راهنمای کنترل‌ها در کامپیوتر و لمسی (موبایل)",
    controlsMouseTitle: "کنترل‌های ماوس (کامپیوتر)",
    ctrlMouse1: "کلیک چپ و درگ: پر کردن یا پاک کردن سریع خانه‌ها در امتداد سطر یا ستون",
    ctrlMouse2: "کلیک راست و درگ: قرار دادن یا حذف ضربدر (X) برای علامت‌گذاری خانه‌های خالی",
    ctrlMouse3: "درگ کلیک وسط ماوس یا کلیک و درگ با کلید Ctrl: جابه‌جایی و حرکت روی بورد بازی",
    controlsKeyboardTitle: "میانبرهای کیبورد (صفحه‌کلید)",
    ctrlKey1: "کلیدهای جهت‌نما یا WASD: حرکت و پیمایش بین خانه‌های جدول",
    ctrlKey2: "Space / Enter: پر کردن خانه، X / C: علامت ضربدر، Q: علامت شک، Delete: پاک‌کردن",
    ctrlKey3: "کلیدهای ۱ تا ۵: انتخاب رنگ‌ها، + و - و 0: کنترل بزرگ‌نمایی، Z و Y: بازگشت و جلو",
    controlsTouchTitle: "کنترل‌های لمسی (گوشی و تبلت)",
    ctrlTouch1: "ضربه یا کشیدن (Tap/Drag): اعمال حالت انتخابی فعلی بر روی خانه‌ها",
    ctrlTouch2: "نگه داشتن لمس (Hold ۳۰۰ میلی‌ثانیه): قرار دادن یا حذف سریع ضربدر (X) بدون نیاز به تعویض ابزار",
    ctrlTouch3: "نوار ابزار پایین: لمس ابزارها برای تعویض، یا لمس مجدد ابزار فعال برای ورود/خروج از حالت جابه‌جایی",
    startPractice: "شروع حل پازل‌ها",

    // Settings
    settingsTitle: "تنظیمات بازی",
    language: "زبان برنامه",
    languageDesc: "تغییر زبان رابط کاربری",
    langAuto: "خودکار (سیستم)",
    theme: "پوسته ظاهری",
    themeDesc: "انتخاب تم رنگی",
    themeAuto: "خودکار (سیستم)",
    themeDark: "تاریک",
    themeLight: "روشن",
    pixelFont: "قلم پیکسلی",
    pixelFontDesc: "استفاده از فونت پیکسلی رویین در برنامه",
    soundFX: "جلوه‌های صوتی",
    soundFXDesc: "پخش صدا هنگام پر کردن خانه‌ها و پیروزی",
    vibration: "لرزش لمسی (Haptic)",
    vibrationDesc: "لرزش کوتاه در گوشی",
    gameplayRules: "قوانین و گیم‌پلی",
    gameMode: "محدودیت خطا",
    gameModeDesc: "تعداد جان‌ها در هر دست",
    mode3Hearts: "۳ جان (استاندارد)",
    modeZen: "حالت آرامش / بدون باخت (Zen)",
    autoCrossNumbers: "خط زدن خودکار اعداد",
    autoCrossNumbersDesc: "کم‌رنگ شدن اعداد راهنمای حل شده",
    autoFillCrosses: "پر کردن خودکار ضربدر",
    autoFillCrossesDesc: "ضربدر زدن خودکار خانه‌های خالی خطوط کامل",
    highlightCrosshairs: "روشن شدن سطر و ستون",
    highlightCrosshairsDesc: "نمایش خطوط متقاطع خانه‌ای که روی آن هستید",
    showTimer: "نمایش زمان‌سنج",
    showTimerDesc: "نمایش زمان در بالای صفحه بازی",
    webxdcBroadcast: "اطلاع‌رسانی حل پازل",
    webxdcBroadcastDesc: "ارسال پیام خودکار به گروه چت هنگام حل هر پازل",
    saveSettings: "بستن",

    // Random generator
    randomGenerator: "تولید پازل تصادفی",
    gridSize: "اندازه جدول:",
    difficulty: "درجه سختی:",
    diffEasy: "ساده (الگوهای منظم)",
    diffMedium: "متوسط (متعادل)",
    diffHard: "سخت (استنتاج عمیق)",
    startRandom: "شروع پازل تصادفی",
    progressiveModeTitle: "حالت رشد تدریجی",
    progressiveModeDesc: "با حل هر پازل، پازل بعدی به طور خودکار ۱ سطر و ستون بزرگ‌تر می‌شود (۵×۵ ← ۶×۶ ← ۷×۷ ...)",

    // Daily & Sharing
    dailyTitle: "چالش روزانه",
    dailySubtitle: "هر روز یک پازل اختصاصی و جذاب برای ورزش مغز!",
    copiedToClipboard: "متن نتیجه در حافظه کپی شد!",
    confirmReset: "آیا مطمئن هستید که می‌خواهید این جدول را از اول شروع کنید؟",
    noPuzzlesInCategory: "هیچ پازلی در این دسته‌بندی موجود نیست.",
    pagePrev: "قبلی",
    pageNext: "بعدی"
  }
};

class I18nManager {
  constructor() {
    this.selectedSetting = 'auto'; // 'auto', 'fa', 'en'
    try {
      const saved = localStorage.getItem('nonogram_lang');
      if (saved && (saved === 'fa' || saved === 'en' || saved === 'auto')) {
        this.selectedSetting = saved;
      }
    } catch (e) {
      console.warn('localStorage not accessible for i18n:', e);
    }
  }

  detectSystemLang() {
    try {
      const navLang = (navigator.languages && navigator.languages[0]) || navigator.language || '';
      const lower = navLang.toLowerCase();
      if (lower.startsWith('fa') || lower.startsWith('ar') || lower.startsWith('pes') || lower.startsWith('prs')) {
        return 'fa';
      }
      if (lower.startsWith('en')) {
        return 'en';
      }
    } catch (e) {
      // Fallback below
    }
    return 'en'; // Non-Persian/undetectable system languages default to English
  }

  getSetting() {
    return this.selectedSetting || 'auto';
  }

  getLang() {
    if (this.selectedSetting === 'auto') {
      return this.detectSystemLang();
    }
    return this.selectedSetting || 'fa';
  }

  setLang(setting) {
    if (setting === 'auto' || I18N_DATA[setting]) {
      this.selectedSetting = setting;
      try {
        localStorage.setItem('nonogram_lang', setting);
      } catch (e) {
        console.warn('Failed to save lang to localStorage:', e);
      }
      this.applyToDOM();
    }
  }

  t(key) {
    const lang = this.getLang();
    const langObj = I18N_DATA[lang] || I18N_DATA.fa || {};
    return langObj[key] || (I18N_DATA.en && I18N_DATA.en[key]) || key;
  }

  applyToDOM() {
    const lang = this.getLang();
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';
    if (document.body) {
      if (lang === 'fa') {
        document.body.classList.add('lang-fa');
        document.body.classList.remove('lang-en');
      } else {
        document.body.classList.add('lang-en');
        document.body.classList.remove('lang-fa');
      }
    }

    // Update select if exists
    const langSelect = document.getElementById('setting-language-select');
    if (langSelect) {
      langSelect.value = this.getSetting();
    }

    // Update all elements with data-i18n
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key) {
        el.textContent = this.t(key);
      }
    });

    // Update placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (key) {
        el.setAttribute('placeholder', this.t(key));
      }
    });

    // Update titles / tooltips
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      if (key) {
        el.setAttribute('title', this.t(key));
      }
    });

    if (window.gameEngine && typeof window.gameEngine.updateHUD === 'function') {
      window.gameEngine.updateHUD();
    }
  }
}

// Instantiate and expose globally immediately
window.I18N_DATA = I18N_DATA;
window.I18nManager = I18nManager;
window.i18n = new I18nManager();
