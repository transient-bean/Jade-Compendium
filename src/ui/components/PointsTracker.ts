import { SkillEngine, MAX_TOTAL_POINTS, MAX_TOME_POINTS } from '../../engine/SkillEngine.ts';
import { UrlSerializer } from '../../engine/UrlSerializer.ts';
import { Toast } from './Toast.ts';
import { JadeModal } from './JadeModal.ts';

export class PointsTracker {
  private container: HTMLElement;
  private engine: SkillEngine;
  private onOpenBuildsManager: () => void;

  private reqLevelEl!: HTMLElement;
  private skillPtsEl!: HTMLElement;
  private tomePtsEl!: HTMLElement;
  private breakdownEl!: HTMLElement;

  constructor(container: HTMLElement, engine: SkillEngine, onOpenBuildsManager: () => void) {
    this.container = container;
    this.engine = engine;
    this.onOpenBuildsManager = onOpenBuildsManager;
    this.render();
    this.engine.subscribe(this.update.bind(this));
  }

  public setEngine(engine: SkillEngine) {
    this.engine = engine;
    this.engine.subscribe(this.update.bind(this));
    this.render();
  }

  private render() {
    this.container.innerHTML = `
      <div class="points-dashboard">
        <!-- Synergy Highlight Banner (Vanilla JD style) -->
        <div class="synergy-active-banner" id="synergy-active-banner" style="display: none;">
          <div class="synergy-banner-left">
            <span class="synergy-banner-sparkle">✨</span>
            <span id="synergy-banner-text">Highlighting synergies</span>
          </div>
          <div style="display: flex; gap: 8px; align-items: center;">
            <button class="synergy-banner-jump-btn" id="btn-synergy-jump" title="Scroll to highlighted abilities">
              View Synergies ↓
            </button>
            <button class="synergy-banner-clear-btn" id="btn-clear-synergy-banner" title="Clear synergy highlight">
              Clear ✕
            </button>
          </div>
        </div>

        <div class="dashboard-stats">
          <!-- Required Level -->
          <div class="stat-group stat-level-box">
            <span class="stat-label">Req. Character Level</span>
            <span class="stat-value level-value" id="dash-req-level">Lv. ${this.engine.getRequiredPlayerLevel()}</span>
          </div>

          <!-- Faction Skill Points -->
          <div class="stat-group stat-points-box" id="box-stat-skills">
            <span class="stat-label">Faction Skill Points</span>
            <div class="stat-dual-row">
              <span class="stat-value" id="dash-skill-spent">0 / ${MAX_TOTAL_POINTS}</span>
              <span class="stat-sub remaining" id="dash-skill-remaining">150 Left</span>
            </div>
          </div>

          <!-- Tome Points -->
          <div class="stat-group stat-points-box" id="box-stat-tomes">
            <span class="stat-label">Tome Points</span>
            <div class="stat-dual-row">
              <span class="stat-value" id="dash-tome-spent">0 / ${MAX_TOME_POINTS}</span>
              <span class="stat-sub remaining" id="dash-tome-remaining">48 Left</span>
            </div>
          </div>

          <!-- Combined Breakdown (Tier pills & Tome books) -->
          <div class="stat-group breakdown-group">
            <span class="stat-label">Point Investments</span>
            <div class="tier-pills-breakdown" id="dash-breakdown-pills"></div>
          </div>
        </div>

        <!-- Controls -->
        <div class="dashboard-controls">
          <button class="jd-btn btn-primary" id="btn-share-url" title="Copy shareable link directly to clipboard">
            🔗 Copy Build URL
          </button>
          <button class="jd-btn" id="btn-open-builds" title="Manage builds saved in browser">
            💾 Saved Builds
          </button>
          <button class="jd-btn btn-secondary" id="btn-reset-skills" title="Reset all allocated faction skills">
            ↺ Reset Skills
          </button>
          <button class="jd-btn btn-secondary" id="btn-reset-tomes" title="Reset all allocated tomes">
            ↺ Reset Tomes
          </button>
          <button class="jd-btn btn-danger" id="btn-reset-all" title="Reset all invested skill and tome points">
            ✕ Reset All
          </button>
        </div>
      </div>
    `;

    this.reqLevelEl = this.container.querySelector('#dash-req-level')!;
    this.skillPtsEl = this.container.querySelector('#dash-skill-spent')!;
    this.tomePtsEl = this.container.querySelector('#dash-tome-spent')!;
    this.breakdownEl = this.container.querySelector('#dash-breakdown-pills')!;

    this.container.querySelector('#btn-share-url')?.addEventListener('click', () => {
      const url = UrlSerializer.getShareableUrl(
        this.engine.getClassDefinition(),
        this.engine.getAllocation(),
        this.engine.getTomeAllocation()
      );
      navigator.clipboard.writeText(url).then(() => {
        Toast.show('Build link copied to clipboard!');
      }).catch(() => {
        JadeModal.prompt({
          title: 'Share Build Link',
          message: 'Copy your unique build link below:',
          defaultValue: url,
          confirmText: 'Done'
        });
      });
    });

    this.container.querySelector('#btn-open-builds')?.addEventListener('click', () => {
      this.onOpenBuildsManager();
    });

    this.container.querySelector('#btn-reset-skills')?.addEventListener('click', async () => {
      if (this.engine.getTotalPoints() > 0) {
        const confirmed = await JadeModal.confirm({
          title: 'Reset Faction Skills',
          message: 'Reset all allocated faction skill points? Allocated tomes will be preserved.',
          confirmText: 'Reset Skills',
          isDanger: true
        });
        if (confirmed) {
          this.engine.setAllocation({}, this.engine.getTomeAllocation());
          Toast.show('Faction skills reset.');
        }
      }
    });

    this.container.querySelector('#btn-reset-tomes')?.addEventListener('click', async () => {
      if (this.engine.getTotalTomePoints() > 0) {
        const confirmed = await JadeModal.confirm({
          title: 'Reset Tomes',
          message: 'Reset all allocated tome points? Allocated faction skills will be preserved.',
          confirmText: 'Reset Tomes',
          isDanger: true
        });
        if (confirmed) {
          this.engine.resetTomes();
          Toast.show('Tomes reset.');
        }
      }
    });

    this.container.querySelector('#btn-clear-synergy-banner')?.addEventListener('click', () => {
      this.engine.clearSynergyHighlight();
    });

    this.container.querySelector('#btn-synergy-jump')?.addEventListener('click', () => {
      const highlight = this.engine.getSynergyHighlight();
      if (highlight) {
        const targetId = highlight.sourceType === 'skill' ? 'tomes-section-anchor' : 'skills-section-anchor';
        document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });

    this.container.querySelector('#btn-reset-all')?.addEventListener('click', async () => {
      if (this.engine.getTotalPoints() > 0 || this.engine.getTotalTomePoints() > 0) {
        const confirmed = await JadeModal.confirm({
          title: 'Reset All Points',
          message: 'Reset ALL allocated faction skills and tomes for this character build?',
          confirmText: 'Reset All',
          isDanger: true
        });
        if (confirmed) {
          this.engine.resetAll();
          Toast.show('All skill and tome points reset.');
        }
      }
    });

    this.update();
  }

  public update() {
    const totalSkills = this.engine.getTotalPoints();
    const remSkills = this.engine.getRemainingPoints();
    const totalTomes = this.engine.getTotalTomePoints();
    const remTomes = this.engine.getRemainingTomePoints();
    const reqLevel = this.engine.getRequiredPlayerLevel();

    if (this.reqLevelEl) {
      this.reqLevelEl.textContent = `Lv. ${reqLevel}`;
    }

    if (this.skillPtsEl) {
      this.skillPtsEl.textContent = `${totalSkills} / ${MAX_TOTAL_POINTS}`;
      this.skillPtsEl.classList.toggle('full', totalSkills >= MAX_TOTAL_POINTS);
    }

    const skillRemEl = this.container.querySelector('#dash-skill-remaining');
    if (skillRemEl) {
      skillRemEl.textContent = `${remSkills} Left`;
      skillRemEl.classList.toggle('full', remSkills === 0);
    }

    if (this.tomePtsEl) {
      this.tomePtsEl.textContent = `${totalTomes} / ${MAX_TOME_POINTS}`;
      this.tomePtsEl.classList.toggle('full', totalTomes >= MAX_TOME_POINTS);
    }

    const tomeRemEl = this.container.querySelector('#dash-tome-remaining');
    if (tomeRemEl) {
      tomeRemEl.textContent = `${remTomes} Left`;
      tomeRemEl.classList.toggle('full', remTomes === 0);
    }

    if (this.breakdownEl) {
      const classDef = this.engine.getClassDefinition();
      const tierPills = classDef.tiers.map(t => {
        const pts = this.engine.getTierPoints(t.tier);
        const name = t.tier === 0 ? 'Init' : `T${t.tier}`;
        return `
          <div class="tier-pill">
            <span class="pill-name">${name}:</span>
            <span class="pill-val">${pts}</span>
          </div>
        `;
      }).join('');

      const tomePills = (classDef.tomes && classDef.tomes.length > 0)
        ? classDef.tomes.map(b => {
            const pts = this.engine.getTomeBookPoints(b.book);
            return `
              <div class="tier-pill tome-pill">
                <span class="pill-name">B${b.book}:</span>
                <span class="pill-val" style="color: var(--jade-glow);">${pts}</span>
              </div>
            `;
          }).join('')
        : '';

      this.breakdownEl.innerHTML = `${tierPills}${tomePills ? `<span class="breakdown-sep" style="color: var(--gold-border); margin: 0 4px; font-size: 0.75rem;">•</span>${tomePills}` : ''}`;
    }

    // Update Synergy Active Banner
    const highlight = this.engine.getSynergyHighlight();
    const bannerEl = this.container.querySelector('#synergy-active-banner') as HTMLElement;
    const bannerTextEl = this.container.querySelector('#synergy-banner-text');
    const jumpBtn = this.container.querySelector('#btn-synergy-jump') as HTMLElement;

    if (bannerEl && bannerTextEl) {
      if (highlight) {
        bannerEl.style.display = 'flex';
        const isSkill = highlight.sourceType === 'skill';
        const count = isSkill ? highlight.highlightedTomeIds.size : highlight.highlightedSkillIds.size;
        const targetDesc = isSkill ? 'Affecting Tomes' : 'Influenced Faction Skills';
        bannerTextEl.innerHTML = `Highlighting ${targetDesc} for <strong>${highlight.sourceName}</strong> (${count} found)`;
        if (jumpBtn) {
          jumpBtn.textContent = isSkill ? '📜 View Tomes ↓' : '⚔️ View Skills ↑';
        }
      } else {
        bannerEl.style.display = 'none';
      }
    }
  }
}
