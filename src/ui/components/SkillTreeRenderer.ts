import { ClassDefinition, TierDefinition } from '../../types/skill.ts';
import { SkillEngine } from '../../engine/SkillEngine.ts';
import { SkillNode } from './SkillNode.ts';

export class SkillTreeRenderer {
  private container: HTMLElement;
  private engine: SkillEngine;
  private skillNodes: SkillNode[] = [];
  private activeMobileTier: number | 'all' = 'all';

  constructor(container: HTMLElement, engine: SkillEngine) {
    this.container = container;
    this.engine = engine;
    this.engine.subscribe(this.onEngineUpdate.bind(this));
    this.render();
  }

  public setEngine(engine: SkillEngine) {
    this.engine = engine;
    this.engine.subscribe(this.onEngineUpdate.bind(this));
    this.render();
  }

  public render() {
    this.container.innerHTML = '';
    this.skillNodes = [];

    const classDef = this.engine.getClassDefinition();

    // Mobile Tier Navigation Bar (visible only on mobile via CSS)
    const mobileBar = document.createElement('div');
    mobileBar.className = 'mobile-tier-bar';

    const allBtn = document.createElement('button');
    allBtn.className = `mobile-tier-btn ${this.activeMobileTier === 'all' ? 'active' : ''}`;
    allBtn.textContent = 'All Tiers';
    allBtn.addEventListener('click', () => {
      this.activeMobileTier = 'all';
      treeGrid.dataset.mobileFilter = 'all';
      this.updateMobileBarActiveState(mobileBar);
    });
    mobileBar.appendChild(allBtn);

    for (const tier of classDef.tiers) {
      const btn = document.createElement('button');
      btn.className = `mobile-tier-btn ${this.activeMobileTier === tier.tier ? 'active' : ''}`;
      btn.dataset.tierNum = String(tier.tier);
      const shortName = tier.tier === 0 ? 'Init' : `T${tier.tier}`;
      btn.innerHTML = `<span>${shortName}</span> <span class="mobile-tier-pts" id="mobile-tier-pts-${tier.tier}">(${this.engine.getTierPoints(tier.tier)})</span>`;
      btn.addEventListener('click', () => {
        this.activeMobileTier = tier.tier;
        treeGrid.dataset.mobileFilter = String(tier.tier);
        this.updateMobileBarActiveState(mobileBar);
      });
      mobileBar.appendChild(btn);
    }

    this.container.appendChild(mobileBar);

    // Skill Tree Grid
    const treeGrid = document.createElement('div');
    treeGrid.className = 'skill-tree-grid';
    treeGrid.dataset.mobileFilter = String(this.activeMobileTier);

    for (const tier of classDef.tiers) {
      const tierCol = this.renderTierColumn(tier, classDef);
      treeGrid.appendChild(tierCol);
    }

    treeGrid.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.skill-node') && !target.closest('button')) {
        if (this.engine.getSynergyHighlight()) {
          this.engine.clearSynergyHighlight();
        }
      }
    });

    this.container.appendChild(treeGrid);
  }

  private updateMobileBarActiveState(bar: HTMLElement) {
    bar.querySelectorAll('.mobile-tier-btn').forEach(btn => {
      const b = btn as HTMLElement;
      if (this.activeMobileTier === 'all') {
        b.classList.toggle('active', !b.dataset.tierNum);
      } else {
        b.classList.toggle('active', b.dataset.tierNum === String(this.activeMobileTier));
      }
    });
  }

  private renderTierColumn(tier: TierDefinition, classDef: ClassDefinition): HTMLElement {
    const col = document.createElement('div');
    col.className = 'tier-column';
    col.dataset.tierNum = tier.tier.toString();

    const isUnlocked = this.engine.isTierUnlocked(tier.tier);
    col.classList.add(isUnlocked ? 'unlocked' : 'locked');

    // Header
    const header = document.createElement('div');
    header.className = 'tier-header';

    const titleBox = document.createElement('div');
    titleBox.className = 'tier-title-box';

    const title = document.createElement('div');
    title.className = 'tier-name';
    title.textContent = tier.name;
    titleBox.appendChild(title);

    const reqLvl = document.createElement('div');
    reqLvl.className = 'tier-req-level';
    reqLvl.textContent = `Req. Level: ${tier.requiredCharacterLevel}`;
    titleBox.appendChild(reqLvl);

    header.appendChild(titleBox);

    const pointsBadge = document.createElement('div');
    pointsBadge.className = 'tier-points-badge';
    pointsBadge.id = `tier-pts-badge-${tier.tier}`;
    pointsBadge.textContent = `${this.engine.getTierPoints(tier.tier)} pts`;
    header.appendChild(pointsBadge);

    col.appendChild(header);

    // Lock Overlay Banner if locked
    const lockBanner = document.createElement('div');
    lockBanner.className = 'tier-lock-banner';
    lockBanner.id = `tier-lock-banner-${tier.tier}`;
    lockBanner.style.display = isUnlocked ? 'none' : 'flex';

    const req = this.engine.getTierUnlockRequirement(tier.tier);
    const reqText = req
      ? `Requires ${req.required} points in ${req.prevTierName} (${req.current}/${req.required})`
      : 'Locked';
    lockBanner.innerHTML = `<span class="tier-lock-icon">🔒</span><span>${reqText}</span>`;
    col.appendChild(lockBanner);

    // Skills Matrix Body
    const body = document.createElement('div');
    body.className = 'tier-body';

    const matrix = document.createElement('div');
    matrix.className = 'skills-matrix';

    // Sort skills by row, then col
    const sortedSkills = [...tier.skills].sort((a, b) => {
      if (a.row !== b.row) return a.row - b.row;
      return a.col - b.col;
    });

    for (const skill of sortedSkills) {
      const node = new SkillNode(skill, this.engine);
      this.skillNodes.push(node);
      matrix.appendChild(node.getElement());
    }

    body.appendChild(matrix);

    // Reset Tier button in footer
    const footer = document.createElement('div');
    footer.className = 'tier-footer';
    const resetTierBtn = document.createElement('button');
    resetTierBtn.className = 'jd-btn';
    resetTierBtn.style.fontSize = '0.7rem';
    resetTierBtn.style.padding = '4px 8px';
    resetTierBtn.textContent = '↺ Reset Tier';
    resetTierBtn.title = `Reset points spent in ${tier.name}`;
    resetTierBtn.addEventListener('click', () => {
      this.engine.resetTier(tier.tier);
    });
    footer.appendChild(resetTierBtn);
    body.appendChild(footer);

    col.appendChild(body);
    return col;
  }

  private onEngineUpdate() {
    // Update individual nodes
    for (const node of this.skillNodes) {
      node.updateState();
    }

    // Update tier badges and lock banners
    const classDef = this.engine.getClassDefinition();
    for (const tier of classDef.tiers) {
      const pts = this.engine.getTierPoints(tier.tier);
      const badge = document.getElementById(`tier-pts-badge-${tier.tier}`);
      if (badge) {
        badge.textContent = `${pts} pts`;
      }

      const mobilePts = document.getElementById(`mobile-tier-pts-${tier.tier}`);
      if (mobilePts) {
        mobilePts.textContent = `(${pts})`;
      }

      const lockBanner = document.getElementById(`tier-lock-banner-${tier.tier}`);
      const col = this.container.querySelector(`.tier-column[data-tier-num="${tier.tier}"]`);
      const isUnlocked = this.engine.isTierUnlocked(tier.tier);

      if (col) {
        col.classList.toggle('unlocked', isUnlocked);
        col.classList.toggle('locked', !isUnlocked);
      }

      if (lockBanner) {
        lockBanner.style.display = isUnlocked ? 'none' : 'flex';
        if (!isUnlocked) {
          const req = this.engine.getTierUnlockRequirement(tier.tier);
          const reqText = req
            ? `Requires ${req.required} points in ${req.prevTierName} (${req.current}/${req.required})`
            : 'Locked';
          lockBanner.innerHTML = `<span class="tier-lock-icon">🔒</span><span>${reqText}</span>`;
        }
      }
    }
  }
}
