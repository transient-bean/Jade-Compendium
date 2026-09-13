import { CLASSES, CLASS_MAP } from '../../data/classes.ts';
import { Faction, ClassMetadata, Character } from '../../types/skill.ts';
import { SkillPentagon } from './SkillPentagon.ts';
import { StorageManager } from '../../engine/StorageManager.ts';

export interface HeaderCallbacks {
  onSelectClass: (classId: string) => void;
  onSelectMode: (mode: 'home' | 'planner') => void;
  onOpenCharacterModal?: () => void;
}

export class Header {
  private container: HTMLElement;
  private callbacks: HeaderCallbacks;
  private currentFaction: Faction = 'human';
  private currentClassId = 'jadeon';
  private currentMode: 'home' | 'planner' = 'home';
  private activeCharacter: Character | null = null;

  constructor(container: HTMLElement, callbacks: HeaderCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.activeCharacter = StorageManager.getActiveCharacter();
    this.render();
  }

  public setClass(classId: string) {
    this.currentClassId = classId;
    const meta = CLASS_MAP.get(classId);
    if (meta) {
      this.currentFaction = meta.faction;
    }
    this.activeCharacter = StorageManager.getActiveCharacter();
    this.render();
  }

  public setMode(mode: 'home' | 'planner') {
    this.currentMode = mode;
    this.activeCharacter = StorageManager.getActiveCharacter();
    this.render();
  }

  public setActiveCharacter(char: Character | null) {
    this.activeCharacter = char;
    this.render();
  }

  public render() {
    const currentClassMeta = CLASS_MAP.get(this.currentClassId) || CLASSES[0];
    const filteredClasses = CLASSES.filter(c => c.faction === this.currentFaction);
    const isPlanner = this.currentMode === 'planner';
    const charName = this.activeCharacter?.name || 'My Character';

    this.container.innerHTML = `
      <!-- Top Site Header -->
      <header class="site-header">
        <div class="header-top">
          <div class="brand-area" id="brand-home" title="Return to Home Screen" style="cursor: pointer;">
            <svg class="brand-emblem" viewBox="0 0 64 64">
              <defs>
                <radialGradient id="hJade" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stop-color="#7ac9af" />
                  <stop offset="60%" stop-color="#2d5244" />
                  <stop offset="100%" stop-color="#0f1915" />
                </radialGradient>
              </defs>
              <circle cx="32" cy="32" r="28" fill="url(#hJade)" stroke="#dfc27d" stroke-width="2.5"/>
              <polygon points="32,10 52,32 32,54 12,32" fill="none" stroke="#fff0be" stroke-width="1.8"/>
              <circle cx="32" cy="32" r="7" fill="none" stroke="#dfc27d" stroke-width="1.5"/>
            </svg>
            <div class="brand-text">
              <h1>Jade Compendium</h1>
              <div class="brand-subtitle">Jade Dynasty Database & Build Planner</div>
            </div>
          </div>

          <!-- Top Actions & Navigation Modes -->
          <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
            ${isPlanner ? `
              <button class="character-pill-btn" id="header-char-btn" title="Switch or manage characters">
                <span class="char-pill-icon">👤</span>
                <span class="char-pill-name">${charName}</span>
                <span class="char-pill-arrow">▾</span>
              </button>
            ` : ''}

            <div class="nav-modes">
              <button class="mode-tab ${this.currentMode === 'home' ? 'active' : ''}" id="mode-home">
                🏛️ Home
              </button>
              <button class="mode-tab ${this.currentMode === 'planner' ? 'active' : ''}" id="mode-planner">
                ⚔️ Skill Planner
              </button>
              <button class="mode-tab disabled" id="mode-compendium" disabled title="WIP">
                📜 Compendium <span style="font-size: 0.65rem; opacity: 0.75; margin-left: 4px; padding: 1px 5px; border-radius: 3px; background: rgba(255,255,255,0.08); vertical-align: middle;">Soon</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      ${isPlanner ? `
        <!-- Faction and Class Navigation Bar -->
        <section class="class-selector-section">
          <div class="selector-inner">
            <!-- Faction Selector with Diamond Character Crests -->
            <div class="faction-tabs">
              <button class="faction-btn ${this.currentFaction === 'human' ? 'active' : ''}" id="tab-faction-human">
                <div class="faction-diamond"><span>◈</span></div>
                <span class="faction-title">Human</span>
                <span class="faction-count">6 Classes</span>
              </button>
              <button class="faction-btn ${this.currentFaction === 'athan' ? 'active' : ''}" id="tab-faction-athan">
                <div class="faction-diamond"><span>❖</span></div>
                <span class="faction-title">Athan</span>
                <span class="faction-count">6 Classes</span>
              </button>
            </div>

            <!-- Class Selection Pills -->
            <div class="class-grid" id="class-cards-container">
              ${filteredClasses.map(c => this.renderClassCard(c)).join('')}
            </div>
          </div>
        </section>

        <!-- Class Banner Bar with Skill Pentagon -->
        <section class="class-banner-bar">
          <div class="class-summary-left">
            ${this.renderCrest(currentClassMeta, 'class-large-crest')}
            <div class="class-info-details">
              <h2>
                <span>${currentClassMeta.name}</span>
                <span class="title-sub">— ${currentClassMeta.title}</span>
              </h2>
              <p><strong>Role:</strong> ${currentClassMeta.role} | <strong>Weapon:</strong> ${currentClassMeta.weapon}</p>
              <p>${currentClassMeta.description}</p>
            </div>
          </div>
          <div class="class-summary-right" title="Class Combat & Resistance Radar">
            <div class="header-radar-box">
              ${SkillPentagon.renderSVG(currentClassMeta.stats, 155)}
              <button class="jd-btn btn-sm btn-stats-overview" id="header-btn-stats-overview" title="Toggle detailed stat attributes">
                📊 Stats Overview
              </button>
            </div>
            <div class="class-stats-overview-drawer header-stats-drawer" id="header-stats-drawer" style="display: none;">
              ${SkillPentagon.renderStatsOverview(currentClassMeta.stats)}
            </div>
          </div>
        </section>
      ` : ''}
    `;

    // Wire events
    this.container.querySelector('#brand-home')?.addEventListener('click', () => {
      this.callbacks.onSelectMode('home');
    });

    this.container.querySelector('#mode-home')?.addEventListener('click', () => {
      this.callbacks.onSelectMode('home');
    });

    this.container.querySelector('#mode-planner')?.addEventListener('click', () => {
      this.callbacks.onSelectMode('planner');
    });

    this.container.querySelector('#header-char-btn')?.addEventListener('click', () => {
      this.callbacks.onOpenCharacterModal?.();
    });

    this.container.querySelector('#tab-faction-human')?.addEventListener('click', () => {
      if (this.currentFaction !== 'human') {
        this.currentFaction = 'human';
        const firstHuman = CLASSES.find(c => c.faction === 'human');
        if (firstHuman) {
          this.callbacks.onSelectClass(firstHuman.id);
        }
      }
    });

    this.container.querySelector('#tab-faction-athan')?.addEventListener('click', () => {
      if (this.currentFaction !== 'athan') {
        this.currentFaction = 'athan';
        const firstAthan = CLASSES.find(c => c.faction === 'athan');
        if (firstAthan) {
          this.callbacks.onSelectClass(firstAthan.id);
        }
      }
    });

    this.container.querySelectorAll('.class-card').forEach(el => {
      el.addEventListener('click', () => {
        const id = (el as HTMLElement).dataset.classId;
        if (id) {
          this.callbacks.onSelectClass(id);
        }
      });
    });

    this.container.querySelector('#header-btn-stats-overview')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const drawer = this.container.querySelector('#header-stats-drawer') as HTMLElement;
      const btn = this.container.querySelector('#header-btn-stats-overview') as HTMLElement;
      if (drawer && btn) {
        const isHidden = drawer.style.display === 'none';
        drawer.style.display = isHidden ? 'block' : 'none';
        btn.classList.toggle('active', isHidden);
      }
    });
  }

  private renderCrest(c: ClassMetadata, className: string): string {
    if (c.spriteCoords && c.sprite) {
      const base = import.meta.env.BASE_URL || './';
      const cleanSprite = c.sprite.replace(/^\.?\//, '');
      const spritePath = `${base}${cleanSprite}`;
      return `
        <div class="${className}" style="
          background-image: url('${spritePath}');
          background-position: -${c.spriteCoords.x}px -${c.spriteCoords.y}px;
          background-repeat: no-repeat;
          background-size: auto;
        "></div>
      `;
    }
    return `<img class="${className}" src="${c.crestIcon}" alt="${c.name}" />`;
  }

  private renderClassCard(c: ClassMetadata): string {
    const isActive = c.id === this.currentClassId;
    return `
      <div class="class-card ${isActive ? 'active' : ''}" data-class-id="${c.id}">
        <div class="class-icon-wrapper">
          ${this.renderCrest(c, 'class-icon-img')}
        </div>
        <div class="class-name-col">
          <span class="class-name-en">${c.name}</span>
        </div>
        <span class="badge-available">Available</span>
      </div>
    `;
  }
}
