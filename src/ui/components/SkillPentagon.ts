import { ClassStats } from '../../types/skill.ts';

export interface StatAxisConfig {
  key: keyof ClassStats;
  name: string;
  chineseName: string;
  val: number;
  desc: string;
}

export interface HeatmapColorInfo {
  textColor: string;
  fill: string;
  stroke: string;
  core: string;
  auraColor: string;
  rating: string;
}

export function getHeatmapColor(val: number | undefined): HeatmapColorInfo {
  const v = val ?? 50;
  if (v < 50) {
    // Bad / Low (Red)
    return {
      textColor: '#ff4d4f',
      fill: '#a81d1d',
      stroke: '#ff7875',
      core: '#ffa39e',
      auraColor: 'rgba(255, 77, 79, 0.40)',
      rating: 'Weak (< 50)'
    };
  } else if (v < 75) {
    // Average / Mid (Amber / Yellow)
    return {
      textColor: '#faad14',
      fill: '#ad6800',
      stroke: '#ffd666',
      core: '#fff1b8',
      auraColor: 'rgba(250, 173, 20, 0.40)',
      rating: 'Moderate (50-74)'
    };
  } else {
    // Good / High (Green)
    return {
      textColor: '#52c41a',
      fill: '#135200',
      stroke: '#95de64',
      core: '#d9f7be',
      auraColor: 'rgba(82, 196, 26, 0.40)',
      rating: 'Superior (≥ 75)'
    };
  }
}

export class CombatRadar {
  private static lightboxInitialized = false;

  /**
   * Initializes global lightbox click listeners for radar charts.
   */
  public static initLightboxListener() {
    if (this.lightboxInitialized || typeof document === 'undefined') return;
    this.lightboxInitialized = true;

    document.addEventListener('click', (e) => {
      const target = (e.target as HTMLElement).closest('.clickable-radar');
      if (target && target.hasAttribute('data-stats')) {
        const raw = target.getAttribute('data-stats');
        if (raw) {
          try {
            const stats = JSON.parse(raw);
            CombatRadar.openLightbox(stats);
          } catch (err) {
            console.error('Failed to parse radar stats', err);
          }
        }
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        CombatRadar.closeLightbox();
      }
    });
  }

  /**
   * Opens a sleek modal lightbox containing the enlarged radar diagram and stats breakdown.
   */
  public static openLightbox(stats: ClassStats) {
    let modal = document.getElementById('chart-lightbox-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'chart-lightbox-modal';
      modal.className = 'chart-lightbox-modal';
      document.body.appendChild(modal);

      modal.addEventListener('click', (e) => {
        if (e.target === modal || (e.target as HTMLElement).id === 'btn-close-chart-lightbox') {
          CombatRadar.closeLightbox();
        }
      });
    }

    const enlargedSvg = CombatRadar.renderSVG(stats, 480, false);
    modal.innerHTML = `
      <div class="chart-lightbox-content">
        <button class="chart-lightbox-close" id="btn-close-chart-lightbox" title="Close (Esc)">✕</button>
        <div class="lightbox-radar-header">
          <span class="lightbox-radar-title">Class Combat & Capability Matrix</span>
          <span class="lightbox-radar-sub">Canonical Jade Dynasty 3.11 Benchmark</span>
        </div>
        ${enlargedSvg}
        <div style="margin-top: 14px; width: 100%;">
          ${CombatRadar.renderStatsOverview(stats)}
        </div>
      </div>
    `;
    modal.classList.add('active');
  }

  /**
   * Closes the enlarged diagram lightbox.
   */
  public static closeLightbox() {
    const modal = document.getElementById('chart-lightbox-modal');
    if (modal) {
      modal.classList.remove('active');
      modal.innerHTML = '';
    }
  }

  /**
   * Generates a canonical 6-axis hexagonal Combat Radar chart.
   * Standardized 6 Canonical Axes for Patch 3.11:
   * 1. DPS (Single-Target Damage / Burst)
   * 2. AoE (Area of Effect Damage / Farming)
   * 3. Control (Stun / Sleep / Paralyze / Silence / CC)
   * 4. Support (Heals / Buffs / Resurrection / Cleanse)
   * 5. Survivability (HP / Defense / Invincibility / Evasion)
   * 6. Mobility & Range (Cast Distance / Sprint Speed / Gap Closers)
   */
  public static renderSVG(stats: ClassStats, size = 165, isInteractive = true): string {
    CombatRadar.initLightboxListener();

    const vbWidth = 380;
    const vbHeight = 330;
    const cx = vbWidth / 2;
    const cy = vbHeight / 2;
    const maxRadius = 86;
    const labelRadius = 112;
    const levels = 5;

    const axes: StatAxisConfig[] = [
      {
        key: 'dps',
        name: 'DPS',
        chineseName: '单体输出',
        val: stats.dps ?? (stats.singleTarget ?? 70),
        desc: 'Single-Target Burst Damage & Critical Lethality'
      },
      {
        key: 'aoe',
        name: 'AoE',
        chineseName: '群体攻击',
        val: stats.aoe ?? (stats.aoeRange ?? 60),
        desc: 'Wide-Area Spell Devastation & Farming Capabilities'
      },
      {
        key: 'control',
        name: 'Control',
        chineseName: '控制能力',
        val: stats.control ?? (stats.controlResists ?? 70),
        desc: 'Crowd Control (Stun, Sleep, Paralyze, Silence, Entangle)'
      },
      {
        key: 'support',
        name: 'Support',
        chineseName: '团队辅助',
        val: stats.support ?? (stats.buffsHealing ?? 30),
        desc: 'Healing Sustain, Invulnerability Auras & Buffs'
      },
      {
        key: 'survivability',
        name: 'Survivability',
        chineseName: '生存能力',
        val: stats.survivability ?? (stats.defense ?? 60),
        desc: 'Health Pool, Physical Armor, Invincibility & Shields'
      },
      {
        key: 'mobilityRange',
        name: 'Mobility & Range',
        chineseName: '机动射程',
        val: stats.mobilityRange ?? (stats.evasionAgility ?? 70),
        desc: 'Cast Distance, Sprint Speed, Stealth & Gap Closers'
      }
    ];

    const count = 6;
    const step = (2 * Math.PI) / count;
    // Start with 12 o'clock (-PI / 2)
    const angles = axes.map((_, i) => -Math.PI / 2 + i * step);

    // 1. Concentric Hexagonal Rings
    let gridRingsSvg = '';
    for (let l = 1; l <= levels; l++) {
      const r = (maxRadius / levels) * l;
      const points = angles.map(a => {
        const x = cx + r * Math.cos(a);
        const y = cy + r * Math.sin(a);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(' ');
      const strokeColor = l === levels ? '#8a6f3b' : (l % 2 === 0 ? '#5a4628' : 'rgba(90, 70, 40, 0.45)');
      const strokeWidth = l === levels ? 1.5 : 1;
      gridRingsSvg += `<polygon points="${points}" fill="none" stroke="${strokeColor}" stroke-width="${strokeWidth}"/>`;
    }

    // 2. Radial Axis Spokes with Endpoint Nodes
    let spokesSvg = '';
    let endpointNodesSvg = '';
    for (const a of angles) {
      const x2 = cx + maxRadius * Math.cos(a);
      const y2 = cy + maxRadius * Math.sin(a);
      spokesSvg += `<line x1="${cx}" y1="${cy}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#6a522e" stroke-dasharray="2,2" stroke-width="1"/>`;
      // Small decorative endpoint node
      endpointNodesSvg += `
        <rect
          x="${(x2 - 2).toFixed(1)}"
          y="${(y2 - 2).toFixed(1)}"
          width="4"
          height="4"
          fill="#c5a059"
          stroke="#382c1e"
          stroke-width="1"
          transform="rotate(45, ${x2.toFixed(1)}, ${y2.toFixed(1)})"
        />
      `;
    }

    // 3. Stat Polygon
    const statPoints = angles.map((a, i) => {
      const val = Math.max(15, Math.min(100, axes[i].val));
      const r = (maxRadius / 100) * val;
      const x = cx + r * Math.cos(a);
      const y = cy + r * Math.sin(a);
      return { x, y };
    });

    const statPolygonStr = statPoints.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

    // 4. Heatmap Diamond Jade Nodes on vertices (Red if <50, Amber if 50-74, Green if >=75)
    let diamondNodesSvg = '';
    for (let i = 0; i < statPoints.length; i++) {
      const p = statPoints[i];
      const ax = axes[i];
      const heat = getHeatmapColor(ax.val);
      diamondNodesSvg += `
        <g transform="translate(${p.x.toFixed(1)}, ${p.y.toFixed(1)})">
          <circle cx="0" cy="0" r="7.5" fill="${heat.auraColor}" />
          <polygon points="0,-5 5,0 0,5 -5,0" fill="${heat.fill}" stroke="${heat.stroke}" stroke-width="1.3">
            <title>${ax.name} (${ax.chineseName}): ${ax.val}/100 • [${heat.rating}] • ${ax.desc}</title>
          </polygon>
          <circle cx="0" cy="0" r="1.6" fill="${heat.core}" />
        </g>
      `;
    }

    // 5. Stylized Heatmap-Coded Labels with Chinese/English
    let labelsSvg = '';
    for (let i = 0; i < count; i++) {
      const a = angles[i];
      const ax = axes[i];
      const heat = getHeatmapColor(ax.val);
      const cos = Math.cos(a);
      const sin = Math.sin(a);

      let anchor = 'middle';
      let dx = 0;
      let dy = 0;

      if (Math.abs(cos) < 0.25) {
        anchor = 'middle';
        dy = sin < 0 ? -10 : 14;
      } else if (cos > 0.25) {
        anchor = 'start';
        dx = 8;
        dy = sin < -0.3 ? -3 : (sin > 0.3 ? 7 : 3);
      } else {
        anchor = 'end';
        dx = -8;
        dy = sin < -0.3 ? -3 : (sin > 0.3 ? 7 : 3);
      }

      const lx = cx + labelRadius * cos + dx;
      const ly = cy + labelRadius * sin + dy;

      labelsSvg += `
        <text
          x="${lx.toFixed(1)}"
          y="${ly.toFixed(1)}"
          text-anchor="${anchor}"
          font-family="'Cinzel', 'Noto Serif SC', serif"
          font-size="10.5"
          font-weight="600"
          letter-spacing="0.04em"
        >
          <tspan fill="#dfc27d">${ax.name}</tspan> <tspan fill="${heat.textColor}" font-weight="700">${ax.val}</tspan>
          <title>${ax.name} (${ax.chineseName}): ${ax.val}/100 • [${heat.rating}] • ${ax.desc}</title>
        </text>
      `;
    }

    // Calculate overall capability rating for heatmap polygon fill
    const avgVal = axes.reduce((acc, a) => acc + a.val, 0) / axes.length;
    const overallHeat = getHeatmapColor(avgVal);

    const uniqueId = `radar_${Math.round(size)}_${Math.floor(Math.random() * 10000)}`;
    const height = Math.round(size * (vbHeight / vbWidth));
    const safeStats = JSON.stringify(stats).replace(/"/g, '&quot;');

    return `
      <div
        class="skill-pentagon-container clickable-radar"
        ${isInteractive ? `data-stats="${safeStats}" title="🔍 Click to enlarge 6-axis combat matrix"` : ''}
        style="width: ${size}px; height: ${height}px; display: inline-flex; align-items: center; justify-content: center; ${isInteractive ? 'cursor: zoom-in;' : ''}"
      >
        <svg viewBox="0 0 ${vbWidth} ${vbHeight}" width="${size}" height="${height}" class="skill-pentagon-svg">
          <defs>
            <radialGradient id="radarHeatGlow_${uniqueId}" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="${overallHeat.textColor}" stop-opacity="0.45" />
              <stop offset="65%" stop-color="${overallHeat.fill}" stop-opacity="0.30" />
              <stop offset="100%" stop-color="#15120e" stop-opacity="0.12" />
            </radialGradient>
            <filter id="heatEngrave_${uniqueId}" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="0" stdDeviation="2.5" flood-color="${overallHeat.textColor}" flood-opacity="0.6"/>
            </filter>
          </defs>
          ${gridRingsSvg}
          ${spokesSvg}
          ${endpointNodesSvg}
          <polygon
            points="${statPolygonStr}"
            fill="url(#radarHeatGlow_${uniqueId})"
            stroke="${overallHeat.stroke}"
            stroke-width="1.8"
            filter="url(#heatEngrave_${uniqueId})"
          />
          ${diamondNodesSvg}
          ${labelsSvg}
          <!-- Heatmap Legend Bar -->
          <g transform="translate(${cx - 95}, ${vbHeight - 12})">
            <circle cx="0" cy="0" r="3.5" fill="#ff4d4f" />
            <text x="6" y="3.2" fill="#ff7875" font-size="8" font-family="'Cinzel', serif">Weak &lt;50</text>
            <circle cx="65" cy="0" r="3.5" fill="#faad14" />
            <text x="71" y="3.2" fill="#ffd666" font-size="8" font-family="'Cinzel', serif">Mid 50-74</text>
            <circle cx="135" cy="0" r="3.5" fill="#52c41a" />
            <text x="141" y="3.2" fill="#95de64" font-size="8" font-family="'Cinzel', serif">Good ≥75</text>
          </g>
        </svg>
      </div>
    `;
  }

  /**
   * Renders the authentic detailed attributes overview breakdown (Combat + 5 Great Resistances) with Heatmap indicators.
   */
  public static renderStatsOverview(stats: ClassStats): string {
    const renderBadge = (label: string, val: number | undefined) => {
      const heat = getHeatmapColor(val);
      const displayVal = val !== undefined ? val : '-';
      return `
        <div class="so-badge" style="border: 1px solid ${heat.stroke}40; background: linear-gradient(135deg, rgba(20, 15, 10, 0.9), ${heat.fill}28);" title="${label}: ${displayVal} • ${heat.rating}">
          <span class="so-lbl">${label}</span>
          <span class="so-num" style="color: ${heat.textColor}">${displayVal}</span>
        </div>
      `;
    };

    return `
      <div class="stats-overview-box">
        <div class="so-group">
          <div class="so-group-header">⚔️ Core Combat Attributes</div>
          <div class="so-group-grid">
            ${renderBadge('Attk', stats.attk)}
            ${renderBadge('Defence', stats.defence)}
            ${renderBadge('Accuracy', stats.accuracy)}
            ${renderBadge('Evasion', stats.evasion)}
          </div>
        </div>

        <div class="so-group" style="margin-top: 8px;">
          <div class="so-group-header">🛡️ The 5 Great Resistances (五大抗性)</div>
          <div class="so-group-grid so-grid-5">
            ${renderBadge('Stun 晕眩', stats.stunRes)}
            ${renderBadge('Silence 沉默', stats.silenceRes)}
            ${renderBadge('Weaken 虚弱', stats.weakenRes)}
            ${renderBadge('Sleep 昏睡', stats.sleepRes)}
            ${renderBadge('Paralyze 定身', stats.paralyzeRes)}
          </div>
        </div>
      </div>
    `;
  }
}

// Backward compatibility aliases
export const SkillPentagon = CombatRadar;
export const ClassStatRadar = CombatRadar;
