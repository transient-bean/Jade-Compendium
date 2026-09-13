import { TomeSkill } from '../../types/skill.ts';
import { SkillEngine } from '../../engine/SkillEngine.ts';
import { SkillTooltip } from './SkillTooltip.ts';
import { Toast } from './Toast.ts';

export const TOME_SCALE = 1.16;

export class TomeNode {
  private skill: TomeSkill;
  private engine: SkillEngine;
  private element: HTMLElement;
  private rankBadgeEl!: HTMLElement;
  private btnMinus!: HTMLButtonElement;
  private btnPlus!: HTMLButtonElement;
  private frameEl!: HTMLElement;

  constructor(skill: TomeSkill, engine: SkillEngine, left?: number, top?: number) {
    this.skill = skill;
    this.engine = engine;
    this.element = this.createDOM(left, top);
    this.updateState();
  }

  public getElement(): HTMLElement {
    return this.element;
  }

  private createDOM(left?: number, top?: number): HTMLElement {
    const node = document.createElement('div');
    node.className = 'tome-node';
    node.dataset.tomeId = this.skill.id;
    node.style.position = 'absolute';
    const finalX = left !== undefined ? left : Math.round(this.skill.left * TOME_SCALE);
    const finalY = top !== undefined ? top : Math.round(this.skill.top * TOME_SCALE);
    node.style.left = `${finalX}px`;
    node.style.top = `${finalY}px`;

    // Frame wrapper
    this.frameEl = document.createElement('div');
    this.frameEl.className = 'tome-slot-frame';

    // Sprite icon
    const spriteEl = document.createElement('div');
    spriteEl.className = 'tome-icon-sprite';
    const base = import.meta.env.BASE_URL || './';
    const cleanIcon = this.skill.icon.startsWith('/') ? this.skill.icon.slice(1) : this.skill.icon.replace(/^\.\//, '');
    const assetPath = `${base}${cleanIcon}`;
    spriteEl.style.backgroundImage = `url("${assetPath}")`;
    spriteEl.style.backgroundPosition = `-${this.skill.spriteCoords.x}px -${this.skill.spriteCoords.y}px`;
    this.frameEl.appendChild(spriteEl);

    node.appendChild(this.frameEl);

    // Controls Row with Minus, Rank Badge, Plus
    const controlsRow = document.createElement('div');
    controlsRow.className = 'tome-controls-row';

    this.btnMinus = document.createElement('button');
    this.btnMinus.type = 'button';
    this.btnMinus.className = 'jd-step-btn btn-minus';
    this.btnMinus.setAttribute('aria-label', `Remove point from ${this.skill.name}`);
    this.btnMinus.title = 'Remove point';
    this.btnMinus.textContent = '−';
    this.btnMinus.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.engine.deallocateTome(this.skill.id);
      if (window.innerWidth > 768) {
        SkillTooltip.getInstance().showTome(this.skill, this.engine);
      }
    });

    this.rankBadgeEl = document.createElement('span');
    this.rankBadgeEl.className = 'tome-rank-badge';
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
      this.engine.allocateTome(this.skill.id);
      if (window.innerWidth > 768) {
        SkillTooltip.getInstance().showTome(this.skill, this.engine);
      }
    });

    controlsRow.appendChild(this.btnMinus);
    controlsRow.appendChild(this.rankBadgeEl);
    controlsRow.appendChild(this.btnPlus);
    node.appendChild(controlsRow);

    // Skill Name label
    const nameLabel = document.createElement('div');
    nameLabel.className = 'tome-name-label';
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
        SkillTooltip.getInstance().showTome(this.skill, this.engine);
      } else {
        this.engine.allocateTome(this.skill.id);
        SkillTooltip.getInstance().showTome(this.skill, this.engine);
      }
    });

    // Right-click icon: Vanilla Jade Dynasty highlight influenced faction skills
    this.frameEl.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.triggerSynergyHighlight();
    });

    // Tooltip hover on icon
    this.frameEl.addEventListener('mouseenter', () => {
      SkillTooltip.getInstance().showTome(this.skill, this.engine);
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

    const skills = this.engine.getInfluencedSkills(this.skill.id);
    if (skills.length === 0) {
      Toast.show(`This Tome skill does not directly alter specific Faction skills`);
      return;
    }

    this.engine.toggleTomeSynergyHighlight(this.skill.id);
    this.engine.setActiveTab('skills');

    const firstTier = skills[0]?.tier;
    if (firstTier !== undefined) {
      const mobileTierBtn = document.querySelector(`.mobile-tier-btn[data-tier-num="${firstTier}"]`) as HTMLButtonElement;
      mobileTierBtn?.click();
    }

    setTimeout(() => {
      const firstSkillEl = document.querySelector(`[data-skill-id="${skills[0].id}"]`);
      firstSkillEl?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    }, 120);
  }

  public updateState() {
    const rank = this.engine.getTomeRank(this.skill.id);
    const maxRank = this.skill.maxRank;
    const isUnlocked = this.engine.isTomeUnlocked(this.skill.id);
    const canAdd = this.engine.canAllocateTome(this.skill.id);
    const canRemove = this.engine.canDeallocateTome(this.skill.id);

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
      if (highlight.sourceType === 'tome' && highlight.sourceId === this.skill.id) {
        this.element.classList.add('synergy-source');
      } else if (highlight.highlightedTomeIds.has(this.skill.id)) {
        this.element.classList.add('synergy-highlighted');
      } else {
        this.element.classList.add('synergy-dimmed');
      }
    }
  }
}
