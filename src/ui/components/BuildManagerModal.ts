import { SkillEngine } from '../../engine/SkillEngine.ts';
import { StorageManager } from '../../engine/StorageManager.ts';
import { UrlSerializer } from '../../engine/UrlSerializer.ts';
import { Toast } from './Toast.ts';
import { SavedBuild } from '../../types/skill.ts';
import { CLASS_MAP } from '../../data/classes.ts';
import { JadeModal } from './JadeModal.ts';

export class BuildManagerModal {
  private overlayEl: HTMLElement;
  private engine: SkillEngine;
  private onLoadBuildCallback: (build: SavedBuild) => void;

  constructor(engine: SkillEngine, onLoadBuildCallback: (build: SavedBuild) => void) {
    this.engine = engine;
    this.onLoadBuildCallback = onLoadBuildCallback;

    this.overlayEl = document.createElement('div');
    this.overlayEl.className = 'modal-overlay';
    const parent = document.getElementById('modal-container') || document.body;
    parent.appendChild(this.overlayEl);

    this.render();
  }

  public setEngine(engine: SkillEngine) {
    this.engine = engine;
  }

  public open() {
    this.render();
    this.overlayEl.classList.add('active');
  }

  public close() {
    this.overlayEl.classList.remove('active');
  }

  private render() {
    const classDef = this.engine.getClassDefinition();
    const builds = StorageManager.getSavedBuilds();

    this.overlayEl.innerHTML = `
      <div class="modal-window">
        <div class="modal-header">
          <h3>💾 Saved Builds Manager (Browser Storage)</h3>
          <button class="modal-close-btn" id="modal-close">✕</button>
        </div>

        <div class="modal-content">
          <!-- Save Form -->
          <div class="save-form-card">
            <h4>Save Current ${classDef.name} Build</h4>
            <div class="input-row">
              <input
                type="text"
                class="jd-input"
                id="save-build-name"
                placeholder="e.g. PvP Stun Burst, PvE AoE Farm..."
                value="${classDef.name} - ${new Date().toLocaleDateString()}"
              />
              <button class="jd-btn btn-primary" id="btn-do-save">
                Save Build
              </button>
            </div>
          </div>

          <!-- Builds List Header -->
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <h4 style="font-family: var(--font-serif); color: var(--gold-highlight);">
              Saved Builds (${builds.length})
            </h4>
            <div style="display: flex; gap: 8px;">
              <button class="jd-btn" style="font-size: 0.72rem; padding: 4px 8px;" id="btn-export-json">Export JSON</button>
              <button class="jd-btn" style="font-size: 0.72rem; padding: 4px 8px;" id="btn-import-json">Import JSON</button>
            </div>
          </div>

          <!-- Builds List -->
          <div class="builds-list" id="builds-list-container">
            ${this.renderBuildsList(builds)}
          </div>
        </div>
      </div>
    `;

    // Wire close
    this.overlayEl.querySelector('#modal-close')?.addEventListener('click', () => this.close());
    this.overlayEl.addEventListener('click', (e) => {
      if (e.target === this.overlayEl) this.close();
    });

    // Wire Save
    this.overlayEl.querySelector('#btn-do-save')?.addEventListener('click', () => {
      const nameInput = this.overlayEl.querySelector('#save-build-name') as HTMLInputElement;
      const name = nameInput.value.trim() || `${classDef.name} Build`;
      StorageManager.saveBuild(
        name,
        this.engine.getClassDefinition(),
        this.engine.getAllocation(),
        this.engine.getTomeAllocation()
      );
      Toast.show(`Saved "${name}" to browser storage.`);
      this.render();
    });

    // Wire Export
    this.overlayEl.querySelector('#btn-export-json')?.addEventListener('click', () => {
      const json = StorageManager.exportBuildsAsJson();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `jade_compendium_builds_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      Toast.show('Exported builds file downloaded.');
    });

    // Wire Import
    this.overlayEl.querySelector('#btn-import-json')?.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          const content = reader.result as string;
          const count = StorageManager.importBuildsFromJson(content);
          Toast.show(`Imported ${count} builds successfully!`);
          this.render();
        };
        reader.readAsText(file);
      };
      input.click();
    });

    // Wire Action buttons in list
    this.wireListButtons();
  }

  private renderBuildsList(builds: SavedBuild[]): string {
    if (builds.length === 0) {
      return `<div class="empty-builds-msg">No saved builds in your browser yet. Create one above!</div>`;
    }

    return builds.map(b => {
      const meta = CLASS_MAP.get(b.classId);
      const className = meta ? meta.name : b.classId;
      const dateStr = new Date(b.timestamp).toLocaleDateString();

      return `
        <div class="build-card" data-build-id="${b.id}">
          <div class="build-card-left">
            <div class="build-card-name">${b.name}</div>
            <div class="build-card-meta">
              <span><strong>Class:</strong> ${className}</span>
              <span><strong>Skills:</strong> ${b.totalPoints} pts</span>
              ${b.totalTomePoints !== undefined ? `<span><strong>Tomes:</strong> ${b.totalTomePoints} pts</span>` : ''}
              <span><strong>Date:</strong> ${dateStr}</span>
            </div>
          </div>
          <div class="build-card-actions">
            <button class="jd-btn btn-primary btn-load-build" data-id="${b.id}" style="font-size: 0.75rem; padding: 5px 10px;">
              Load
            </button>
            <button class="jd-btn btn-copy-build" data-id="${b.id}" style="font-size: 0.75rem; padding: 5px 10px;">
              Link
            </button>
            <button class="jd-btn btn-danger btn-del-build" data-id="${b.id}" style="font-size: 0.75rem; padding: 5px 10px;">
              ✕
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  private wireListButtons() {
    this.overlayEl.querySelectorAll('.btn-load-build').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = (btn as HTMLElement).dataset.id!;
        const build = StorageManager.getBuildById(id);
        if (build) {
          this.onLoadBuildCallback(build);
          this.close();
          Toast.show(`Loaded build "${build.name}".`);
        }
      });
    });

    this.overlayEl.querySelectorAll('.btn-copy-build').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = (btn as HTMLElement).dataset.id!;
        const build = StorageManager.getBuildById(id);
        if (build) {
          const baseUrl = window.location.origin + window.location.pathname;
          const url = `${baseUrl}${build.hashString}`;
          navigator.clipboard.writeText(url).then(() => {
            Toast.show('Build link copied to clipboard!');
          });
        }
      });
    });

    this.overlayEl.querySelectorAll('.btn-del-build').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = (btn as HTMLElement).dataset.id!;
        const build = StorageManager.getBuildById(id);
        const confirmed = await JadeModal.confirm({
          title: 'Delete Saved Build',
          message: `Are you sure you want to delete the build "${build?.name || 'this build'}"?`,
          confirmText: 'Delete',
          isDanger: true
        });
        if (confirmed) {
          StorageManager.deleteBuild(id);
          this.render();
          Toast.show('Build deleted.');
        }
      });
    });
  }
}
