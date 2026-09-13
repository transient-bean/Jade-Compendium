import { Skill } from '../../types/skill.ts';
import { SkillEngine } from '../../engine/SkillEngine.ts';
import { SkillTooltip } from './SkillTooltip.ts';
import { Toast } from './Toast.ts';

export class SkillNode {
  private skill: Skill;
  private engine: SkillEngine;
  private element: HTMLElement;
  private rankBadgeEl!: HTMLElement;
  private btnMinus!: HTMLButtonElement;
  private btnPlus!: HTMLButtonElement;
  private frameEl!: HTMLElement;

  constructor(skill: Skill, engine: SkillEngine) {
    this.skill = skill;
    this.engine = engine;
    this.element = this.createDOM();
    this.updateState();
  }

  public getElement(): HTMLElement {
    return this.element;
  }

  private createDOM(): HTMLElement {
    const node = document.createElement('div');
    node.className = 'skill-node';
    node.dataset.skillId = this.skill.id;
    if (this.skill.col && this.skill.row) {
      node.style.gridColumn = `${this.skill.col}`;
      node.style.gridRow = `${this.skill.row}`;
    }

    // Prerequisite hint arrow if child
    if (this.skill.prerequisites.length > 0) {
      const prereqArrow = document.createElement('div');
      prereqArrow.className = 'prereq-indicator';
      prereqArrow.title = `Requires ${this.skill.prerequisites[0].skillName || 'prerequisite'} rank ${this.skill.prerequisites[0].requiredRank}`;
      prereqArrow.textContent = '▼';
      node.appendChild(prereqArrow);
    }

    // Frame wrapper
    this.frameEl = document.createElement('div');
    this.frameEl.className = 'skill-slot-frame';

    if (this.skill.spriteCoords) {
      const spriteEl = document.createElement('div');
      spriteEl.className = 'skill-icon-sprite';
      const base = import.meta.env.BASE_URL || './';
      const cleanIcon = this.skill.icon.startsWith('/') ? this.skill.icon.slice(1) : this.skill.icon.replace(/^\.\//, '');
      const assetPath = `${base}${cleanIcon}`;
      spriteEl.style.backgroundImage = `url("${assetPath}")`;
      spriteEl.style.backgroundPosition = `-${this.skill.spriteCoords.x}px -${this.skill.spriteCoords.y}px`;
      this.frameEl.appendChild(spriteEl);
    } else {
      // Skill image with fallback
      const img = document.createElement('img');
      img.className = 'skill-icon-img';
      img.src = this.skill.icon;
      img.alt = this.skill.name;
      img.loading = 'lazy';

      img.onerror = () => {
        const initials = this.skill.name
          .split(' ')
          .map(w => w[0])
          .slice(0, 2)
          .join('');
        const crest = document.createElement('div');
        crest.className = 'skill-fallback-crest';
        crest.textContent = initials;
        img.replaceWith(crest);
      };

      this.frameEl.appendChild(img);
    }

    node.appendChild(this.frameEl);

    // Rank Controls Row with Minus, Rank Badge, Plus
    const controlsRow = document.createElement('div');
    controlsRow.className = 'skill-controls-row';

    this.btnMinus = document.createElement('button');
    this.btnMinus.type = 'button';
    this.btnMinus.className = 'jd-step-btn btn-minus';
    this.btnMinus.setAttribute('aria-label', `Remove point from ${this.skill.name}`);
    this.btnMinus.title = 'Remove point';
    this.btnMinus.textContent = '−';
    this.btnMinus.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.engine.deallocate(this.skill.id);
      if (window.innerWidth > 768) {
        SkillTooltip.getInstance().show(this.skill, this.engine);
      }
    });

    this.rankBadgeEl = document.createElement('span');
    this.rankBadgeEl.className = 'skill-rank-badge';
    this.rankBadgeEl.textContent = `0/${this.skill.maxRank}`;

    this.btnPlus = document.createElement('button');
    this.btnPlus.type = 'button';
    this.btnPlus.className = 'jd-step-btn btn-plus';
    this.btnPlus.setAttribute('aria-label', `Add point to ${this.skill.name}`);
    this.btnPlus.title = 'Add point';
    this.btnPlus.textContent = '+';
    this.btnPlus.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.engine.allocate(this.skill.id);
      if (window.innerWidth > 768) {
        SkillTooltip.getInstance().show(this.skill, this.engine);
      }
    });

    controlsRow.appendChild(this.btnMinus);
    controlsRow.appendChild(this.rankBadgeEl);
    controlsRow.appendChild(this.btnPlus);
    node.appendChild(controlsRow);

    // Skill Name label
    const nameLabel = document.createElement('div');
    nameLabel.className = 'skill-name-label';
    nameLabel.textContent = this.skill.name;
    node.appendChild(nameLabel);

    // Event Handlers - Attached strictly to this.frameEl (tapping icon directly)
    let touchTimer: number | null = null;
    let touchStartX = 0;
    let touchStartY = 0;
    let didLongPress = false;

    this.frameEl.addEventListener('touchstart', (e: TouchEvent) => {
      didLongPress = false;
      if (e.touches.length > 0) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }
      this.frameEl.classList.add('touch-holding');

      touchTimer = window.setTimeout(() => {
        didLongPress = true;
        this.frameEl.classList.remove('touch-holding');
        if (navigator.vibrate) {
          try { navigator.vibrate(50); } catch (_) {}
        }
        this.triggerSynergyHighlight();
      }, 360);
    }, { passive: true });

    this.frameEl.addEventListener('touchmove', (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const dx = e.touches[0].clientX - touchStartX;
        const dy = e.touches[0].clientY - touchStartY;
        // Jitter tolerance of 12px before canceling hold
        if (Math.hypot(dx, dy) > 12) {
          if (touchTimer) {
            clearTimeout(touchTimer);
            touchTimer = null;
          }
          this.frameEl.classList.remove('touch-holding');
        }
      }
    }, { passive: true });

    this.frameEl.addEventListener('touchend', (e: TouchEvent) => {
      this.frameEl.classList.remove('touch-holding');
      if (touchTimer) {
        clearTimeout(touchTimer);
        touchTimer = null;
      }
      if (didLongPress) {
        e.preventDefault();
      }
    });

    this.frameEl.addEventListener('touchcancel', () => {
      this.frameEl.classList.remove('touch-holding');
      if (touchTimer) {
        clearTimeout(touchTimer);
        touchTimer = null;
      }
    });

    // Left-click / Tap icon: Open inspector on mobile, add point on desktop
    this.frameEl.addEventListener('click', (e) => {
      e.preventDefault();
      if (didLongPress) {
        // Prevent opening the tooltip bottom sheet if this gesture was a long-press
        didLongPress = false;
        return;
      }
      if (window.innerWidth <= 768) {
        SkillTooltip.getInstance().show(this.skill, this.engine);
      } else {
        this.engine.allocate(this.skill.id);
        SkillTooltip.getInstance().show(this.skill, this.engine);
      }
    });

    // Right-click icon: Vanilla Jade Dynasty highlight affecting tome skills
    this.frameEl.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.triggerSynergyHighlight();
    });

    // Tooltip hover on icon
    this.frameEl.addEventListener('mouseenter', () => {
      SkillTooltip.getInstance().show(this.skill, this.engine);
    });

    this.frameEl.addEventListener('mouseleave', () => {
      SkillTooltip.getInstance().hide();
    });

    return node;
  }

  private triggerSynergyHighlight() {
    const current = this.engine.getSynergyHighlight();
    if (current && current.sourceId === this.skill.id) {
      this.engine.clearSynergyHighlight();
      return;
    }

    const tomes = this.engine.getInfluencingTomes(this.skill.id);
    if (tomes.length === 0) {
      Toast.show(`No Tomes directly affect ${this.skill.name}`);
      return;
    }

    this.engine.toggleSkillSynergyHighlight(this.skill.id);
    this.engine.setActiveTab('tomes');

    const firstBook = tomes[0]?.bookNum;
    if (firstBook) {
      const mobileTomeBtn = document.querySelector(`.mobile-tome-btn[data-book-num="${firstBook}"]`) as HTMLButtonElement;
      mobileTomeBtn?.click();
    }

    setTimeout(() => {
      const firstTomeEl = document.querySelector(`[data-tome-id="${tomes[0].tome.id}"]`);
      firstTomeEl?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    }, 120);
  }

  public updateState() {
    const rank = this.engine.getRank(this.skill.id);
    const maxRank = this.skill.maxRank;
    const isUnlocked = this.engine.isSkillUnlocked(this.skill.id);
    const canAdd = this.engine.canAllocate(this.skill.id);
    const canRemove = this.engine.canDeallocate(this.skill.id);

    this.rankBadgeEl.textContent = `${rank}/${maxRank}`;

    this.btnMinus.disabled = !canRemove;
    this.btnMinus.classList.toggle('disabled', !canRemove);

    this.btnPlus.disabled = !canAdd;
    this.btnPlus.classList.toggle('disabled', !canAdd);

    // Reset classes
    this.element.classList.remove('locked', 'available', 'invested', 'maxed', 'synergy-source', 'synergy-highlighted', 'synergy-dimmed');

    if (!isUnlocked) {
      this.element.classList.add('locked');
    } else if (rank === maxRank) {
      this.element.classList.add('maxed');
    } else if (rank > 0) {
      this.element.classList.add('invested');
    } else {
      this.element.classList.add('available');
    }

    // Synergy highlight states
    const highlight = this.engine.getSynergyHighlight();
    if (highlight) {
      if (highlight.sourceType === 'skill' && highlight.sourceId === this.skill.id) {
        this.element.classList.add('synergy-source');
      } else if (highlight.highlightedSkillIds.has(this.skill.id)) {
        this.element.classList.add('synergy-highlighted');
      } else {
        this.element.classList.add('synergy-dimmed');
      }
    }
  }
}
