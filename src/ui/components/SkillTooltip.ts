import { Skill, TomeSkill } from '../../types/skill.ts';
import { SkillEngine } from '../../engine/SkillEngine.ts';
import { cleanSkillDescription } from '../../data/skills/index.ts';

export class SkillTooltip {
  private static instance: SkillTooltip | null = null;
  private container: HTMLElement;
  private currentSkill: Skill | TomeSkill | null = null;
  private isMobile = false;

  private constructor() {
    this.container = document.createElement('div');
    this.container.className = 'jd-skill-tooltip';
    this.container.style.display = 'none';

    const parent = document.getElementById('tooltip-container') || document.body;
    parent.appendChild(this.container);

    window.addEventListener('mousemove', this.onMouseMove.bind(this));
    window.addEventListener('resize', this.onResize.bind(this));
    this.checkMobile();

    // Close mobile sheet when tapping outside
    document.addEventListener('click', (e) => {
      if (this.isMobile && this.container.style.display !== 'none') {
        const target = e.target as HTMLElement;
        if (!this.container.contains(target) && !target.closest('.skill-node') && !target.closest('.tome-node')) {
          this.hide();
        }
      }
    });
  }

  public static getInstance(): SkillTooltip {
    if (!this.instance) {
      this.instance = new SkillTooltip();
    }
    return this.instance;
  }

  private checkMobile() {
    this.isMobile = window.innerWidth <= 768;
    if (this.isMobile) {
      this.container.classList.add('is-mobile-sheet');
      this.container.style.left = '0px';
      this.container.style.top = 'auto';
      this.container.style.bottom = '0px';
    } else {
      this.container.classList.remove('is-mobile-sheet');
      this.container.style.bottom = 'auto';
    }
  }

  private onResize() {
    this.checkMobile();
  }

  public show(skill: Skill, engine: SkillEngine) {
    this.checkMobile();
    this.currentSkill = skill;
    this.render(skill, engine);
    this.container.style.display = 'flex';
  }

  public showTome(skill: TomeSkill, engine: SkillEngine) {
    this.checkMobile();
    this.currentSkill = skill;
    this.renderTome(skill, engine);
    this.container.style.display = 'flex';
  }

  public hide() {
    this.currentSkill = null;
    this.container.style.display = 'none';
  }

  private onMouseMove(e: MouseEvent) {
    if (this.container.style.display === 'none' || this.isMobile) return;

    const offset = 18;
    const tooltipWidth = this.container.offsetWidth || 320;
    const tooltipHeight = this.container.offsetHeight || 300;

    let x = e.clientX + offset;
    let y = e.clientY + offset;

    // Viewport bounds check
    if (x + tooltipWidth > window.innerWidth - 10) {
      x = e.clientX - tooltipWidth - offset;
    }
    if (y + tooltipHeight > window.innerHeight - 10) {
      y = window.innerHeight - tooltipHeight - 10;
    }
    if (y < 10) {
      y = 10;
    }

    this.container.style.left = `${x}px`;
    this.container.style.top = `${y}px`;
  }

  private render(skill: Skill, engine: SkillEngine) {
    const currentRank = engine.getRank(skill.id);
    const isUnlocked = engine.isSkillUnlocked(skill.id);
    const isTierUnlocked = engine.isTierUnlocked(skill.tier);
    const unmetPrereqs = engine.getUnmetPrerequisites(skill.id);

    // Current and Next rank effect definitions
    const currentEffect = skill.rankEffects.find(r => r.rank === currentRank) || skill.rankEffects[0];
    const nextEffect = skill.rankEffects.find(r => r.rank === currentRank + 1);

    // Meta details from current or first rank
    const spiritCost = currentEffect?.spiritCost ?? 'None';
    const cooldown = currentEffect?.cooldown ?? 'None';
    const castTime = currentEffect?.castTime ?? '1.0s';

    const base = import.meta.env.BASE_URL || './';
    const cleanIcon = skill.icon.startsWith('/') ? skill.icon.slice(1) : skill.icon.replace(/^\.\//, '');
    const assetPath = `${base}${cleanIcon}`;

    const iconHtml = skill.spriteCoords
      ? `<div class="tooltip-icon-sprite" style="background-image: url('${assetPath}'); background-position: -${skill.spriteCoords.x}px -${skill.spriteCoords.y}px;"></div>`
      : '';

    let html = `
      <div class="tooltip-header">
        <div style="display: flex; gap: 10px; align-items: center;">
          ${iconHtml}
          <div class="tooltip-title-area">
            <span class="tooltip-title">${skill.name}</span>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="tooltip-rank-badge">Rank ${currentRank} / ${skill.maxRank}</span>
          ${this.isMobile ? `<button class="mobile-close-btn" id="mobile-sheet-close">✕</button>` : ''}
        </div>
      </div>

      <div class="tooltip-meta-bar">
        <div class="tooltip-meta-item">
          <span class="tooltip-meta-label">Type:</span>
          <span>${skill.type}</span>
        </div>
        <div class="tooltip-meta-item">
          <span class="tooltip-meta-label">Spirit:</span>
          <span>${spiritCost}</span>
        </div>
        <div class="tooltip-meta-item">
          <span class="tooltip-meta-label">Cooldown:</span>
          <span>${cooldown}</span>
        </div>
        <div class="tooltip-meta-item">
          <span class="tooltip-meta-label">Cast:</span>
          <span>${castTime}</span>
        </div>
      </div>
${(() => {
  const cleanedDesc = cleanSkillDescription(skill.description);
  return cleanedDesc ? `\n      <div class="tooltip-desc">${cleanedDesc.replace(/\n/g, '<br />')}</div>` : '';
})()}
    `;

    // Unmet Prerequisite Warnings (Red)
    if (!isTierUnlocked || unmetPrereqs.length > 0) {
      html += `<div class="tooltip-prereq-warnings">`;
      if (!isTierUnlocked) {
        const req = engine.getTierUnlockRequirement(skill.tier);
        if (req) {
          html += `<div class="tooltip-prereq-item">Requires ${req.required} points in ${req.prevTierName} (${req.current}/${req.required})</div>`;
        } else {
          html += `<div class="tooltip-prereq-item">Tier locked</div>`;
        }
      }
      for (const p of unmetPrereqs) {
        html += `<div class="tooltip-prereq-item">Requires ${p.name} Rank ${p.required} (Current: ${p.current})</div>`;
      }
      html += `</div>`;
    }

    // Current Rank Effects
    if (currentRank > 0 && currentEffect) {
      const isMax = currentRank >= skill.maxRank;
      html += `
        <div class="tooltip-section">
          <div class="tooltip-section-header">Current Rank (${currentRank}${isMax ? ' - Max' : ''}):</div>
          <div class="tooltip-effect-text">${currentEffect.description.replace(/\n/g, '<br />')}</div>
          ${this.renderBonusNotes(currentEffect.bonusNotes)}
        </div>
      `;
    }

    // Next Rank Effects Preview
    if (currentRank < skill.maxRank && nextEffect) {
      html += `
        <div class="tooltip-section next-rank">
          <div class="tooltip-section-header">Next Rank (${currentRank + 1}):</div>
          <div class="tooltip-effect-text">${nextEffect.description.replace(/\n/g, '<br />')}</div>
          ${this.renderBonusNotes(nextEffect.bonusNotes)}
        </div>
      `;
    } else if (currentRank === 0 && currentEffect) {
      html += `
        <div class="tooltip-section next-rank">
          <div class="tooltip-section-header">Next Rank (1):</div>
          <div class="tooltip-effect-text">${currentEffect.description.replace(/\n/g, '<br />')}</div>
          ${this.renderBonusNotes(currentEffect.bonusNotes)}
        </div>
      `;
    }

    // Mobile Synergy Action Button
    const influencing = engine.getInfluencingTomes(skill.id);
    if (this.isMobile && influencing.length > 0) {
      html += `
        <div class="tooltip-mobile-actions">
          <button class="jd-btn btn-synergy-trigger" id="btn-mobile-synergy">
            ✨ Highlight Affecting Tomes (${influencing.length})
          </button>
          <span class="mobile-hold-hint">💡 Tip: You can also press & hold the skill icon on the tree</span>
        </div>
      `;
    }

    // Desktop Hint (Mobile info sheet is purely informational)
    if (!this.isMobile) {
      html += `
        <div class="tooltip-hint">
          <span>Left-click: +1 Rank</span>
          <span>Right-click: Highlight Tome Synergies ✨</span>
        </div>
      `;
    }

    this.container.innerHTML = html;

    // Wire Mobile close listener and synergy trigger
    if (this.isMobile) {
      this.container.querySelector('#mobile-sheet-close')?.addEventListener('click', () => {
        this.hide();
      });
      this.container.querySelector('#btn-mobile-synergy')?.addEventListener('click', () => {
        this.hide();
        engine.toggleSkillSynergyHighlight(skill.id);
        engine.setActiveTab('tomes');
        const firstBook = influencing[0]?.bookNum;
        if (firstBook) {
          const mobileTomeBtn = document.querySelector(`.mobile-tome-btn[data-book-num="${firstBook}"]`) as HTMLButtonElement;
          mobileTomeBtn?.click();
        }
        setTimeout(() => {
          const firstTomeEl = document.querySelector(`[data-tome-id="${influencing[0].tome.id}"]`);
          firstTomeEl?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        }, 120);
      });
    }
  }

  private renderTome(skill: TomeSkill, engine: SkillEngine) {
    const currentRank = engine.getTomeRank(skill.id);
    const isUnlocked = engine.isTomeUnlocked(skill.id);
    const unmetPrereqs = engine.getUnmetTomePrerequisites(skill.id);

    const currentEffect = skill.rankEffects.find(r => r.rank === currentRank) || skill.rankEffects[0];
    const nextEffect = skill.rankEffects.find(r => r.rank === currentRank + 1);

    const base = import.meta.env.BASE_URL || './';
    const cleanIcon = skill.icon.startsWith('/') ? skill.icon.slice(1) : skill.icon.replace(/^\.\//, '');
    const assetPath = `${base}${cleanIcon}`;

    const iconHtml = skill.spriteCoords
      ? `<div class="tooltip-icon-sprite" style="background-image: url('${assetPath}'); background-position: -${skill.spriteCoords.x}px -${skill.spriteCoords.y}px;"></div>`
      : '';

    let html = `
      <div class="tooltip-header">
        <div style="display: flex; gap: 10px; align-items: center;">
          ${iconHtml}
          <div class="tooltip-title-area">
            <span class="tooltip-title">${skill.name}</span>
            <span class="tooltip-subtitle" style="color: var(--gold-border); font-size: 0.8rem;">Tome Passive</span>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="tooltip-rank-badge">Rank ${currentRank} / ${skill.maxRank}</span>
          ${this.isMobile ? `<button class="mobile-close-btn" id="mobile-sheet-close">✕</button>` : ''}
        </div>
      </div>

      <div class="tooltip-meta-bar">
        <div class="tooltip-meta-item">
          <span class="tooltip-meta-label">Type:</span>
          <span>Passive Tome</span>
        </div>
        <div class="tooltip-meta-item">
          <span class="tooltip-meta-label">Book:</span>
          <span>Book ${skill.book}</span>
        </div>
      </div>
    `;

    const cleanedTomeDesc = cleanSkillDescription(skill.description);
    if (cleanedTomeDesc) {
      html += `<div class="tooltip-desc">${cleanedTomeDesc.replace(/\n/g, '<br />')}</div>`;
    }

    // Cross-reference: Affected Faction Skills
    if (skill.affectedSkillNames && skill.affectedSkillNames.length > 0) {
      html += `
        <div class="tooltip-enhances-box">
          <span class="enhances-label">✦ Enhances:</span>
          <div class="enhances-skill-list">
            ${skill.affectedSkillNames.map(name => `<span class="enhances-tag">${name}</span>`).join('')}
          </div>
        </div>
      `;
    }

    // Unmet Prerequisite Warnings (Red)
    if (!isUnlocked || unmetPrereqs.length > 0) {
      html += `<div class="tooltip-prereq-warnings">`;
      for (const p of unmetPrereqs) {
        html += `<div class="tooltip-prereq-item">Requires ${p.name} Rank ${p.required} (Current: ${p.current})</div>`;
      }
      html += `</div>`;
    }

    // Current Rank Effects
    if (currentRank > 0 && currentEffect) {
      const isMax = currentRank >= skill.maxRank;
      html += `
        <div class="tooltip-section">
          <div class="tooltip-section-header">Current Rank (${currentRank}${isMax ? ' - Max' : ''}):</div>
          <div class="tooltip-effect-text">${currentEffect.description.replace(/\n/g, '<br />')}</div>
        </div>
      `;
    }

    // Next Rank Effects Preview
    if (currentRank < skill.maxRank && nextEffect) {
      html += `
        <div class="tooltip-section next-rank">
          <div class="tooltip-section-header">Next Rank (${currentRank + 1}):</div>
          <div class="tooltip-effect-text">${nextEffect.description.replace(/\n/g, '<br />')}</div>
        </div>
      `;
    } else if (currentRank === 0 && currentEffect) {
      html += `
        <div class="tooltip-section next-rank">
          <div class="tooltip-section-header">Next Rank (1):</div>
          <div class="tooltip-effect-text">${currentEffect.description.replace(/\n/g, '<br />')}</div>
        </div>
      `;
    }

    // Mobile Synergy Action Button (Influenced Skills)
    const influenced = engine.getInfluencedSkills(skill.id);
    if (this.isMobile && influenced.length > 0) {
      html += `
        <div class="tooltip-mobile-actions">
          <button class="jd-btn btn-synergy-trigger" id="btn-mobile-tome-synergy">
            ✨ Highlight Influenced Skills (${influenced.length})
          </button>
          <span class="mobile-hold-hint">💡 Tip: You can also press & hold the tome icon on the tree</span>
        </div>
      `;
    }

    // Desktop Hint (Mobile info sheet is purely informational)
    if (!this.isMobile) {
      html += `
        <div class="tooltip-hint">
          <span>Left-click: +1 Rank</span>
          <span>Right-click: Highlight Influenced Skills ✨</span>
        </div>
      `;
    }

    this.container.innerHTML = html;

    // Wire Mobile close listener and synergy trigger
    if (this.isMobile) {
      this.container.querySelector('#mobile-sheet-close')?.addEventListener('click', () => {
        this.hide();
      });
      this.container.querySelector('#btn-mobile-tome-synergy')?.addEventListener('click', () => {
        this.hide();
        engine.toggleTomeSynergyHighlight(skill.id);
        engine.setActiveTab('skills');
        const firstTier = influenced[0]?.tier;
        if (firstTier !== undefined) {
          const mobileTierBtn = document.querySelector(`.mobile-tier-btn[data-tier-num="${firstTier}"]`) as HTMLButtonElement;
          mobileTierBtn?.click();
        }
        setTimeout(() => {
          const firstSkillEl = document.querySelector(`[data-skill-id="${influenced[0].id}"]`);
          firstSkillEl?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        }, 120);
      });
    }
  }

  private renderBonusNotes(notes?: string[]): string {
    if (!notes || notes.length === 0) return '';
    return `
      <div class="tooltip-bonus-list">
        ${notes.map(n => `<div class="tooltip-bonus-note">${n}</div>`).join('')}
      </div>
    `;
  }
}
