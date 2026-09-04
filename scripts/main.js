/**
 * nonograms - Main Application Orchestrator
 * Connects UI, Select Puzzle search & filtering, Game Engine, Audio, Settings & WebXDC
 */

class App {
  constructor() {
    this.currentScreen = 'home';
    this.activeLevelCategory = 'all';
    this.gameOriginScreen = 'levels';
    this.searchQuery = '';
    this.adultFilter = (window.settingsManager && window.settingsManager.get('adultFilter')) || 'safe';
    this.colorFilter = 'all';
    this.statusFilter = 'all';
    this.showResultPreview = window.settingsManager ? (window.settingsManager.get('showResultPreview') !== false) : true;
    this.currentPage = 1;
    const savedPageSize = (typeof localStorage !== 'undefined') ? localStorage.getItem('nonogram_page_size') : null;
    this.pageSizeSetting = savedPageSize || '20';
    this.pageSize = this.pageSizeSetting === 'all' ? 999999 : (parseInt(this.pageSizeSetting, 10) || 20);
    this.thumbnailCache = new Map();
    this.activeThumbnailRenderFrames = [];
    this.cachedFilterKey = null;
    this.cachedFilteredPuzzles = [];
  }

  getFilteredPuzzles(category = this.activeLevelCategory) {
    const q = (this.searchQuery || '').trim().toLowerCase();
    const filterKey = `${category}|${q}|${this.adultFilter}|${this.colorFilter}|${this.statusFilter}|${window.puzzleManager ? window.puzzleManager.puzzles.length : 0}`;
    if (this.cachedFilterKey === filterKey && this.cachedFilteredPuzzles && this.cachedFilteredPuzzles.length >= 0) {
      return this.cachedFilteredPuzzles;
    }
    this.cachedFilterKey = filterKey;
    this.cachedFilteredPuzzles = window.puzzleManager ? (window.puzzleManager.getPuzzlesByCategory(category, this.searchQuery, this.adultFilter, this.colorFilter, this.statusFilter) || []) : [];
    return this.cachedFilteredPuzzles;
  }

  async init() {
    // 0. Pre-apply i18n so early loaders and screens match user language preference
    if (window.i18n && typeof window.i18n.applyToDOM === 'function') {
      window.i18n.applyToDOM();
    }

    // 1. Initialize Puzzles dataset (shows loading while opening puzzles.gz)
    if (window.puzzleManager && typeof window.puzzleManager.init === 'function') {
      await window.puzzleManager.init();
    }

    // 2. Initialize i18n
    if (window.i18n && typeof window.i18n.applyToDOM === 'function') {
      window.i18n.applyToDOM();
    }

    // 2.5 Inject Centralized SVG Icons
    this.injectIcons();

    // 3. Initialize Game Engine
    const gameContainer = document.getElementById('nonogram-game-container');
    if (gameContainer && window.gameEngine) {
      window.gameEngine.init(gameContainer);
    }

    // 4. Bind UI & Settings Events
    this.bindEvents();
    this.bindSettingsEvents();
    this.bindKeyboardShortcuts();
    this.bindWebXDC();
    this.initTutorialSample();

    // 5. Check URL parameters for WebXDC deep linking or Restore active session
    let resumed = this.checkDeepLink();
    if (!resumed) {
      const lastScreen = localStorage.getItem('nonogram_last_screen');
      const activePuzzle = window.puzzleManager ? window.puzzleManager.getActivePuzzle() : null;
      if (activePuzzle) {
        const progress = window.puzzleManager.getProgress(activePuzzle.id);
        const hasValidProgress = progress && progress.playerGrid && !progress.isWon && !progress.isGameOver;
        if (hasValidProgress && (lastScreen === 'game' || !lastScreen)) {
          this.startPuzzle(activePuzzle, 'home');
          resumed = true;
        }
      }
    }

    // 6. Show Home screen by default if no active game or deep link was resumed
    if (!resumed) {
      const savedScreen = localStorage.getItem('nonogram_last_screen');
      const screenToShow = (savedScreen === 'game' || !savedScreen) ? 'home' : savedScreen;
      this.showScreen(screenToShow);
    }

    // Auto-save progress on page reload/unload or visibility change
    window.addEventListener('beforeunload', () => {
      if (window.gameEngine && window.gameEngine.puzzle && !window.gameEngine.isWon && !window.gameEngine.isGameOver) {
        window.gameEngine.saveCurrentProgress();
      } else {
        if (localStorage.getItem('nonogram_last_screen') === 'game') {
          localStorage.setItem('nonogram_last_screen', (this.gameOriginScreen && this.gameOriginScreen !== 'game') ? this.gameOriginScreen : 'home');
        }
      }
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && window.gameEngine && window.gameEngine.puzzle && !window.gameEngine.isWon && !window.gameEngine.isGameOver) {
        window.gameEngine.saveCurrentProgress();
      }
    });

    // Listen to URL changes for WebXDC notifications
    window.addEventListener('popstate', () => this.checkDeepLink());
    window.addEventListener('hashchange', () => this.checkDeepLink());

    let lastSearch = window.location.search;
    setInterval(() => {
      if (window.location.search !== lastSearch) {
        lastSearch = window.location.search;
        this.checkDeepLink();
      }
    }, 500);
  }

  checkDeepLink() {
    const urlParams = new URLSearchParams(window.location.search);
    const searchParam = urlParams.get('search');
    if (searchParam) {
      const queryStr = `#${searchParam}`;
      if (this.searchQuery === queryStr && this.currentScreen === 'levels') {
        return true;
      }
      const searchInput = document.getElementById('puzzle-search-input');
      if (searchInput) {
        searchInput.value = queryStr;
      }
      this.searchQuery = queryStr;
      this.currentPage = 1;
      this.activeLevelCategory = 'all'; // Default to all categories to find the correct puzzle
      this.showScreen('levels');
      return true;
    }
    return false;
  }

  injectIcons() {
    if (!window.ICONS) return;
    document.querySelectorAll('[data-icon]').forEach(el => {
      const iconName = el.dataset.icon;
      if (window.ICONS[iconName]) {
        el.innerHTML = window.ICONS[iconName];
        const svg = el.querySelector('svg');
        if (svg) {
          const currentStyle = el.getAttribute('style');
          if (currentStyle) {
            svg.setAttribute('style', currentStyle);
          }
        }
      }
    });
  }

  showScreen(screenId) {
    const prevScreen = this.currentScreen;
    this.currentScreen = screenId;
    try {
      localStorage.setItem('nonogram_last_screen', screenId);
    } catch (e) {}

    if (screenId === 'home') {
      this.updateHomeContinueButton();
    }

    // Pause game when entering settings from game
    if (prevScreen === 'game' && screenId === 'settings') {
      if (window.gameEngine && window.gameEngine.puzzle) {
        if (!window.gameEngine.isPaused && !window.gameEngine.isGameOver && !window.gameEngine.isWon) {
          window.gameEngine.isPaused = true;
          this.wasRunningBeforeSettings = true;
        } else {
          this.wasRunningBeforeSettings = false;
        }
      }
    }

    // Resume game when entering game if it was running before settings
    if (screenId === 'game') {
      if (window.gameEngine && window.gameEngine.puzzle && this.wasRunningBeforeSettings) {
        window.gameEngine.isPaused = false;
        this.wasRunningBeforeSettings = false;
      }
    }

    // Toggle active screen class
    document.querySelectorAll('.app-screen').forEach(screen => {
      screen.classList.toggle('active-screen', screen.id === `screen-${screenId}`);
    });

    const appRoot = document.getElementById('app-root');
    if (appRoot) {
      appRoot.classList.toggle('full-width', screenId === 'game');
    }

    if (screenId === 'settings') {
      const settingsBackBtn = document.querySelector('#screen-settings .levels-header button[data-nav]');
      if (settingsBackBtn) {
        if (prevScreen === 'game') {
          settingsBackBtn.dataset.nav = 'game';
          settingsBackBtn.setAttribute('data-i18n', 'backToGame');
        } else {
          settingsBackBtn.dataset.nav = 'home';
          settingsBackBtn.setAttribute('data-i18n', 'backToHome');
        }
        if (window.i18n && typeof window.i18n.applyToDOM === 'function') {
          window.i18n.applyToDOM();
        }
      }
    }

    if (screenId === 'levels') {
      if (!this.activeLevelCategory) {
        this.activeLevelCategory = 'all';
      }
      // Sync active class on category buttons
      document.querySelectorAll('.category-filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.category === this.activeLevelCategory);
      });

      // Sync Adult Filter select
      const adultSelect = document.getElementById('adult-filter-select');
      if (adultSelect) {
        adultSelect.value = this.adultFilter;
      }

      // Sync Color Filter select
      const colorSelect = document.getElementById('color-filter-select');
      if (colorSelect) {
        colorSelect.value = this.colorFilter;
      }

      // Sync Status Filter select
      const statusSelect = document.getElementById('status-filter-select');
      if (statusSelect) {
        statusSelect.value = this.statusFilter;
      }

      // Sync Page Size select
      const pageSizeSelect = document.getElementById('page-size-select');
      if (pageSizeSelect) {
        pageSizeSelect.value = this.pageSizeSetting;
      }

      // Sync Preview Toggle button
      this.updatePreviewToggleButtonUI();

      this.renderLevelList(this.activeLevelCategory);
    }

    if (screenId === 'game') {
      setTimeout(() => {
        if (window.gameEngine && window.gameEngine.panZoomController) {
          window.gameEngine.panZoomController.resetView();
        }
      }, 50);
    }

    // Scroll to top
    window.scrollTo(0, 0);
  }

  bindEvents() {
    // Global button audio click feedback - triggers instantly on touch/pointerdown without double firing
    let lastClickSoundTime = 0;
    const handleButtonClickSound = (e) => {
      const btn = e.target.closest('button, .btn, .icon-btn, .game-settings-btn, .category-filter-btn, .palette-color-swatch, .action-tool-btn, .control-mode-btn, .level-card, .level-play-btn, .pagination-btn, .toggle-switch, .preview-mode-toggle-btn, .setting-row, [data-nav], [role="button"], input[type="button"], input[type="submit"], input[type="checkbox"], select, a');
      if (btn && window.sounds) {
        const now = performance.now();
        if (now - lastClickSoundTime > 60) {
          lastClickSoundTime = now;
          window.sounds.playClick();
        }
      }
    };

    document.addEventListener('pointerdown', handleButtonClickSound, { passive: true });

    // Audio feedback on setting dropdowns and switches
    document.addEventListener('change', (e) => {
      const el = e.target.closest('select, input[type="checkbox"], input[type="radio"]');
      if (el && window.sounds) {
        window.sounds.playClick();
      }
    });

    // Navigation buttons
    document.querySelectorAll('[data-nav]').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.nav;
        if (target === 'game-continue' && window.gameEngine.puzzle) {
          this.showScreen('game');
        } else {
          this.showScreen(target);
        }
      });
    });

    // Real-time Search Input in Select Puzzle Page
    const searchInput = document.getElementById('puzzle-search-input');
    const searchClearBtn = document.getElementById('puzzle-search-clear-btn');

    if (searchClearBtn) {
      searchClearBtn.addEventListener('click', () => {
        if (searchInput) {
          searchInput.value = '';
          this.searchQuery = '';
          searchClearBtn.classList.add('hidden');
          this.currentPage = 1;
          this.renderLevelList(this.activeLevelCategory);
          searchInput.focus();
        }
      });
    }

    if (searchInput) {
      let searchTimeout;
      searchInput.addEventListener('input', (e) => {
        const val = e.target.value;
        if (searchClearBtn) {
          searchClearBtn.classList.toggle('hidden', !val);
        }
        
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          this.searchQuery = val;
          this.currentPage = 1;
          this.renderLevelList(this.activeLevelCategory);
        }, 350);
      });
    }

    // Adult Content Filter Select
    const adultSelect = document.getElementById('adult-filter-select');
    if (adultSelect) {
      adultSelect.addEventListener('change', (e) => {
        this.adultFilter = e.target.value;
        if (window.settingsManager) {
          window.settingsManager.set('adultFilter', this.adultFilter);
        }
        if (window.sounds) window.sounds.playClick();
        this.currentPage = 1;
        this.renderLevelList(this.activeLevelCategory);
      });
    }

    // Color Content Filter Select
    const colorSelect = document.getElementById('color-filter-select');
    if (colorSelect) {
      colorSelect.addEventListener('change', (e) => {
        this.colorFilter = e.target.value;
        if (window.sounds) window.sounds.playClick();
        this.currentPage = 1;
        this.renderLevelList(this.activeLevelCategory);
      });
    }

    // Status Filter Select (All / Unsolved / Solved)
    const statusSelect = document.getElementById('status-filter-select');
    if (statusSelect) {
      statusSelect.addEventListener('change', (e) => {
        this.statusFilter = e.target.value;
        if (window.sounds) window.sounds.playClick();
        this.currentPage = 1;
        this.renderLevelList(this.activeLevelCategory);
      });
    }

    // Solution Preview Mode Toggle Button
    const previewToggleBtn = document.getElementById('toggle-preview-mode-btn');
    if (previewToggleBtn) {
      previewToggleBtn.addEventListener('click', () => {
        this.showResultPreview = !this.showResultPreview;
        if (window.settingsManager) {
          window.settingsManager.set('showResultPreview', this.showResultPreview);
        }
        // Sync settings screen checkbox
        const settingToggle = document.getElementById('setting-preview-toggle');
        if (settingToggle) settingToggle.checked = this.showResultPreview;
        
        if (window.sounds) window.sounds.playClick();
        this.updatePreviewToggleButtonUI();
        this.renderLevelList(this.activeLevelCategory);
      });
    }

    // Category Filter buttons in Select Puzzle page
    document.querySelectorAll('.category-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const cat = btn.dataset.category;
        this.activeLevelCategory = cat;
        this.currentPage = 1;
        document.querySelectorAll('.category-filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (window.sounds) window.sounds.playClick();
        this.renderLevelList(this.activeLevelCategory);
      });
    });

    // Delegated click handler for Level Cards & Play buttons (Instant, zero-leak event handling)
    const levelGridEl = document.getElementById('levels-grid-list');
    if (levelGridEl) {
      levelGridEl.addEventListener('click', (e) => {
        const target = e.target.closest('.level-card, .level-play-btn');
        if (!target) return;
        const id = target.dataset.id || target.dataset.puzzleId;
        if (!id) return;
        const puzzle = window.puzzleManager ? window.puzzleManager.getPuzzleById(id) : null;
        if (puzzle) {
          if (window.sounds) window.sounds.playClick();
          this.startPuzzle(puzzle);
        }
      });
    }

    // Page Size Filter Select (20 / 40 / 80 / All)
    const pageSizeSelect = document.getElementById('page-size-select');
    if (pageSizeSelect) {
      pageSizeSelect.value = this.pageSizeSetting;
      pageSizeSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        this.pageSizeSetting = val;
        try {
          localStorage.setItem('nonogram_page_size', val);
        } catch (err) {}
        this.pageSize = val === 'all' ? 999999 : (parseInt(val, 10) || 20);
        this.currentPage = 1;
        if (window.sounds) window.sounds.playClick();
        this.renderLevelList(this.activeLevelCategory);
        this.scrollToGridTop();
      });
    }

    // Top & Bottom Quick Pagers delegated listener
    document.querySelectorAll('.levels-top-pager').forEach(pagerEl => {
      pagerEl.addEventListener('click', (e) => {
        const target = e.target.closest('button');
        if (!target) return;
        const puzzles = this.getFilteredPuzzles(this.activeLevelCategory);
        const totalPages = Math.ceil(puzzles.length / this.pageSize) || 1;

        if (target.classList.contains('top-pager-prev-btn') || target.id === 'top-pg-prev-btn' || target.id === 'bottom-pg-prev-btn') {
          if (this.currentPage > 1) {
            this.currentPage--;
            if (window.sounds) window.sounds.playClick();
            this.renderLevelList(this.activeLevelCategory);
            this.scrollToGridTop();
          }
        } else if (target.classList.contains('top-pager-next-btn') || target.id === 'top-pg-next-btn' || target.id === 'bottom-pg-next-btn') {
          if (this.currentPage < totalPages) {
            this.currentPage++;
            if (window.sounds) window.sounds.playClick();
            this.renderLevelList(this.activeLevelCategory);
            this.scrollToGridTop();
          }
        }
      });

      pagerEl.addEventListener('change', (e) => {
        if (e.target.classList.contains('top-pager-select') || e.target.id === 'top-pg-select' || e.target.id === 'bottom-pg-select') {
          const page = parseInt(e.target.value, 10);
          if (page && page !== this.currentPage) {
            this.currentPage = page;
            if (window.sounds) window.sounds.playClick();
            this.renderLevelList(this.activeLevelCategory);
            this.scrollToGridTop();
          }
        }
      });
    });

    // Home Continue Game button
    const continueBtn = document.getElementById('home-continue-btn');
    if (continueBtn) {
      continueBtn.addEventListener('click', () => {
        if (window.sounds) window.sounds.playClick();
        const activePuzzle = window.puzzleManager ? window.puzzleManager.getActivePuzzle() : null;
        if (activePuzzle) {
          this.startPuzzle(activePuzzle, 'home');
        }
      });
    }

    // Daily challenge button
    const dailyBtn = document.getElementById('home-daily-btn');
    if (dailyBtn) {
      dailyBtn.addEventListener('click', () => {
        if (window.sounds) window.sounds.playClick();
        const daily = window.puzzleManager.getDailyPuzzle();
        this.startPuzzle(daily, 'home');
      });
    }

    // Random generator button
    const randomBtn = document.getElementById('home-random-btn');
    if (randomBtn) {
      randomBtn.addEventListener('click', () => {
        if (window.sounds) window.sounds.playClick();
        const size = parseInt(document.getElementById('random-size-select')?.value || '10', 10);
        const difficulty = document.getElementById('random-diff-select')?.value || 'medium';
        const randPuzzle = window.NonogramEngine.generateRandomPuzzle(size, difficulty);
        this.startPuzzle(randPuzzle, 'home');
      });
    }

    // In-game header Back button
    document.querySelectorAll('.game-nav-back-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (window.sounds) window.sounds.playClick();
        if (window.gameEngine) {
          window.gameEngine.saveCurrentProgress();
        }
        this.showScreen(this.gameOriginScreen || 'levels');
      });
    });

    // In-game tool mode buttons (Fill, Cross, Question)
    document.querySelectorAll('.control-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (window.sounds) window.sounds.playClick();
        window.gameEngine.setMode(btn.dataset.mode);
      });
    });

    // Game action buttons
    document.getElementById('game-undo-btn')?.addEventListener('click', () => window.gameEngine.undo());
    document.getElementById('game-redo-btn')?.addEventListener('click', () => window.gameEngine.redo());
    document.getElementById('game-hint-btn')?.addEventListener('click', () => window.gameEngine.useHint());
    document.getElementById('game-pause-btn')?.addEventListener('click', () => window.gameEngine.togglePause());

    document.getElementById('reset-confirm-btn')?.addEventListener('click', () => {
      if (window.sounds) window.sounds.playClick();
      document.getElementById('reset-modal')?.classList.add('hidden');
      document.getElementById('pause-modal')?.classList.add('hidden');
      window.gameEngine.reset();
    });

    document.getElementById('reset-cancel-btn')?.addEventListener('click', () => {
      if (window.sounds) window.sounds.playClick();
      document.getElementById('reset-modal')?.classList.add('hidden');
      document.getElementById('pause-modal')?.classList.add('hidden');
      if (window.gameEngine) {
        window.gameEngine.resumeGame();
      }
    });

    // Pause Modal actions
    document.getElementById('pause-resume-btn')?.addEventListener('click', () => window.gameEngine.resumeGame());
    document.getElementById('pause-restart-btn')?.addEventListener('click', () => {
      if (window.sounds) window.sounds.playClick();
      document.getElementById('pause-modal')?.classList.add('hidden');
      document.getElementById('reset-modal')?.classList.remove('hidden');
    });
    document.getElementById('pause-giveup-btn')?.addEventListener('click', () => {
      if (window.sounds) window.sounds.playClick();
      document.getElementById('pause-modal')?.classList.add('hidden');
      document.getElementById('surrender-modal')?.classList.remove('hidden');
    });
    document.getElementById('surrender-confirm-btn')?.addEventListener('click', () => {
      if (window.sounds) window.sounds.playClick();
      document.getElementById('surrender-modal')?.classList.add('hidden');
      document.getElementById('pause-modal')?.classList.add('hidden');
      window.gameEngine.giveUp();
    });
    document.getElementById('surrender-cancel-btn')?.addEventListener('click', () => {
      if (window.sounds) window.sounds.playClick();
      document.getElementById('surrender-modal')?.classList.add('hidden');
      document.getElementById('pause-modal')?.classList.add('hidden');
      if (window.gameEngine) {
        window.gameEngine.resumeGame();
      }
    });
    document.getElementById('surrender-toggle-solution')?.addEventListener('change', (e) => {
      if (window.sounds) window.sounds.playClick();
      if (window.gameEngine) {
        window.gameEngine.showSurrenderGrid(e.target.checked);
      }
    });
    document.getElementById('surrender-back-btn')?.addEventListener('click', () => {
      if (window.sounds) window.sounds.playClick();
      if (window.puzzleManager) {
        window.puzzleManager.clearActiveGame();
      }
      this.showScreen(this.gameOriginScreen || 'levels');
    });
    document.getElementById('pause-menu-btn')?.addEventListener('click', () => {
      if (window.gameEngine) {
        window.gameEngine.resumeGame();
        window.gameEngine.saveCurrentProgress();
      }
      this.showScreen(this.gameOriginScreen || 'levels');
    });

    // Victory modal actions
    document.getElementById('victory-next-btn')?.addEventListener('click', () => {
      document.getElementById('victory-modal')?.classList.add('hidden');
      const isRandom = window.gameEngine.puzzle && window.gameEngine.puzzle.id.startsWith('random_');
      const isProgressive = document.getElementById('random-progressive-toggle')?.checked;
      if (isRandom && isProgressive) {
        const curSize = window.gameEngine.puzzle.cols || window.gameEngine.puzzle.size;
        const nextSize = Math.min(curSize + 1, 20);
        const sizeSelect = document.getElementById('random-size-select');
        if (sizeSelect) sizeSelect.value = nextSize.toString();
        const difficulty = document.getElementById('random-diff-select')?.value || 'medium';
        const randPuzzle = window.NonogramEngine.generateRandomPuzzle(nextSize, difficulty);
        this.startPuzzle(randPuzzle, 'home');
      } else {
        this.playNextLevel();
      }
    });
    document.getElementById('victory-again-btn')?.addEventListener('click', () => {
      document.getElementById('victory-modal')?.classList.add('hidden');
      window.gameEngine.reset();
    });
    document.getElementById('victory-menu-btn')?.addEventListener('click', () => {
      document.getElementById('victory-modal')?.classList.add('hidden');
      this.showScreen(this.gameOriginScreen || 'levels');
    });
    document.getElementById('victory-share-btn')?.addEventListener('click', () => {
      this.shareVictory();
    });

    // Game Over modal actions
    document.getElementById('gameover-retry-btn')?.addEventListener('click', () => {
      document.getElementById('gameover-modal')?.classList.add('hidden');
      window.gameEngine.reset();
    });
    document.getElementById('gameover-zen-btn')?.addEventListener('click', () => {
      document.getElementById('gameover-modal')?.classList.add('hidden');
      window.settingsManager.set('gameMode', 'zen');
      window.gameEngine.resumeAsZen();
    });
    document.getElementById('gameover-menu-btn')?.addEventListener('click', () => {
      document.getElementById('gameover-modal')?.classList.add('hidden');
      this.showScreen(this.gameOriginScreen || 'levels');
    });
  }

  bindKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;

      // Fast Page Navigation on Levels screen (Arrow keys or PageUp/PageDown)
      if (this.currentScreen === 'levels') {
        const puzzles = this.getFilteredPuzzles(this.activeLevelCategory);
        const totalPages = Math.ceil(puzzles.length / this.pageSize) || 1;
        if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
          if (this.currentPage > 1) {
            e.preventDefault();
            this.currentPage--;
            if (window.sounds) window.sounds.playClick();
            this.renderLevelList(this.activeLevelCategory);
            this.scrollToGridTop();
          }
        } else if (e.key === 'ArrowRight' || e.key === 'PageDown') {
          if (this.currentPage < totalPages) {
            e.preventDefault();
            this.currentPage++;
            if (window.sounds) window.sounds.playClick();
            this.renderLevelList(this.activeLevelCategory);
            this.scrollToGridTop();
          }
        }
        return;
      }

      // Interactive Tutorial Keyboard Support
      if (this.currentScreen === 'tutorial') {
        const key = e.key.toLowerCase();

        // Grid Arrow and WASD Navigation
        if (e.key === 'ArrowUp' || (!e.ctrlKey && !e.metaKey && key === 'w')) {
          e.preventDefault();
          this.moveTutorialCursor(-1, 0);
          return;
        }
        if (e.key === 'ArrowDown' || (!e.ctrlKey && !e.metaKey && key === 's')) {
          e.preventDefault();
          this.moveTutorialCursor(1, 0);
          return;
        }
        if (e.key === 'ArrowLeft' || (!e.ctrlKey && !e.metaKey && key === 'a')) {
          e.preventDefault();
          this.moveTutorialCursor(0, -1);
          return;
        }
        if (e.key === 'ArrowRight' || (!e.ctrlKey && !e.metaKey && key === 'd')) {
          e.preventDefault();
          this.moveTutorialCursor(0, 1);
          return;
        }

        // Cell Actions
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          this.applyTutorialAction('fill');
          return;
        }
        if (key === 'x' || (key === 'c' && !e.ctrlKey && !e.metaKey)) {
          e.preventDefault();
          this.applyTutorialAction('cross');
          return;
        }
        if (key === 'z' && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          this.applyTutorialAction('fill');
          return;
        }
        if (e.key === '1') {
          e.preventDefault();
          this.setTutorialTool('fill');
          return;
        }
        if (e.key === '2') {
          e.preventDefault();
          this.setTutorialTool('cross');
          return;
        }
        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          this.applyTutorialAction('clear');
          return;
        }
        if (key === 'r' && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          this.resetTutorialSample();
          return;
        }
        return;
      }

      if (this.currentScreen !== 'game') return;

      const code = e.code;
      const key = e.key.toLowerCase();

      // Grid Arrow and WASD Navigation
      if (e.key === 'ArrowUp' || (!e.ctrlKey && !e.metaKey && key === 'w')) {
        e.preventDefault();
        window.gameEngine.moveKeyboardCursor(-1, 0);
        return;
      }
      if (e.key === 'ArrowDown' || (!e.ctrlKey && !e.metaKey && key === 's')) {
        e.preventDefault();
        window.gameEngine.moveKeyboardCursor(1, 0);
        return;
      }
      if (e.key === 'ArrowLeft' || (!e.ctrlKey && !e.metaKey && key === 'a')) {
        e.preventDefault();
        window.gameEngine.moveKeyboardCursor(0, -1);
        return;
      }
      if (e.key === 'ArrowRight' || (!e.ctrlKey && !e.metaKey && key === 'd')) {
        e.preventDefault();
        window.gameEngine.moveKeyboardCursor(0, 1);
        return;
      }

      // Cell Action on Keyboard Focused Cell
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        window.gameEngine.applyActionAtKeyboardCursor('fill');
        return;
      }
      if (key === 'x') {
        e.preventDefault();
        window.gameEngine.applyActionAtKeyboardCursor('cross');
        return;
      }
      if (key === 'c' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        window.gameEngine.applyActionAtKeyboardCursor('cross');
        return;
      }
      if (key === 'q' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        window.gameEngine.applyActionAtKeyboardCursor('question');
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        window.gameEngine.applyActionAtKeyboardCursor('clear');
        return;
      }

      // Zoom Shortcuts (+, -, 0)
      if (e.key === '+' || e.key === '=' || code === 'NumpadAdd') {
        e.preventDefault();
        if (window.gameEngine.panZoomController) {
          window.gameEngine.panZoomController.zoomIn();
          if (window.sounds) window.sounds.playClick();
        }
        return;
      }
      if (e.key === '-' || e.key === '_' || code === 'NumpadSubtract') {
        e.preventDefault();
        if (window.gameEngine.panZoomController) {
          window.gameEngine.panZoomController.zoomOut();
          if (window.sounds) window.sounds.playClick();
        }
        return;
      }
      if (e.key === '0' || code === 'Numpad0') {
        e.preventDefault();
        if (window.gameEngine.panZoomController) {
          window.gameEngine.panZoomController.resetView();
          if (window.sounds) window.sounds.playClick();
        }
        return;
      }

      // Color selection (1 to 5)
      if (key === '1') {
        if (window.gameEngine.puzzle && window.gameEngine.puzzle.colorCount > 1) {
          window.gameEngine.setColor(0);
        } else {
          window.gameEngine.setMode('fill');
        }
      } else if (key === '2') {
        if (window.gameEngine.puzzle && window.gameEngine.puzzle.colorCount > 1) {
          window.gameEngine.setColor(1);
        } else {
          window.gameEngine.setMode('cross');
        }
      } else if (key === '3') {
        if (window.gameEngine.puzzle && window.gameEngine.puzzle.colorCount > 2) {
          window.gameEngine.setColor(2);
        } else {
          window.gameEngine.setMode('question');
        }
      } else if (key === '4' && window.gameEngine.puzzle && window.gameEngine.puzzle.colorCount > 3) {
        window.gameEngine.setColor(3);
      } else if (key === '5' && window.gameEngine.puzzle && window.gameEngine.puzzle.colorCount > 4) {
        window.gameEngine.setColor(4);
      } else if (key === 'f') {
        window.gameEngine.setMode('fill');
      } else if (key === 'z' && (e.ctrlKey || e.metaKey)) {
        if (e.shiftKey) window.gameEngine.redo();
        else window.gameEngine.undo();
      } else if (key === 'y' && (e.ctrlKey || e.metaKey)) {
        window.gameEngine.redo();
      } else if (key === 'h') {
        window.gameEngine.useHint();
      } else if (key === 'r' && !e.ctrlKey && !e.metaKey) {
        if (window.sounds) window.sounds.playClick();
        document.getElementById('reset-modal')?.classList.remove('hidden');
      } else if (key === 'escape' || key === 'p') {
        window.gameEngine.togglePause();
      }
    });
  }

  bindSettingsEvents() {
    // Language Select
    const langSelect = document.getElementById('setting-language-select');
    if (langSelect) {
      langSelect.value = window.i18n.getLang();
      langSelect.addEventListener('change', (e) => {
        const lang = e.target.value;
        window.i18n.setLang(lang);
        this.renderLevelList(this.activeLevelCategory);
        this.initTutorialSample();
      });
    }

    // Theme selector
    const themeSelect = document.getElementById('setting-theme-select');
    if (themeSelect) {
      themeSelect.value = window.settingsManager.get('theme');
      themeSelect.addEventListener('change', (e) => {
        window.settingsManager.set('theme', e.target.value);
      });
    }

    // Pixel font toggle
    const pixelFontToggle = document.getElementById('setting-pixelfont-toggle');
    if (pixelFontToggle) {
      pixelFontToggle.checked = window.settingsManager.get('pixelFont') !== false;
      pixelFontToggle.addEventListener('change', (e) => {
        window.settingsManager.set('pixelFont', e.target.checked);
      });
    }

    // Sound toggle
    const soundToggle = document.getElementById('setting-sound-toggle');
    if (soundToggle) {
      soundToggle.checked = window.settingsManager.get('sound');
      soundToggle.addEventListener('change', (e) => {
        window.settingsManager.set('sound', e.target.checked);
      });
    }

    // Vibration toggle
    const vibToggle = document.getElementById('setting-vibration-toggle');
    if (vibToggle) {
      vibToggle.checked = window.settingsManager.get('vibration');
      vibToggle.addEventListener('change', (e) => {
        window.settingsManager.set('vibration', e.target.checked);
      });
    }

    // Mistakes / Game mode
    const modeSelect = document.getElementById('setting-gamemode-select');
    if (modeSelect) {
      modeSelect.value = window.settingsManager.get('gameMode');
      modeSelect.addEventListener('change', (e) => {
        window.settingsManager.set('gameMode', e.target.value);
      });
    }

    // Auto cross numbers
    const autoCrossToggle = document.getElementById('setting-autocross-toggle');
    if (autoCrossToggle) {
      autoCrossToggle.checked = window.settingsManager.get('autoCrossNumbers');
      autoCrossToggle.addEventListener('change', (e) => {
        window.settingsManager.set('autoCrossNumbers', e.target.checked);
      });
    }

    // Auto fill crosses
    const autoFillToggle = document.getElementById('setting-autofill-toggle');
    if (autoFillToggle) {
      autoFillToggle.checked = window.settingsManager.get('autoFillCrosses');
      autoFillToggle.addEventListener('change', (e) => {
        window.settingsManager.set('autoFillCrosses', e.target.checked);
      });
    }

    // Highlight crosshairs
    const highlightToggle = document.getElementById('setting-highlight-toggle');
    if (highlightToggle) {
      highlightToggle.checked = window.settingsManager.get('highlightCrosshairs');
      highlightToggle.addEventListener('change', (e) => {
        window.settingsManager.set('highlightCrosshairs', e.target.checked);
      });
    }

    // Show Result Preview toggle
    const previewSettingToggle = document.getElementById('setting-preview-toggle');
    if (previewSettingToggle) {
      previewSettingToggle.checked = window.settingsManager.get('showResultPreview') === true;
      previewSettingToggle.addEventListener('change', (e) => {
        this.showResultPreview = e.target.checked;
        window.settingsManager.set('showResultPreview', this.showResultPreview);
        this.updatePreviewToggleButtonUI();
        if (this.currentScreen === 'levels') {
          this.renderLevelList(this.activeLevelCategory);
        }
      });
    }
  }

  updatePreviewToggleButtonUI() {
    const btn = document.getElementById('toggle-preview-mode-btn');
    const icon = document.getElementById('preview-mode-icon');
    const text = document.getElementById('preview-mode-text');
    if (!btn) return;

    if (this.showResultPreview) {
      btn.classList.add('active');
      if (icon) {
        if (window.ICONS && window.ICONS.previewShow) {
          icon.innerHTML = window.ICONS.previewShow;
        } else {
          icon.textContent = '👁️';
        }
      }
      if (text) {
        text.setAttribute('data-i18n', 'previewShowResult');
        text.textContent = window.i18n ? window.i18n.t('previewShowResult') : 'Preview: On';
      }
    } else {
      btn.classList.remove('active');
      if (icon) {
        if (window.ICONS && window.ICONS.previewHide) {
          icon.innerHTML = window.ICONS.previewHide;
        } else {
          icon.textContent = '🕵️';
        }
      }
      if (text) {
        text.setAttribute('data-i18n', 'previewMystery');
        text.textContent = window.i18n ? window.i18n.t('previewMystery') : 'Preview: Mystery';
      }
    }
  }

  initTutorialSample() {
    const sampleContainer = document.getElementById('tutorial-sample-board');
    if (!sampleContainer) return;

    // A sample 5x5 heart nonogram correctly solved with clues
    const sampleGridSolution = [
      [0, 1, 0, 1, 0],
      [1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1],
      [0, 1, 1, 1, 0],
      [0, 0, 1, 0, 0]
    ];
    this.tutClues = window.NonogramEngine.generateClues(sampleGridSolution);

    this.tutorialSampleState = [
      [0, 1, 0, 1, 0],
      [1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1],
      [0, 1, 1, 1, 0],
      [0, 0, 1, 0, 0]
    ];
    this.tutMode = 'fill';
    this.tutCursorR = 0;
    this.tutCursorC = 0;
    this.tutHasFocus = false;
    this.tutDragState = null;

    sampleContainer.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    });

    if (!this.tutPointerBound) {
      window.addEventListener('pointerup', () => {
        this.tutDragState = null;
      });
      window.addEventListener('pointercancel', () => {
        this.tutDragState = null;
      });
      this.tutPointerBound = true;
    }

    const fillBtn = document.getElementById('tut-tool-fill');
    const crossBtn = document.getElementById('tut-tool-cross');
    const resetBtn = document.getElementById('tut-tool-reset');

    if (fillBtn && crossBtn) {
      fillBtn.onclick = () => this.setTutorialTool('fill');
      crossBtn.onclick = () => this.setTutorialTool('cross');
    }

    if (resetBtn) {
      resetBtn.onclick = () => this.resetTutorialSample();
    }

    this.renderTutBoard();
  }

  getTutLineStatus(lineArray, clues) {
    const runs = [];
    let currentRun = 0;
    for (let val of lineArray) {
      if (val === 1) {
        currentRun++;
      } else {
        if (currentRun > 0) {
          runs.push(currentRun);
          currentRun = 0;
        }
      }
    }
    if (currentRun > 0) runs.push(currentRun);

    const totalFilled = runs.reduce((a, b) => a + b, 0);
    const totalClueSum = clues.reduce((a, b) => a + b, 0);

    const isMatch = runs.length === clues.length && runs.every((r, idx) => r === clues[idx]);
    if (isMatch) {
      return 'line-satisfied';
    }

    const maxClue = Math.max(...clues, 0);
    const hasRunTooLarge = runs.some(r => r > maxClue);
    if (totalFilled > totalClueSum || hasRunTooLarge || runs.length > clues.length) {
      return 'line-error';
    }

    return '';
  }

  renderTutBoard() {
    const sampleContainer = document.getElementById('tutorial-sample-board');
    if (!sampleContainer || !this.tutClues) return;

    const { rowClues, colClues } = this.tutClues;

    let html = `
      <div class="sample-board-wrapper" style="touch-action: none; user-select: none;">
        <div class="nonogram-board-outer size-5" style="--grid-cols: 5; --grid-rows: 5">
          <div class="board-corner"></div>
          <div class="board-col-clues" style="grid-template-columns: repeat(5, 1fr)">
            ${colClues.map((c, colIdx) => {
              const colLine = [];
              for (let r = 0; r < 5; r++) colLine.push(this.tutorialSampleState[r][colIdx]);
              const status = this.getTutLineStatus(colLine, c);
              return `
                <div class="clue-col ${status}" data-tutcol="${colIdx}">
                  ${c.map(num => `<span class="clue-num">${num}</span>`).join('')}
                </div>
              `;
            }).join('')}
          </div>
          <div class="board-row-clues" style="grid-template-rows: repeat(5, 1fr)">
            ${rowClues.map((r, rowIdx) => {
              const status = this.getTutLineStatus(this.tutorialSampleState[rowIdx], r);
              return `
                <div class="clue-row ${status}" data-tutrow="${rowIdx}">
                  ${r.map(num => `<span class="clue-num">${num}</span>`).join('')}
                </div>
              `;
            }).join('')}
          </div>
          <div class="board-grid" id="tut-grid-cells" style="grid-template-columns: repeat(5, 1fr); grid-template-rows: repeat(5, 1fr)">
            ${this.tutorialSampleState.map((row, r) => 
              row.map((val, c) => {
                const isFocused = this.tutHasFocus && this.tutCursorR === r && this.tutCursorC === c;
                return `
                  <div class="board-cell ${val === 1 ? 'cell-filled' : (val === 2 ? 'cell-crossed' : 'cell-empty')} ${isFocused ? 'cell-keyboard-focus' : ''}" 
                       data-tutr="${r}" data-tutc="${c}"
                       tabindex="0"
                       style="${val === 1 ? 'background-color: #ef4444; border-color: rgba(239, 68, 68, 0.4)' : ''}">
                    ${val === 2 ? `<span class="cross-icon" style="color: var(--text-primary);">${window.ICONS && window.ICONS.cross ? window.ICONS.cross : '✕'}</span>` : ''}
                  </div>
                `;
              }).join('')
            ).join('')}
          </div>
        </div>
      </div>
    `;
    sampleContainer.innerHTML = html;

    const cells = sampleContainer.querySelectorAll('.board-cell');
    cells.forEach(cell => {
      cell.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
      });

      cell.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        const r = parseInt(cell.dataset.tutr, 10);
        const c = parseInt(cell.dataset.tutc, 10);
        this.tutHasFocus = true;
        this.tutCursorR = r;
        this.tutCursorC = c;
        const current = this.tutorialSampleState[r][c];

        let targetVal = 0;
        if (e.button === 2) {
          // Right-click: toggle cross
          targetVal = current === 2 ? 0 : 2;
          this.tutDragState = { active: true, targetVal, isRight: true };
          this.tutorialSampleState[r][c] = targetVal;
          if (targetVal === 2 && window.sounds) window.sounds.playCross();
          else if (window.sounds) window.sounds.playClick();
        } else {
          // Left-click / primary touch: follow tutMode
          if (this.tutMode === 'fill') {
            targetVal = current === 1 ? 0 : 1;
            this.tutDragState = { active: true, targetVal, isRight: false };
            this.tutorialSampleState[r][c] = targetVal;
            if (targetVal === 1 && window.sounds) window.sounds.playFill(r + c);
            else if (window.sounds) window.sounds.playClick();
          } else {
            targetVal = current === 2 ? 0 : 2;
            this.tutDragState = { active: true, targetVal, isRight: false };
            this.tutorialSampleState[r][c] = targetVal;
            if (targetVal === 2 && window.sounds) window.sounds.playCross();
            else if (window.sounds) window.sounds.playClick();
          }
        }
        this.renderTutBoard();
      });

      cell.addEventListener('pointerenter', () => {
        if (this.tutDragState && this.tutDragState.active) {
          const r = parseInt(cell.dataset.tutr, 10);
          const c = parseInt(cell.dataset.tutc, 10);
          this.tutCursorR = r;
          this.tutCursorC = c;
          this.tutorialSampleState[r][c] = this.tutDragState.targetVal;
          this.renderTutBoard();
        }
      });
    });
  }

  moveTutorialCursor(dr, dc) {
    if (!this.tutHasFocus) {
      this.tutHasFocus = true;
      this.tutCursorR = 0;
      this.tutCursorC = 0;
    } else {
      this.tutCursorR = Math.max(0, Math.min(4, this.tutCursorR + dr));
      this.tutCursorC = Math.max(0, Math.min(4, this.tutCursorC + dc));
    }
    this.renderTutBoard();
  }

  applyTutorialAction(action) {
    if (!this.tutHasFocus) {
      this.tutHasFocus = true;
      this.tutCursorR = 0;
      this.tutCursorC = 0;
    }
    const r = this.tutCursorR;
    const c = this.tutCursorC;
    const current = this.tutorialSampleState[r][c];

    if (action === 'fill') {
      const targetVal = current === 1 ? 0 : 1;
      this.tutorialSampleState[r][c] = targetVal;
      if (targetVal === 1 && window.sounds) window.sounds.playFill(r + c);
      else if (window.sounds) window.sounds.playClick();
    } else if (action === 'cross') {
      const targetVal = current === 2 ? 0 : 2;
      this.tutorialSampleState[r][c] = targetVal;
      if (targetVal === 2 && window.sounds) window.sounds.playCross();
      else if (window.sounds) window.sounds.playClick();
    } else if (action === 'clear') {
      this.tutorialSampleState[r][c] = 0;
      if (window.sounds) window.sounds.playClick();
    }
    this.renderTutBoard();
  }

  setTutorialTool(mode) {
    this.tutMode = mode;
    const fillBtn = document.getElementById('tut-tool-fill');
    const crossBtn = document.getElementById('tut-tool-cross');
    if (fillBtn && crossBtn) {
      if (mode === 'fill') {
        fillBtn.classList.add('active');
        crossBtn.classList.remove('active');
      } else {
        crossBtn.classList.add('active');
        fillBtn.classList.remove('active');
      }
    }
    if (window.sounds) window.sounds.playClick();
  }

  resetTutorialSample() {
    this.tutorialSampleState = [
      [0, 1, 0, 1, 0],
      [1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1],
      [0, 1, 1, 1, 0],
      [0, 0, 1, 0, 0]
    ];
    this.renderTutBoard();
    if (window.sounds) window.sounds.playClick();
  }

  bindWebXDC() {
    if (window.webxdc && window.webxdc.setUpdateListener) {
      window.webxdc.setUpdateListener((update) => {
        if (update.payload) {
          if (update.payload.type === 'shared_puzzle') {
            const shared = update.payload.puzzle;
            if (shared) {
              window.puzzleManager.addSharedPuzzle(shared);
              if (this.currentScreen === 'levels' && this.activeLevelCategory === 'shared') {
                this.renderLevelList('shared');
              }
            }
          }
        }
      });
    }
  }

  renderLevelList(category = this.activeLevelCategory) {
    const listEl = document.getElementById('levels-grid-list');
    if (!listEl) return;

    const puzzles = this.getFilteredPuzzles(category);
    const countBadge = document.getElementById('puzzles-found-count');
    const isFa = window.i18n ? window.i18n.getLang() === 'fa' : false;

    if (countBadge) {
      const count = puzzles ? puzzles.length : 0;
      countBadge.textContent = isFa ? `${count} پازل` : `${count} puzzle${count !== 1 ? 's' : ''}`;
    }

    if (!puzzles || puzzles.length === 0) {
      listEl.innerHTML = `
        <div class="empty-state-box" style="grid-column: 1 / -1; padding: 2.5rem 1rem; text-align: center; background: var(--bg-surface); border: 2.5px dashed var(--border-color); border-radius: var(--radius-lg); margin-top: 1rem;">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🧩</div>
          <p style="font-weight: 700; color: var(--text-muted);">${window.i18n ? window.i18n.t('noPuzzlesInCategory') : 'No puzzles found in this category'}</p>
        </div>
      `;
      const topPagerEl = document.getElementById('levels-top-pager');
      const bottomPagerEl = document.getElementById('levels-bottom-pager');
      if (topPagerEl) topPagerEl.style.display = 'none';
      if (bottomPagerEl) bottomPagerEl.style.display = 'none';
      return;
    }

    // Pagination calculations (20 cards per page)
    const totalPages = Math.ceil(puzzles.length / this.pageSize) || 1;
    if (this.currentPage > totalPages) this.currentPage = totalPages;
    if (this.currentPage < 1) this.currentPage = 1;

    const startIndex = (this.currentPage - 1) * this.pageSize;
    const pagePuzzles = puzzles.slice(startIndex, startIndex + this.pageSize);

    const completedSet = window.puzzleManager ? window.puzzleManager.completedSet : null;
    const checkmarkSvg = window.ICONS && window.ICONS.checkmark ? window.ICONS.checkmark : (window.ICONS?.check || '✓');

    listEl.innerHTML = pagePuzzles.map((puzzle, idx) => {
      const globalIdx = startIndex + idx;
      const isCompleted = completedSet ? completedSet.has(puzzle.id) : false;
      const stats = isCompleted && window.puzzleManager ? window.puzzleManager.getStats(puzzle.id) : null;
      const title = puzzle.name;
      const isMultiColor = puzzle.colorCount > 1;

      return `
        <div class="level-card ${isCompleted ? 'completed' : ''}" data-id="${puzzle.id}" data-idx="${globalIdx}">
          <div class="level-card-header">
            <span class="level-size-tag">${puzzle.cols}×${puzzle.rows}</span>
            <div style="display: flex; align-items: center; gap: 0.3rem;">
              ${puzzle.isAdult ? `<span class="level-adult-badge" title="18+ Adult">${window.i18n ? window.i18n.t('adultBadge') : '18+'}</span>` : ''}
              ${isMultiColor ? `<span class="level-color-badge" title="${puzzle.colorCount} Colors">🎨 ${puzzle.colorCount}</span>` : ''}
              ${isCompleted ? `<span class="level-badge-done" title="${window.i18n ? window.i18n.t('completed') : 'Completed'}"><span class="icon-inline">${checkmarkSvg}</span></span>` : ''}
            </div>
          </div>
          <div class="level-preview-mini" id="preview-${puzzle.id}">
            ${this.renderMiniThumbnail(puzzle, isCompleted)}
          </div>
          <div class="level-card-info" dir="ltr">
            <div class="level-card-row">
              <h4 class="level-title">${title}</h4>
              ${isCompleted && stats && stats.bestTime && stats.bestTime !== Infinity ? `
                <div class="level-best-time">
                  <span>⏱️ ${window.gameEngine.formatTime(stats.bestTime)}</span>
                </div>
              ` : ''}
            </div>
            <span class="level-category">ID: #${puzzle.numericId}</span>
          </div>
          <button class="level-play-btn" data-puzzle-id="${puzzle.id}">
            ${isCompleted ? (isFa ? 'بازی دوباره' : 'Replay') : (isFa ? 'شروع' : 'Play')}
          </button>
        </div>
      `;
    }).join('');

    // Instant synchronous canvas painting for the current visible 20 cards
    this.paintMiniThumbnails(listEl);
    this.injectIcons();

    // Render Top & Bottom Quick Pager Controls (in-place DOM updates in 0ms)
    const topPagerEl = document.getElementById('levels-top-pager');
    const bottomPagerEl = document.getElementById('levels-bottom-pager');
    this.renderPagerControls(topPagerEl, totalPages, puzzles.length, 'top');
    this.renderPagerControls(bottomPagerEl, totalPages, puzzles.length, 'bottom');
  }

  renderPagerControls(container, totalPages, totalPuzzles, position = 'top') {
    if (!container) return;
    if (this.pageSizeSetting === 'all' || totalPages <= 1) {
      if (this.pageSizeSetting === 'all') {
        const isFa = window.i18n ? window.i18n.getLang() === 'fa' : false;
        container.innerHTML = `
          <div style="font-size: 0.88rem; font-weight: 800; color: var(--text-muted); width: 100%; text-align: center;">
            ${isFa ? `📄 نمایش پیوسته تمامی ${totalPuzzles} پازل (یک‌جا)` : `📄 Continuous list view of all ${totalPuzzles} puzzles`}
          </div>
        `;
        container.style.display = 'flex';
      } else {
        container.style.display = 'none';
      }
      return;
    }

    container.style.display = 'flex';
    const selectEl = container.querySelector('.top-pager-select');
    const prevBtn = container.querySelector('.top-pager-prev-btn');
    const nextBtn = container.querySelector('.top-pager-next-btn');

    // Fast path: if select and buttons exist with matching option count, just update values instantly in 0ms
    if (selectEl && prevBtn && nextBtn && selectEl.options.length === totalPages) {
      selectEl.value = this.currentPage.toString();
      prevBtn.disabled = this.currentPage === 1;
      nextBtn.disabled = this.currentPage === totalPages;
      return;
    }

    const prevLabel = window.i18n ? window.i18n.t('pagePrev') : 'Previous';
    const nextLabel = window.i18n ? window.i18n.t('pageNext') : 'Next';

    let optionsHtml = '';
    for (let p = 1; p <= totalPages; p++) {
      optionsHtml += `<option value="${p}" ${p === this.currentPage ? 'selected' : ''}>${p} / ${totalPages}</option>`;
    }

    const prevId = `${position}-pg-prev-btn`;
    const nextId = `${position}-pg-next-btn`;
    const selectId = `${position}-pg-select`;

    container.innerHTML = `
      <div class="levels-top-pager-nav">
        <button class="top-pager-btn top-pager-prev-btn" id="${prevId}" ${this.currentPage === 1 ? 'disabled' : ''}>
          ${prevLabel}
        </button>
        <button class="top-pager-btn top-pager-next-btn" id="${nextId}" ${this.currentPage === totalPages ? 'disabled' : ''}>
          ${nextLabel}
        </button>
      </div>
      <div class="top-pager-info">
        <label for="${selectId}">${window.i18n ? (window.i18n.getLang() === 'fa' ? 'صفحه:' : 'Page:') : 'Page:'}</label>
        <select id="${selectId}" class="top-pager-select">
          ${optionsHtml}
        </select>
      </div>
    `;
  }

  scrollToGridTop() {
    const listEl = document.getElementById('levels-grid-list');
    if (listEl) {
      const rect = listEl.getBoundingClientRect();
      if (rect.top < -60) {
        window.scrollTo({ top: Math.max(0, listEl.offsetTop - 80), behavior: 'auto' });
      }
    }
  }

  renderMiniThumbnail(puzzle, isCompleted) {
    const cols = puzzle.cols;
    const rows = puzzle.rows;
    const shouldReveal = this.showResultPreview || isCompleted;
    const sizeStyle = cols >= rows
      ? `width: 100%; height: ${(rows / cols * 100).toFixed(2)}%; aspect-ratio: ${cols} / ${rows};`
      : `height: 100%; width: ${(cols / rows * 100).toFixed(2)}%; aspect-ratio: ${cols} / ${rows};`;

    if (!shouldReveal) {
      // If preview is OFF, check if puzzle is in-progress and render saved partial progress
      const progress = window.puzzleManager ? window.puzzleManager.getProgress(puzzle.id) : null;
      if (progress && progress.playerGrid && progress.playerGrid.length === rows) {
        const hasFilled = progress.playerGrid.some(row => row && row.some(v => v === CellState.FILLED));
        if (hasFilled) {
          return `<canvas class="mini-pixel-canvas in-progress" data-puzzle-id="${puzzle.id}" data-progress="true" width="${cols}" height="${rows}" style="${sizeStyle}"></canvas>`;
        }
      }
      // Mystery Blueprint Mode: Blank placeholder with SVG Question Mark
      return `<div class="mini-pixel-empty-placeholder">${window.ICONS && window.ICONS.question ? window.ICONS.question : ''}</div>`;
    }

    return `<canvas class="mini-pixel-canvas" data-puzzle-id="${puzzle.id}" width="${cols}" height="${rows}" style="${sizeStyle}"></canvas>`;
  }

  static hexToAbgr32(hex) {
    if (!hex) return 0xFF000000;
    let clean = hex.replace('#', '').trim();
    if (clean.length === 3) {
      clean = clean[0] + clean[0] + clean[1] + clean[1] + clean[2] + clean[2];
    }
    const num = parseInt(clean, 16);
    if (isNaN(num)) return 0xFF000000;
    const r = (num >> 16) & 0xFF;
    const g = (num >> 8) & 0xFF;
    const b = num & 0xFF;
    return ((0xFF << 24) | (b << 16) | (g << 8) | r) >>> 0;
  }

  paintSingleCanvas(canvas, isDark) {
    if (!canvas || !canvas.isConnected) return;
    const pid = canvas.dataset.puzzleId;
    const isProgress = canvas.dataset.progress === 'true';
    const puzzle = window.puzzleManager ? window.puzzleManager.getPuzzleById(pid) : null;
    if (!puzzle) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const cols = puzzle.cols;
    const rows = puzzle.rows;
    if (canvas.width !== cols) canvas.width = cols;
    if (canvas.height !== rows) canvas.height = rows;

    const isMultiColor = puzzle.colorCount > 1 && puzzle.palette && puzzle.palette.length > 1;
    const palette32 = (puzzle.palette || ['#000000']).map(App.hexToAbgr32);
    const mono32 = isDark ? 0xFF00E6FF : 0xFF000000;

    if (isProgress) {
      const prog = window.puzzleManager.getProgress(puzzle.id);
      if (!prog || !prog.playerGrid) return;

      try {
        const imgData = ctx.createImageData(cols, rows);
        const buf32 = new Uint32Array(imgData.data.buffer);
        for (let r = 0; r < rows; r++) {
          const pRow = prog.playerGrid[r];
          if (!pRow) continue;
          const rOffset = r * cols;
          for (let c = 0; c < cols; c++) {
            if (pRow[c] === CellState.FILLED) {
              if (isMultiColor) {
                const cIdx = (prog.playerColorGrid && prog.playerColorGrid[r]) ? prog.playerColorGrid[r][c] : 0;
                buf32[rOffset + c] = palette32[cIdx] || 0xFF000000;
              } else {
                buf32[rOffset + c] = mono32;
              }
            }
          }
        }
        ctx.putImageData(imgData, 0, 0);
      } catch (err) {
        ctx.clearRect(0, 0, cols, rows);
        for (let r = 0; r < rows; r++) {
          const pRow = prog.playerGrid[r];
          if (!pRow) continue;
          for (let c = 0; c < cols; c++) {
            if (pRow[c] === CellState.FILLED) {
              const cIdx = (prog.playerColorGrid && prog.playerColorGrid[r]) ? prog.playerColorGrid[r][c] : 0;
              ctx.fillStyle = isMultiColor ? (puzzle.palette[cIdx] || '#000000') : (isDark ? '#00e6ff' : '#000000');
              ctx.fillRect(c, r, 1, 1);
            }
          }
        }
      }
    } else {
      const solution = puzzle._solutionGrid || puzzle.solution;
      if (solution) {
        try {
          const imgData = ctx.createImageData(cols, rows);
          const buf32 = new Uint32Array(imgData.data.buffer);
          for (let r = 0; r < rows; r++) {
            const row = solution[r];
            if (!row) continue;
            const rOffset = r * cols;
            for (let c = 0; c < cols; c++) {
              const val = row[c];
              if (val > 0) {
                buf32[rOffset + c] = isMultiColor ? (palette32[val - 1] || 0xFF000000) : mono32;
              }
            }
          }
          ctx.putImageData(imgData, 0, 0);
        } catch (err) {
          ctx.clearRect(0, 0, cols, rows);
          for (let r = 0; r < rows; r++) {
            const row = solution[r];
            if (!row) continue;
            for (let c = 0; c < cols; c++) {
              const val = row[c];
              if (val > 0) {
                ctx.fillStyle = isMultiColor ? (puzzle.palette[val - 1] || '#000000') : (isDark ? '#00e6ff' : '#000000');
                ctx.fillRect(c, r, 1, 1);
              }
            }
          }
        }
      } else if (window.NonogramEngine && typeof window.NonogramEngine.getPuzzleSolutionAsync === 'function') {
        window.NonogramEngine.getPuzzleSolutionAsync(puzzle).then(solved => {
          if (solved && canvas.isConnected) {
            puzzle._solutionGrid = solved;
            puzzle.solution = solved;
            this.paintSingleCanvas(canvas, isDark);
          }
        });
      }
    }
  }

  paintMiniThumbnails(container) {
    if (!container) return;
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    const canvases = container.querySelectorAll('canvas.mini-pixel-canvas');
    if (!canvases || canvases.length === 0) return;

    for (let i = 0; i < canvases.length; i++) {
      this.paintSingleCanvas(canvases[i], isDark);
    }
  }

  startPuzzle(puzzle, origin = 'levels') {
    this.gameOriginScreen = origin;
    this.wasRunningBeforeSettings = false;
    window.gameEngine.loadPuzzle(puzzle);
    this.showScreen('game');
  }

  playNextLevel() {
    const list = window.puzzleManager.getPuzzlesByCategory(this.activeLevelCategory, this.searchQuery);
    const currentIdx = list.findIndex(p => p.id === window.gameEngine.puzzle.id);
    if (currentIdx !== -1 && currentIdx + 1 < list.length) {
      this.startPuzzle(list[currentIdx + 1]);
    } else {
      this.showScreen('levels');
    }
  }

  shareVictory() {
    const p = window.gameEngine.puzzle;
    const timeStr = window.gameEngine.formatTime(window.gameEngine.timerSeconds);
    const isFa = window.i18n ? window.i18n.getLang() === 'fa' : false;
    const pName = p.name;
    const isZen = window.gameEngine.maxMistakes === Infinity;
    const mistakes = window.gameEngine.mistakes;
    const hints = window.gameEngine.hintsUsed || 0;

    let text = '';
    if (isFa) {
      const parts = [];
      if (!isZen) {
        parts.push(`${mistakes} خطا`);
      }
      if (hints > 0) {
        parts.push(`${hints} راهنمایی`);
      }
      const details = parts.length > 0 ? ` (با ${parts.join(' و ')})` : '';
      text = `🧩 بازی نونوگرام: پازل "${pName}" (${p.cols}×${p.rows}) را در زمان ${timeStr}${details} حل کردم! 🎉`;
    } else {
      const parts = [];
      if (!isZen) {
        parts.push(`${mistakes} mistakes`);
      }
      if (hints > 0) {
        parts.push(`${hints} hints`);
      }
      const details = parts.length > 0 ? ` with ${parts.join(' and ')}` : '';
      text = `🧩 nonograms: Solved "${pName}" (${p.cols}x${p.rows}) in ${timeStr}${details}! 🎉`;
    }

    // Try to generate a beautiful PNG using canvas
    try {
      const solution = (window.NonogramEngine && typeof window.NonogramEngine.getPuzzleSolution === 'function')
        ? window.NonogramEngine.getPuzzleSolution(p)
        : null;

      if (solution) {
        // Theme color definitions based on active document theme
        const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
        const themeBg = isDark ? '#111215' : '#e8ecf2';
        const cardBg = isDark ? '#20222a' : '#f8fafc';
        const elementBg = isDark ? '#2c2f3b' : '#ffffff';
        const textPrimary = isDark ? '#ffffff' : '#000000';
        const textMuted = isDark ? '#94a3b8' : '#52525b';
        const accentColor = '#ffe600';

        // Layout Constants
        const cardWidth = 360;
        const canvasPadding = 24;
        const canvasWidth = cardWidth + canvasPadding * 2;

        const maxArtDim = 240;
        const cellScale = Math.max(8, Math.min(16, Math.floor(maxArtDim / Math.max(p.cols, p.rows))));
        const artWidth = p.cols * cellScale;
        const artHeight = p.rows * cellScale;

        const previewBoxPadding = 16;
        const previewBoxWidth = artWidth + previewBoxPadding * 2;
        const previewBoxHeight = artHeight + previewBoxPadding * 2;

        // Vertically lay out the card inside the padding
        const cardX = canvasPadding;
        const cardY = canvasPadding;

        const hasId = Boolean(p.id && !p.id.startsWith('random_'));
        const cleanId = hasId ? p.id.replace('nono_', '') : '';
        const displayId = hasId ? `#${cleanId}` : '';

        const titleY = cardY + 28; // "nonograms" center Y
        const subtitleY = titleY + 28; // "[Puzzle Name]" center Y

        const previewBoxX = cardX + (cardWidth - previewBoxWidth) / 2;
        const previewBoxY = subtitleY + 16 + 8; // Top of the preview box

        const statsGridX = cardX + 24;
        const statsGridY = previewBoxY + previewBoxHeight + 20;
        const statsGridWidth = cardWidth - 48;
        const statsGridHeight = 70;

        const cardHeight = statsGridY + statsGridHeight + 24 - cardY;

        // If ID is present, place it under the card in the canvas footer
        const idY = hasId ? (cardY + cardHeight + 16) : 0;
        const canvasHeight = hasId ? (idY + 16 + 8) : (cardHeight + canvasPadding * 2);

        // Initialize Canvas
        const canvas = document.createElement('canvas');
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        const ctx = canvas.getContext('2d');

        // Draw Canvas Background
        ctx.fillStyle = themeBg;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Helper: Draw Neo-Brutalist Rounded Rectangle (fill + stroke + shadow)
        const drawNeoRect = (x, y, w, h, r, fill, shadowOffset) => {
          // Shadow first
          ctx.fillStyle = '#000000';
          drawRoundedRect(x + shadowOffset, y + shadowOffset, w, h, r);
          ctx.fill();

          // Main surface
          ctx.fillStyle = fill;
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 2.5;
          drawRoundedRect(x, y, w, h, r);
          ctx.fill();
          ctx.stroke();
        };

        const drawRoundedRect = (x, y, w, h, r) => {
          if (w < 2 * r) r = w / 2;
          if (h < 2 * r) r = h / 2;
          ctx.beginPath();
          ctx.moveTo(x + r, y);
          ctx.arcTo(x + w, y, x + w, y + h, r);
          ctx.arcTo(x + w, y + h, x, y + h, r);
          ctx.arcTo(x, y + h, x, y, r);
          ctx.arcTo(x, y, x + w, y, r);
          ctx.closePath();
        };

        // Draw Main Card Box
        drawNeoRect(cardX, cardY, cardWidth, cardHeight, 12, cardBg, 5);

        // Draw Header: "nonograms"
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = textPrimary;
        ctx.font = '900 24px system-ui, -apple-system, sans-serif';
        ctx.fillText('nonograms', cardX + cardWidth / 2, titleY);

        // Draw Subtitle / Puzzle Name
        let subtitleText = pName;
        if (p.id && p.id.startsWith('random_') && p.difficulty) {
          let diffStr = "";
          if (p.difficulty === 'easy') diffStr = isFa ? "ساده" : "Easy";
          else if (p.difficulty === 'medium') diffStr = isFa ? "متوسط" : "Medium";
          else if (p.difficulty === 'hard') diffStr = isFa ? "سخت" : "Hard";
          
          subtitleText = `${pName} (${diffStr})`;
        }

        ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
        ctx.fillStyle = isDark ? accentColor : '#000000';
        ctx.fillText(subtitleText, cardX + cardWidth / 2, subtitleY, cardWidth - 48);

        // Draw Puzzle ID centered below the main card at the bottom of the canvas
        if (hasId) {
          ctx.font = 'bold 12px system-ui, -apple-system, sans-serif';
          ctx.fillStyle = textMuted;
          ctx.fillText(displayId, canvasWidth / 2, idY, canvasWidth - 48);
        }

        // Draw Solved Pixel Art Box (victory-preview-box)
        drawNeoRect(previewBoxX, previewBoxY, previewBoxWidth, previewBoxHeight, 8, elementBg, 3);

        // Draw Solved Pixel Art inside preview box
        const artStartX = previewBoxX + previewBoxPadding;
        const artStartY = previewBoxY + previewBoxPadding;
        const isMultiColor = p.colorCount > 1 && p.palette && p.palette.length > 1;

        for (let r = 0; r < p.rows; r++) {
          for (let c = 0; c < p.cols; c++) {
            const val = solution[r][c];
            if (val > 0) {
              let color = '#2563eb'; // fallback blue
              if (isMultiColor) {
                const colorIdx = val - 1;
                color = (p.palette && p.palette[colorIdx]) ? p.palette[colorIdx] : '#2563eb';
              } else {
                color = isDark ? accentColor : '#000000'; // theme matched Monochrome
              }
              ctx.fillStyle = color;
              ctx.fillRect(artStartX + c * cellScale, artStartY + r * cellScale, cellScale - 0.5, cellScale - 0.5);
            }
          }
        }

        // Draw Modal Stats Grid (modal-stats-grid)
        drawNeoRect(statsGridX, statsGridY, statsGridWidth, statsGridHeight, 8, elementBg, 3);

        const statsList = [
          {
            label: isFa ? "زمان" : "TIME",
            value: timeStr,
            color: textPrimary
          }
        ];

        if (!isZen) {
          statsList.push({
            label: isFa ? "خطاها" : "MISTAKES",
            value: `${mistakes}`,
            color: mistakes > 0 ? '#ff4757' : textPrimary
          });
        }

        if (hints > 0) {
          statsList.push({
            label: isFa ? "راهنمایی" : "HINTS",
            value: `${hints}`,
            color: textPrimary
          });
        }

        const statCount = statsList.length;
        statsList.forEach((stat, idx) => {
          const centerX = statsGridX + (statsGridWidth / (statCount * 2)) * (1 + idx * 2);

          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
          ctx.fillStyle = textMuted;
          ctx.fillText(stat.label, centerX, statsGridY + 22);

          ctx.font = '900 20px system-ui, -apple-system, sans-serif';
          ctx.fillStyle = stat.color;
          ctx.fillText(stat.value, centerX, statsGridY + 46);
        });

        const dataUrl = canvas.toDataURL('image/png');
        const base64Data = dataUrl.split(',')[1];

        if (window.webxdc && typeof window.webxdc.sendToChat === 'function') {
          window.webxdc.sendToChat({
            file: { name: `nonogram_${p.id}.png`, base64: base64Data },
            text: text
          });
          return;
        } else {
          // Download the image as fallback if not in a real webxdc environment
          const link = document.createElement('a');
          link.href = dataUrl;
          link.download = `nonogram_${p.id}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      }
    } catch (err) {
      console.error('Error rendering sharing image:', err);
    }

    // Fallback to clipboard if sendToChat is not available
    navigator.clipboard.writeText(text).then(() => {
      alert(window.i18n ? window.i18n.t('copiedToClipboard') : 'Copied result to clipboard!');
    });
  }

  updateHomeContinueButton() {
    const continueBtn = document.getElementById('home-continue-btn');
    const continueSub = document.getElementById('home-continue-subtitle');
    if (!continueBtn) return;

    const activePuzzle = window.puzzleManager ? window.puzzleManager.getActivePuzzle() : null;
    if (activePuzzle) {
      const progress = window.puzzleManager.getProgress(activePuzzle.id);
      if (progress && progress.playerGrid && !progress.isWon && !progress.isGameOver) {
        continueBtn.classList.remove('hidden');
        const isFa = window.i18n ? window.i18n.getLang() === 'fa' : false;
        const pName = activePuzzle.name || '';
        const cols = activePuzzle.cols || activePuzzle.width || 10;
        const rows = activePuzzle.rows || activePuzzle.height || 10;
        if (continueSub) {
          continueSub.textContent = isFa
            ? `${pName} (${cols}×${rows})`
            : `${pName} (${cols}x${rows})`;
        }
        return;
      }
    }
    continueBtn.classList.add('hidden');
  }
}

// Bootstrap app on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  window.app = app;
  app.init();
});
