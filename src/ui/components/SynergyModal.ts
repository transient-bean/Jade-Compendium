import { Skill, TomeSkill } from '../../types/skill.ts';
import { SkillEngine } from '../../engine/SkillEngine.ts';

export class SynergyModal {
  private static instance: SynergyModal;
  private overlayEl: HTMLElement;

  private constructor() {
    this.overlayEl = document.createElement('div');
    this.overlayEl.className = 'modal-overlay synergy-modal-overlay';
    const parent = document.getElementById('modal-container') || document.body;
    parent.appendChild(this.overlayEl);

    this.overlayEl.addEventListener('click', (e) => {
      if (e.target === this.overlayEl) {
        this.close();
      }
    });
  }

  public static getInstance(): SynergyModal {
    if (!SynergyModal.instance) {
      SynergyModal.instance = new SynergyModal();
    }
    return SynergyModal.instance;
  }

  public close() {
    this.overlayEl.classList.remove('active');
  }

  public showForSkill(skill: Skill, engine: SkillEngine) {
    const influencing = engine.getInfluencingTomes(skill.id);
    const base = import.meta.env.BASE_URL || './';
    const cleanIcon = skill.icon.startsWith('/') ? skill.icon.slice(1) : skill.icon.replace(/^\.\//, '');
    const assetPath = `${base}${cleanIcon}`;

    const iconHtml = skill.spriteCoords
      ? `<div class="synergy-skill-crest" style="background-image: url('${assetPath}'); background-position: -${skill.spriteCoords.x}px -${skill.spriteCoords.y}px;"></div>`
      : `<img class="synergy-skill-crest" src="${skill.icon}" alt="${skill.name}" />`;

    this.overlayEl.innerHTML = `
      <div class="modal-window synergy-modal-window">
        <div class="modal-header">
          <div style="display: flex; align-items: center; gap: 12px;">
            ${iconHtml}
            <div>
              <h3 style="margin: 0; font-size: 1.15rem;">${skill.name}</h3>
              <span class="synergy-sub-header">Tome Influences • Tier ${skill.tier === 0 ? 'Initiate' : skill.tier}</span>
            </div>
          </div>
          <button class="modal-close-btn" id="btn-close-synergy">✕</button>
        </div>

        <div class="modal-content synergy-modal-content">
          <div class="synergy-intro-box">
            <span>📜</span> In authentic Jade Dynasty, Tome skills fundamentally enhance and mutate Faction skills. Below are all the Tomes that empower <strong>${skill.name}</strong>:
          </div>

          ${influencing.length === 0 ? `
            <div class="empty-synergy-notice">
              No Tome skills directly modify this skill.
            </div>
          ` : `
            <div class="synergy-cards-list">
              ${influencing.map(({ tome, bookNum, bookName }) => {
                const currentRank = engine.getTomeRank(tome.id);
                const isInvested = currentRank > 0;
                const tomeCleanIcon = tome.icon.startsWith('/') ? tome.icon.slice(1) : tome.icon.replace(/^\.\//, '');
                const tomeAsset = `${base}${tomeCleanIcon}`;
                const tomeSpriteHtml = `<div class="synergy-tome-crest" style="background-image: url('${tomeAsset}'); background-position: -${tome.spriteCoords.x}px -${tome.spriteCoords.y}px;"></div>`;

                // Rank effect
                const activeEffect = tome.rankEffects.find(r => r.rank === currentRank) || tome.rankEffects[0];
                const maxEffect = tome.rankEffects[tome.rankEffects.length - 1];

                return `
                  <div class="synergy-card ${isInvested ? 'invested' : ''}">
                    <div class="synergy-card-top">
                      <div style="display: flex; align-items: center; gap: 10px;">
                        ${tomeSpriteHtml}
                        <div>
                          <div class="synergy-card-name">${tome.name}</div>
                          <div class="synergy-card-meta">Book ${bookNum} (${bookName})</div>
                        </div>
                      </div>
                      <div class="synergy-rank-pill ${isInvested ? 'active' : ''}">
                        ${isInvested ? `Rank ${currentRank}/${tome.maxRank} (Active)` : `Rank 0/${tome.maxRank}`}
                      </div>
                    </div>

                    <div class="synergy-card-desc">
                      ${isInvested ? `
                        <div class="synergy-active-label">✦ Current Effect (Rank ${currentRank}):</div>
                        <div class="synergy-effect-text">${activeEffect.description.replace(/\n/g, '<br />')}</div>
                      ` : `
                        <div class="synergy-preview-label">✦ Preview Effect (Rank 1):</div>
                        <div class="synergy-effect-text" style="color: #8fa4af;">${tome.rankEffects[0]?.description.replace(/\n/g, '<br />') || tome.description}</div>
                        ${tome.maxRank > 1 ? `
                          <div class="synergy-max-label">Max Rank ${tome.maxRank}:</div>
                          <div class="synergy-effect-text max">${maxEffect.description.replace(/\n/g, '<br />')}</div>
                        ` : ''}
                      `}
                    </div>

                    <div class="synergy-card-footer">
                      <button class="jd-btn btn-jump-to-tome" data-tome-id="${tome.id}" data-book="${bookNum}">
                        🔍 View in Tome Tree (Book ${bookNum}) →
                      </button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>
      </div>
    `;

    this.overlayEl.classList.add('active');
    this.wireSkillModalEvents(engine);
  }

  public showForTome(tome: TomeSkill, engine: SkillEngine) {
    const influencedSkills = engine.getInfluencedSkills(tome.id);
    const base = import.meta.env.BASE_URL || './';
    const cleanIcon = tome.icon.startsWith('/') ? tome.icon.slice(1) : tome.icon.replace(/^\.\//, '');
    const assetPath = `${base}${cleanIcon}`;

    const iconHtml = `<div class="synergy-tome-crest" style="background-image: url('${assetPath}'); background-position: -${tome.spriteCoords.x}px -${tome.spriteCoords.y}px;"></div>`;
    const tomeRank = engine.getTomeRank(tome.id);

    this.overlayEl.innerHTML = `
      <div class="modal-window synergy-modal-window">
        <div class="modal-header">
          <div style="display: flex; align-items: center; gap: 12px;">
            ${iconHtml}
            <div>
              <h3 style="margin: 0; font-size: 1.15rem;">${tome.name}</h3>
              <span class="synergy-sub-header">Influenced Faction Skills • Book ${tome.book}</span>
            </div>
          </div>
          <button class="modal-close-btn" id="btn-close-synergy">✕</button>
        </div>

        <div class="modal-content synergy-modal-content">
          <div class="synergy-intro-box">
            <span>⚔️</span> Investing points in <strong>${tome.name}</strong> ${tomeRank > 0 ? `(currently Rank ${tomeRank}/${tome.maxRank})` : `(Rank 0/${tome.maxRank})`} enhances the following Faction skills:
          </div>

          ${influencedSkills.length === 0 ? `
            <div class="empty-synergy-notice">
              This Tome skill provides passive attributes or general character bonuses rather than directly altering specific Faction skills.
            </div>
          ` : `
            <div class="synergy-cards-list">
              ${influencedSkills.map(skill => {
                const skillRank = engine.getRank(skill.id);
                const isInvested = skillRank > 0;
                const skillCleanIcon = skill.icon.startsWith('/') ? skill.icon.slice(1) : skill.icon.replace(/^\.\//, '');
                const skillAsset = `${base}${skillCleanIcon}`;
                const skillSpriteHtml = skill.spriteCoords
                  ? `<div class="synergy-skill-crest" style="background-image: url('${skillAsset}'); background-position: -${skill.spriteCoords.x}px -${skill.spriteCoords.y}px;"></div>`
                  : `<img class="synergy-skill-crest" src="${skill.icon}" alt="${skill.name}" />`;

                return `
                  <div class="synergy-card ${isInvested ? 'invested' : ''}">
                    <div class="synergy-card-top">
                      <div style="display: flex; align-items: center; gap: 10px;">
                        ${skillSpriteHtml}
                        <div>
                          <div class="synergy-card-name">${skill.name}</div>
                          <div class="synergy-card-meta">Tier ${skill.tier === 0 ? 'Initiate' : skill.tier} • ${skill.type}</div>
                        </div>
                      </div>
                      <div class="synergy-rank-pill ${isInvested ? 'active' : ''}">
                        Rank ${skillRank}/${skill.maxRank}
                      </div>
                    </div>

                    <div class="synergy-card-desc">
                      <div class="synergy-active-label">✦ Enhancement from ${tome.name}:</div>
                      <div class="synergy-effect-text">${tome.rankEffects[Math.max(0, tomeRank - 1)]?.description.replace(/\n/g, '<br />') || tome.description}</div>
                    </div>

                    <div class="synergy-card-footer">
                      <button class="jd-btn btn-jump-to-skill" data-skill-id="${skill.id}" data-tier="${skill.tier}">
                        🔍 View in Faction Tree (Tier ${skill.tier}) →
                      </button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>
      </div>
    `;

    this.overlayEl.classList.add('active');
    this.wireTomeModalEvents(engine);
  }

  private wireSkillModalEvents(engine: SkillEngine) {
    this.overlayEl.querySelector('#btn-close-synergy')?.addEventListener('click', () => this.close());

    this.overlayEl.querySelectorAll('.btn-jump-to-tome').forEach(btn => {
      btn.addEventListener('click', () => {
        const tomeId = (btn as HTMLElement).dataset.tomeId;
        const bookNum = (btn as HTMLElement).dataset.book;
        this.close();

        // 1. Switch to Tomes Tab
        engine.setActiveTab('tomes');

        // 2. Select book on mobile filter bar if needed
        if (bookNum) {
          const mobileTomeBtn = document.querySelector(`.mobile-tome-btn[data-book-num="${bookNum}"]`) as HTMLButtonElement;
          mobileTomeBtn?.click();
        }

        // 3. Highlight and scroll to tome node
        setTimeout(() => {
          const nodeEl = document.querySelector(`[data-tome-id="${tomeId}"]`) as HTMLElement;
          if (nodeEl) {
            nodeEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
            nodeEl.classList.remove('pulse-highlight');
            void nodeEl.offsetWidth; // trigger reflow
            nodeEl.classList.add('pulse-highlight');
            setTimeout(() => nodeEl.classList.remove('pulse-highlight'), 3000);
          }
        }, 150);
      });
    });
  }

  private wireTomeModalEvents(engine: SkillEngine) {
    this.overlayEl.querySelector('#btn-close-synergy')?.addEventListener('click', () => this.close());

    this.overlayEl.querySelectorAll('.btn-jump-to-skill').forEach(btn => {
      btn.addEventListener('click', () => {
        const skillId = (btn as HTMLElement).dataset.skillId;
        const tierNum = (btn as HTMLElement).dataset.tier;
        this.close();

        // 1. Switch to Faction Skills Tab
        engine.setActiveTab('skills');

        // 2. Select tier on mobile filter bar if needed
        if (tierNum !== undefined) {
          const mobileTierBtn = document.querySelector(`.mobile-tier-btn[data-tier-num="${tierNum}"]`) as HTMLButtonElement;
          mobileTierBtn?.click();
        }

        // 3. Highlight and scroll to skill node
        setTimeout(() => {
          const nodeEl = document.querySelector(`[data-skill-id="${skillId}"]`) as HTMLElement;
          if (nodeEl) {
            nodeEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
            nodeEl.classList.remove('pulse-highlight');
            void nodeEl.offsetWidth; // trigger reflow
            nodeEl.classList.add('pulse-highlight');
            setTimeout(() => nodeEl.classList.remove('pulse-highlight'), 3000);
          }
        }, 150);
      });
    });
  }
}
