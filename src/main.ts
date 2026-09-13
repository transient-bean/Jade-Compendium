import './ui/styles/theme.css';
import './ui/styles/main.css';
import './ui/styles/skill-tree.css';
import './ui/styles/tooltip.css';
import './ui/styles/saved-builds.css';
import './ui/styles/home.css';

import { ALL_CLASS_DEFINITIONS } from './data/skills/index.ts';
import { SkillEngine } from './engine/SkillEngine.ts';
import { UrlSerializer } from './engine/UrlSerializer.ts';
import { StorageManager } from './engine/StorageManager.ts';
import { Header } from './ui/components/Header.ts';
import { HomeView } from './ui/components/HomeView.ts';
import { SkillTreeRenderer } from './ui/components/SkillTreeRenderer.ts';
import { TomeTreeRenderer } from './ui/components/TomeTreeRenderer.ts';
import { PointsTracker } from './ui/components/PointsTracker.ts';
import { BuildManagerModal } from './ui/components/BuildManagerModal.ts';
import { SavedBuild, Character } from './types/skill.ts';

class JadeApp {
  private currentClassId = 'jadeon';
  private currentMode: 'home' | 'planner' = 'home';
  private engine!: SkillEngine;

  private header!: Header;
  private homeView!: HomeView;
  private treeRenderer!: SkillTreeRenderer;
  private tomeTreeRenderer!: TomeTreeRenderer;
  private pointsTracker!: PointsTracker;
  private buildManagerModal!: BuildManagerModal;

  private mainViewportEl!: HTMLElement;
  private homeContainerEl!: HTMLElement;
  private plannerContainerEl!: HTMLElement;
  private skillTreeContainerEl!: HTMLElement;
  private tomeTreeContainerEl!: HTMLElement;

  private isSyncingUrl = false;

  constructor() {
    this.init();
  }

  private init() {
    const root = document.getElementById('app')!;
    root.className = 'app-container';

    // 1. Determine Initial Mode, Character & Build Allocation
    const hash = window.location.hash;
    const decodedUrl = UrlSerializer.decode(hash);

    let initialMode: 'home' | 'planner' = 'home';
    if (decodedUrl && ALL_CLASS_DEFINITIONS[decodedUrl.classId]) {
      this.currentClassId = decodedUrl.classId;
      initialMode = 'planner';
    } else if (hash === '#/planner') {
      initialMode = 'planner';
    }

    const activeChar = StorageManager.getActiveCharacter();
    if (activeChar && initialMode === 'planner' && !decodedUrl) {
      this.currentClassId = activeChar.classId;
    } else if (!decodedUrl) {
      const lastClass = StorageManager.getLastClass();
      if (lastClass && ALL_CLASS_DEFINITIONS[lastClass]) {
        this.currentClassId = lastClass;
      }
    }

    const initialDef = ALL_CLASS_DEFINITIONS[this.currentClassId] || ALL_CLASS_DEFINITIONS['jadeon'];
    const initialSkillAlloc = decodedUrl?.allocation || activeChar?.allocation || {};
    const initialTomeAlloc = decodedUrl?.tomeAllocation || activeChar?.tomeAllocation || {};

    // 2. Initialize Engine
    this.engine = new SkillEngine(initialDef, initialSkillAlloc, initialTomeAlloc);

    // 3. Mount UI Containers
    const headerContainer = document.createElement('div');
    root.appendChild(headerContainer);

    this.mainViewportEl = document.createElement('main');
    this.mainViewportEl.className = 'main-viewport';
    root.appendChild(this.mainViewportEl);

    // Home Container
    this.homeContainerEl = document.createElement('div');
    this.mainViewportEl.appendChild(this.homeContainerEl);

    // Planner Container
    this.plannerContainerEl = document.createElement('div');
    this.plannerContainerEl.className = 'planner-wrapper';
    this.plannerContainerEl.style.display = 'none';
    this.mainViewportEl.appendChild(this.plannerContainerEl);

    const pointsTrackerContainer = document.createElement('div');
    this.plannerContainerEl.appendChild(pointsTrackerContainer);

    // Section header for Faction Skills
    const skillsHeaderEl = document.createElement('div');
    skillsHeaderEl.className = 'planner-section-title-bar';
    skillsHeaderEl.id = 'skills-section-anchor';
    skillsHeaderEl.innerHTML = `
      <div class="section-title-left">
        <span class="section-title-icon">⚔️</span>
        <div>
          <h2 class="section-title-text">Faction Skills</h2>
          <span class="section-title-sub">Initiate through Tier 5 • 150 Points Maximum</span>
        </div>
      </div>
      <div class="section-title-right">
        <button class="jd-btn btn-sm" id="btn-jump-to-tomes-anchor" title="Scroll down to Tomes">
          📜 Jump to Tomes ↓
        </button>
      </div>
    `;
    this.plannerContainerEl.appendChild(skillsHeaderEl);

    // Skills Tree Container
    this.skillTreeContainerEl = document.createElement('div');
    this.skillTreeContainerEl.className = 'tree-view-wrapper skills-tree-wrapper';
    this.plannerContainerEl.appendChild(this.skillTreeContainerEl);

    // Section header for Tomes
    const tomesHeaderEl = document.createElement('div');
    tomesHeaderEl.className = 'planner-section-title-bar';
    tomesHeaderEl.id = 'tomes-section-anchor';
    tomesHeaderEl.style.marginTop = '28px';
    tomesHeaderEl.innerHTML = `
      <div class="section-title-left">
        <span class="section-title-icon">📜</span>
        <div>
          <h2 class="section-title-text">Tomes</h2>
          <span class="section-title-sub">Books 1, 2 & 3 • 48 Points Maximum • Passive Synergies</span>
        </div>
      </div>
      <div class="section-title-right">
        <button class="jd-btn btn-sm" id="btn-jump-to-skills-anchor" title="Scroll up to Faction Skills">
          ⚔️ Jump to Faction Skills ↑
        </button>
      </div>
    `;
    this.plannerContainerEl.appendChild(tomesHeaderEl);

    // Tomes Tree Container
    this.tomeTreeContainerEl = document.createElement('div');
    this.tomeTreeContainerEl.className = 'tree-view-wrapper tomes-tree-wrapper';
    this.plannerContainerEl.appendChild(this.tomeTreeContainerEl);

    skillsHeaderEl.querySelector('#btn-jump-to-tomes-anchor')?.addEventListener('click', () => {
      tomesHeaderEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    tomesHeaderEl.querySelector('#btn-jump-to-skills-anchor')?.addEventListener('click', () => {
      skillsHeaderEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    // 4. Initialize Components
    this.buildManagerModal = new BuildManagerModal(this.engine, this.onLoadSavedBuild.bind(this));

    this.header = new Header(headerContainer, {
      onSelectClass: this.switchClass.bind(this),
      onSelectMode: this.switchMode.bind(this),
      onOpenCharacterModal: () => {
        this.switchMode('home');
        this.homeView.openCreateModal(this.currentClassId);
      }
    });
    this.header.setClass(this.currentClassId);

    this.homeView = new HomeView(this.homeContainerEl, {
      onSelectCharacter: (char: Character) => {
        this.loadCharacter(char);
      },
      onSelectClass: (classId: string) => {
        this.switchClass(classId);
        this.switchMode('planner');
      },
      onNavigateToPlanner: () => {
        this.switchMode('planner');
      }
    });

    this.pointsTracker = new PointsTracker(
      pointsTrackerContainer,
      this.engine,
      () => this.buildManagerModal.open()
    );

    this.treeRenderer = new SkillTreeRenderer(this.skillTreeContainerEl, this.engine);
    this.tomeTreeRenderer = new TomeTreeRenderer(this.tomeTreeContainerEl, this.engine);

    // 5. Engine State Changes -> AutoSave & URL Hash sync
    this.engine.subscribe(() => {
      // Both trees are always visible on the same page
      this.skillTreeContainerEl.style.display = 'block';
      this.tomeTreeContainerEl.style.display = 'block';

      const classDef = this.engine.getClassDefinition();
      const alloc = this.engine.getAllocation();
      const tomeAlloc = this.engine.getTomeAllocation();

      // Update active character & legacy autosave
      const currentActiveChar = StorageManager.getActiveCharacter();
      if (currentActiveChar && currentActiveChar.classId === classDef.id) {
        StorageManager.updateCharacter(currentActiveChar.id, alloc, tomeAlloc);
      }
      StorageManager.autoSave(classDef.id, alloc, tomeAlloc);

      if (this.isSyncingUrl || this.currentMode !== 'planner') return;

      const hash = UrlSerializer.encode(classDef, alloc, tomeAlloc);
      if (window.location.hash !== hash) {
        history.replaceState(null, '', hash);
      }
    });

    // 6. Set Initial Mode
    this.switchMode(initialMode);

    // 7. Listen for Browser Back/Forward / Hash Changes
    window.addEventListener('hashchange', this.onHashChange.bind(this));
  }

  private loadCharacter(char: Character) {
    StorageManager.setActiveCharacterId(char.id);
    this.currentClassId = char.classId;
    StorageManager.setLastClass(char.classId);

    const newDef = ALL_CLASS_DEFINITIONS[char.classId] || ALL_CLASS_DEFINITIONS['jadeon'];
    this.isSyncingUrl = true;
    this.engine.setClassDefinition(newDef, char.allocation || {}, char.tomeAllocation || {});
    this.isSyncingUrl = false;

    this.header.setClass(char.classId);
    this.header.setActiveCharacter(char);
    this.pointsTracker.setEngine(this.engine);
    this.treeRenderer.setEngine(this.engine);
    this.tomeTreeRenderer.setEngine(this.engine);
    this.buildManagerModal.setEngine(this.engine);

    this.switchMode('planner');
  }

  private switchClass(classId: string) {
    if (!ALL_CLASS_DEFINITIONS[classId]) return;
    this.currentClassId = classId;
    StorageManager.setLastClass(classId);

    // Check if we have an active character matching this class
    let activeChar = StorageManager.getActiveCharacter();
    let savedAlloc = {};
    let savedTomeAlloc = {};

    if (activeChar && activeChar.classId === classId) {
      savedAlloc = activeChar.allocation || {};
      savedTomeAlloc = activeChar.tomeAllocation || {};
    } else {
      // Find a character of this class or check autosave
      const charOfClass = StorageManager.getCharacters().find(c => c.classId === classId);
      if (charOfClass) {
        StorageManager.setActiveCharacterId(charOfClass.id);
        activeChar = charOfClass;
        savedAlloc = charOfClass.allocation || {};
        savedTomeAlloc = charOfClass.tomeAllocation || {};
      } else {
        const saved = StorageManager.getAutoSave(classId);
        savedAlloc = saved?.allocation || {};
        savedTomeAlloc = saved?.tomeAllocation || {};
      }
    }

    const newDef = ALL_CLASS_DEFINITIONS[classId];

    this.isSyncingUrl = true;
    this.engine.setClassDefinition(newDef, savedAlloc, savedTomeAlloc);
    this.isSyncingUrl = false;

    this.header.setClass(classId);
    this.header.setActiveCharacter(activeChar);
    this.pointsTracker.setEngine(this.engine);
    this.treeRenderer.setEngine(this.engine);
    this.tomeTreeRenderer.setEngine(this.engine);
    this.buildManagerModal.setEngine(this.engine);

    if (this.currentMode === 'planner') {
      const newHash = UrlSerializer.encode(
        newDef,
        this.engine.getAllocation(),
        this.engine.getTomeAllocation()
      );
      history.replaceState(null, '', newHash);
    }
  }

  private switchMode(mode: 'home' | 'planner') {
    this.currentMode = mode;
    this.header.setMode(mode);

    if (mode === 'home') {
      this.homeContainerEl.style.display = 'block';
      this.plannerContainerEl.style.display = 'none';
      this.homeView.render();
      if (window.location.hash !== '#/home') {
        history.replaceState(null, '', '#/home');
      }
    } else {
      this.homeContainerEl.style.display = 'none';
      this.plannerContainerEl.style.display = 'flex';
      const hash = UrlSerializer.encode(
        this.engine.getClassDefinition(),
        this.engine.getAllocation(),
        this.engine.getTomeAllocation()
      );
      history.replaceState(null, '', hash);
    }
  }

  private onLoadSavedBuild(build: SavedBuild) {
    this.switchClass(build.classId);
    this.engine.setAllocation(build.allocation, build.tomeAllocation || {});
  }

  private onHashChange() {
    const hash = window.location.hash;
    if (hash === '#/home') {
      if (this.currentMode !== 'home') this.switchMode('home');
      return;
    }

    const decoded = UrlSerializer.decode(hash);
    if (!decoded) return;

    if (decoded.classId !== this.currentClassId) {
      this.switchClass(decoded.classId);
    }

    this.isSyncingUrl = true;
    this.engine.setAllocation(decoded.allocation, decoded.tomeAllocation || {});
    this.isSyncingUrl = false;
  }
}

// Bootstrap
window.addEventListener('DOMContentLoaded', () => {
  new JadeApp();
});
