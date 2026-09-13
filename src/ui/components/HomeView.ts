import { CLASSES, CLASS_MAP } from '../../data/classes.ts';
import { ClassMetadata, Character, Faction } from '../../types/skill.ts';
import { StorageManager } from '../../engine/StorageManager.ts';
import { SkillPentagon } from './SkillPentagon.ts';
import { JadeModal } from './JadeModal.ts';

export interface HomeViewCallbacks {
  onSelectCharacter: (char: Character) => void;
  onSelectClass: (classId: string) => void;
  onNavigateToPlanner: () => void;
}

export class HomeView {
  private container: HTMLElement;
  private callbacks: HomeViewCallbacks;
  private selectedFactionFilter: 'all' | Faction = 'all';

  constructor(container: HTMLElement, callbacks: HomeViewCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.render();
  }

  public render() {
    const characters = StorageManager.getCharacters();
    const activeChar = StorageManager.getActiveCharacter();
    const filteredClasses = this.selectedFactionFilter === 'all'
      ? CLASSES
      : CLASSES.filter(c => c.faction === this.selectedFactionFilter);

    this.container.innerHTML = `
      <div class="home-portal-wrapper">
        <!-- Hero Portal Header -->
        <section class="home-hero-section">
          <div class="home-hero-badge">ARCHIVE & BUILD CALCULATOR</div>
          <h1 class="home-hero-title">Skill Archive & Build Calculator</h1>
          <p class="home-hero-desc">
            Assemble authentic character builds, master tome synergies, and command the twelve legendary factions of the Mortal and Divine realms.
          </p>
          <div class="home-hero-actions">
            <button class="jd-btn btn-primary home-cta-btn" id="btn-create-char-hero">
              <span>+</span> Create New Character
            </button>
            ${activeChar ? `
              <button class="jd-btn home-cta-btn" id="btn-resume-hero">
                ⚔️ Continue: ${activeChar.name}
              </button>
            ` : ''}
          </div>
        </section>

        <!-- My Characters Roster Section -->
        <section class="home-roster-section">
          <div class="home-section-header">
            <div class="home-section-title-box">
              <h2 class="home-section-title">My Characters</h2>
              <span class="home-section-subtitle">${characters.length} Saved in Browser</span>
            </div>
            <button class="jd-btn btn-primary" id="btn-add-char-roster" style="font-size: 0.8rem; padding: 6px 14px;">
              + New Character
            </button>
          </div>

          <div class="characters-grid" id="characters-roster-grid">
            ${this.renderCharactersList(characters, activeChar?.id)}
          </div>
        </section>

        <!-- Faction & Class Explorer Section -->
        <section class="home-classes-section">
          <div class="home-section-header">
            <div class="home-section-title-box">
              <h2 class="home-section-title">Faction & Class Explorer</h2>
              <span class="home-section-subtitle">${CLASSES.length} Playable Classes • Complete Skills & Tomes</span>
            </div>

            <!-- Faction Filter Pills -->
            <div class="home-faction-filter-bar">
              <button class="home-filter-btn ${this.selectedFactionFilter === 'all' ? 'active' : ''}" data-filter="all">
                All (${CLASSES.length})
              </button>
              <button class="home-filter-btn ${this.selectedFactionFilter === 'human' ? 'active' : ''}" data-filter="human">
                ◈ Human (${CLASSES.filter(c => c.faction === 'human').length})
              </button>
              <button class="home-filter-btn ${this.selectedFactionFilter === 'athan' ? 'active' : ''}" data-filter="athan">
                ❖ Athan (${CLASSES.filter(c => c.faction === 'athan').length})
              </button>
            </div>
          </div>

          <div class="home-classes-grid">
            ${filteredClasses.map(c => this.renderHomeClassCard(c)).join('')}
          </div>
        </section>
      </div>

      <!-- Create Character Modal Overlay -->
      <div class="modal-overlay" id="home-create-char-modal">
        <div class="modal-window home-modal-window">
          <div class="modal-header">
            <h3>Create New Character</h3>
            <button class="modal-close-btn" id="btn-close-create-modal">✕</button>
          </div>
          <div class="modal-content">
            <div class="create-char-form">
              <label class="jd-label">Character Name:</label>
              <input type="text" class="jd-input" id="new-char-name" placeholder="e.g. ThunderBlade, ShadowStrike..." maxlength="24" />

              <label class="jd-label" style="margin-top: 14px;">Select Class:</label>
              <div class="create-char-class-picker">
                ${CLASSES.map(c => `
                  <div class="class-picker-option" data-class-id="${c.id}">
                    ${this.renderCrest(c, 'picker-crest')}
                    <span class="picker-name">${c.name}</span>
                    <span class="picker-faction">${c.faction === 'human' ? 'Human' : 'Athan'}</span>
                  </div>
                `).join('')}
              </div>

              <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
                <button class="jd-btn" id="btn-cancel-create-char">Cancel</button>
                <button class="jd-btn btn-primary" id="btn-confirm-create-char">Create & Plan Build →</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.wireEvents();
  }

  private renderCharactersList(characters: Character[], activeId?: string): string {
    if (characters.length === 0) {
      return `
        <div class="empty-roster-card" id="card-create-first-char">
          <div class="empty-roster-icon">⚔️</div>
          <div class="empty-roster-title">No characters created yet</div>
          <div class="empty-roster-desc">Create your first character build to begin customizing skill trees and tomes.</div>
          <button class="jd-btn btn-primary" style="margin-top: 12px;" id="btn-empty-create">
            + Create First Character
          </button>
        </div>
      `;
    }

    return characters.map(char => {
      const meta = CLASS_MAP.get(char.classId) || CLASSES[0];
      const isActive = char.id === activeId;
      let totalSkillPts = 0;
      for (const pts of Object.values(char.allocation || {})) {
        totalSkillPts += pts;
      }
      let totalTomePts = 0;
      for (const pts of Object.values(char.tomeAllocation || {})) {
        totalTomePts += pts;
      }

      return `
        <div class="char-roster-card ${isActive ? 'active-char' : ''}" data-char-id="${char.id}">
          <div class="char-card-top">
            ${this.renderCrest(meta, 'char-card-crest')}
            <div class="char-card-info">
              <div class="char-card-name-row">
                <span class="char-card-name">${char.name}</span>
                ${isActive ? '<span class="char-badge-active">ACTIVE</span>' : ''}
              </div>
              <div class="char-card-class">${meta.name} • <span class="char-faction-tag">${meta.faction === 'human' ? 'Human' : 'Athan'}</span></div>
            </div>
          </div>

          <div class="char-card-stats-row">
            <div class="char-stat-item">
              <span class="char-stat-label">Skills:</span>
              <span class="char-stat-val">${totalSkillPts}/150</span>
            </div>
            <div class="char-stat-item">
              <span class="char-stat-label">Tomes:</span>
              <span class="char-stat-val">${totalTomePts}/48</span>
            </div>
          </div>

          <div class="char-card-actions">
            <button class="jd-btn btn-primary char-btn-play" data-id="${char.id}">
              ${isActive ? 'Continue →' : 'Select & Plan →'}
            </button>
            <button class="jd-btn char-btn-rename" data-id="${char.id}" title="Rename Character">
              ✎
            </button>
            <button class="jd-btn btn-danger char-btn-delete" data-id="${char.id}" title="Delete Character">
              ✕
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  private renderHomeClassCard(c: ClassMetadata): string {
    return `
      <div class="home-class-card" data-class-id="${c.id}">
        <div class="home-class-card-header">
          <div class="home-class-crest-wrap">
            ${this.renderCrest(c, 'home-class-crest')}
          </div>
          <div class="home-class-title-col">
            <h3 class="home-class-name">${c.name}</h3>
            <span class="home-class-title">${c.title}</span>
            <span class="home-class-faction-badge ${c.faction}">${c.faction === 'human' ? '◈ Human' : '❖ Athan'}</span>
          </div>
        </div>

        <div class="home-class-meta-bar">
          <div><strong>Role:</strong> ${c.role}</div>
          <div><strong>Weapon:</strong> ${c.weapon}</div>
        </div>

        <p class="home-class-desc">${c.description}</p>

        <!-- Combat & Resistance Radar Chart -->
        <div class="home-class-pentagon-wrap">
          <div class="pentagon-chart-title">Combat & Resistance Radar</div>
          ${SkillPentagon.renderSVG(c.stats, 155)}
          <button class="jd-btn btn-sm btn-stats-overview" data-class-id="${c.id}" title="Toggle detailed stat attributes">
            📊 Stats Overview
          </button>
          <div class="class-stats-overview-drawer" id="stats-drawer-${c.id}" style="display: none;">
            ${SkillPentagon.renderStatsOverview(c.stats)}
          </div>
        </div>

        <div class="home-class-footer">
          <button class="jd-btn btn-primary home-btn-plan-class" data-class-id="${c.id}">
            Plan ${c.name} Build →
          </button>
        </div>
      </div>
    `;
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

  private wireEvents() {
    // Hero Actions
    this.container.querySelector('#btn-create-char-hero')?.addEventListener('click', () => this.openCreateModal());
    this.container.querySelector('#btn-add-char-roster')?.addEventListener('click', () => this.openCreateModal());
    this.container.querySelector('#btn-empty-create')?.addEventListener('click', () => this.openCreateModal());
    this.container.querySelector('#btn-resume-hero')?.addEventListener('click', () => this.callbacks.onNavigateToPlanner());

    // Faction Filter Pills
    this.container.querySelectorAll('.home-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const filter = (btn as HTMLElement).dataset.filter as 'all' | Faction;
        if (filter) {
          this.selectedFactionFilter = filter;
          this.render();
        }
      });
    });

    // Character Card Actions
    this.container.querySelectorAll('.char-btn-play').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = (btn as HTMLElement).dataset.id;
        if (id) {
          const char = StorageManager.getCharacters().find(c => c.id === id);
          if (char) {
            StorageManager.setActiveCharacterId(char.id);
            this.callbacks.onSelectCharacter(char);
          }
        }
      });
    });

    this.container.querySelectorAll('.char-btn-rename').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = (btn as HTMLElement).dataset.id;
        if (id) {
          const char = StorageManager.getCharacters().find(c => c.id === id);
          const newName = await JadeModal.prompt({
            title: 'Rename Character',
            message: 'Enter a new name for your character:',
            defaultValue: char?.name || '',
            placeholder: 'Character Name'
          });
          if (newName && newName.trim()) {
            StorageManager.renameCharacter(id, newName.trim());
            this.render();
          }
        }
      });
    });

    this.container.querySelectorAll('.char-btn-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = (btn as HTMLElement).dataset.id;
        if (id) {
          const char = StorageManager.getCharacters().find(c => c.id === id);
          const confirmed = await JadeModal.confirm({
            title: 'Delete Character',
            message: `Are you sure you want to delete "${char?.name || 'this character'}"? All saved allocations will be permanently removed.`,
            confirmText: 'Delete',
            isDanger: true
          });
          if (confirmed) {
            StorageManager.deleteCharacter(id);
            this.render();
          }
        }
      });
    });

    // Plan Class Button on Class Cards
    this.container.querySelectorAll('.home-btn-plan-class').forEach(btn => {
      btn.addEventListener('click', () => {
        const classId = (btn as HTMLElement).dataset.classId;
        if (classId) {
          // Open create modal with this class preselected
          this.openCreateModal(classId);
        }
      });
    });

    // Stats Overview Drawer Toggle
    this.container.querySelectorAll('.btn-stats-overview').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const classId = (btn as HTMLElement).dataset.classId;
        if (classId) {
          const drawer = this.container.querySelector(`#stats-drawer-${classId}`) as HTMLElement;
          if (drawer) {
            const isHidden = drawer.style.display === 'none';
            drawer.style.display = isHidden ? 'block' : 'none';
            btn.classList.toggle('active', isHidden);
          }
        }
      });
    });

    // Modal Events
    const modal = this.container.querySelector('#home-create-char-modal') as HTMLElement;
    const closeModal = () => modal?.classList.remove('active');

    this.container.querySelector('#btn-close-create-modal')?.addEventListener('click', closeModal);
    this.container.querySelector('#btn-cancel-create-char')?.addEventListener('click', closeModal);
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    let selectedClassId = 'jadeon';
    this.container.querySelectorAll('.class-picker-option').forEach(opt => {
      opt.addEventListener('click', () => {
        this.container.querySelectorAll('.class-picker-option').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        selectedClassId = (opt as HTMLElement).dataset.classId || 'jadeon';
      });
    });

    this.container.querySelector('#btn-confirm-create-char')?.addEventListener('click', () => {
      const nameInput = this.container.querySelector('#new-char-name') as HTMLInputElement;
      const name = nameInput?.value.trim() || `My ${selectedClassId.charAt(0).toUpperCase() + selectedClassId.slice(1)}`;
      const newChar = StorageManager.createCharacter(name, selectedClassId);
      closeModal();
      this.callbacks.onSelectCharacter(newChar);
    });
  }

  public openCreateModal(defaultClassId = 'jadeon') {
    const modal = this.container.querySelector('#home-create-char-modal') as HTMLElement;
    if (!modal) return;
    const nameInput = this.container.querySelector('#new-char-name') as HTMLInputElement;
    if (nameInput) {
      nameInput.value = '';
      nameInput.placeholder = `My ${defaultClassId.charAt(0).toUpperCase() + defaultClassId.slice(1)}`;
    }

    this.container.querySelectorAll('.class-picker-option').forEach(o => {
      const el = o as HTMLElement;
      if (el.dataset.classId === defaultClassId) {
        el.classList.add('selected');
      } else {
        el.classList.remove('selected');
      }
    });

    modal.classList.add('active');
    nameInput?.focus();
  }
}
