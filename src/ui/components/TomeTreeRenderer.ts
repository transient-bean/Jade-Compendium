import { TomeBookDefinition } from '../../types/skill.ts';
import { SkillEngine } from '../../engine/SkillEngine.ts';
import { TomeNode, TOME_SCALE } from './TomeNode.ts';

export class TomeTreeRenderer {
  private container: HTMLElement;
  private engine: SkillEngine;
  private tomeNodes: TomeNode[] = [];
  private activeMobileBook: number | 'all' = 1;

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
    this.tomeNodes = [];

    const classDef = this.engine.getClassDefinition();
    if (!classDef.tomes || classDef.tomes.length === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.className = 'tome-empty-notice';
      emptyMsg.textContent = 'Tomes data not available for this class.';
      this.container.appendChild(emptyMsg);
      return;
    }

    // Mobile Tome Book Selector Bar (visible on mobile only)
    const mobileBar = document.createElement('div');
    mobileBar.className = 'mobile-tome-bar';

    const allBtn = document.createElement('button');
    allBtn.className = `mobile-tome-btn ${this.activeMobileBook === 'all' ? 'active' : ''}`;
    allBtn.textContent = 'All Books';
    allBtn.addEventListener('click', () => {
      this.activeMobileBook = 'all';
      grid.dataset.mobileFilter = 'all';
      this.updateMobileBarActiveState(mobileBar);
    });
    mobileBar.appendChild(allBtn);

    for (const book of classDef.tomes) {
      const btn = document.createElement('button');
      btn.className = `mobile-tome-btn ${this.activeMobileBook === book.book ? 'active' : ''}`;
      btn.dataset.bookNum = String(book.book);
      btn.innerHTML = `<span>${book.name || `Book ${book.book}`}</span> <span class="mobile-tome-pts" id="mobile-tome-pts-${book.book}">(${this.engine.getTomeBookPoints(book.book)})</span>`;
      btn.addEventListener('click', () => {
        this.activeMobileBook = book.book;
        grid.dataset.mobileFilter = String(book.book);
        this.updateMobileBarActiveState(mobileBar);
      });
      mobileBar.appendChild(btn);
    }

    this.container.appendChild(mobileBar);

    const grid = document.createElement('div');
    grid.className = 'tome-tree-grid';
    grid.dataset.mobileFilter = String(this.activeMobileBook);

    for (const book of classDef.tomes) {
      const bookCol = this.renderBookColumn(book);
      grid.appendChild(bookCol);
    }

    grid.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.tome-node') && !target.closest('button')) {
        if (this.engine.getSynergyHighlight()) {
          this.engine.clearSynergyHighlight();
        }
      }
    });

    this.container.appendChild(grid);
  }

  private updateMobileBarActiveState(bar: HTMLElement) {
    bar.querySelectorAll('.mobile-tome-btn').forEach(btn => {
      const b = btn as HTMLElement;
      if (this.activeMobileBook === 'all') {
        b.classList.toggle('active', !b.dataset.bookNum);
      } else {
        b.classList.toggle('active', b.dataset.bookNum === String(this.activeMobileBook));
      }
    });
  }

  private renderBookColumn(book: TomeBookDefinition): HTMLElement {
    const col = document.createElement('div');
    col.className = 'tome-book-column';
    col.dataset.bookNum = book.book.toString();

    // Header
    const header = document.createElement('div');
    header.className = 'tome-book-header';

    const titleBox = document.createElement('div');
    titleBox.className = 'tome-title-box';

    const title = document.createElement('div');
    title.className = 'tome-book-name';
    title.textContent = book.name || `Book ${book.book}`;
    titleBox.appendChild(title);

    const subTitle = document.createElement('div');
    subTitle.className = 'tome-book-sub';
    subTitle.textContent = `Tome Book ${book.book}`;
    titleBox.appendChild(subTitle);

    header.appendChild(titleBox);

    const pointsBadge = document.createElement('div');
    pointsBadge.className = 'tome-points-badge';
    pointsBadge.id = `tome-pts-badge-${book.book}`;
    pointsBadge.textContent = `${this.engine.getTomeBookPoints(book.book)} pts`;
    header.appendChild(pointsBadge);

    col.appendChild(header);

    // Canvas Container (Scroll/Parchment Plate)
    const canvasWrapper = document.createElement('div');
    canvasWrapper.className = 'tome-canvas-wrapper';

    const CANVAS_WIDTH = 280;
    const CANVAS_HEIGHT = 430;
    const NODE_SIZE = 44;
    const HALF_NODE = NODE_SIZE / 2;

    // Calculate horizontal bounding box to center tree evenly in 280px canvas
    const minLeft = book.skills.length > 0 ? Math.min(...book.skills.map(s => s.left)) : 18;
    const maxLeft = book.skills.length > 0 ? Math.max(...book.skills.map(s => s.left)) : 175;
    const treePixelWidth = Math.round((maxLeft - minLeft) * TOME_SCALE) + NODE_SIZE;
    const offsetX = Math.max(6, Math.round((CANVAS_WIDTH - treePixelWidth) / 2) - Math.round(minLeft * TOME_SCALE));
    const offsetY = 14;

    // SVG connector lines layer
    const svgLayer = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svgLayer.setAttribute('class', 'tome-svg-connectors');
    svgLayer.setAttribute('width', String(CANVAS_WIDTH));
    svgLayer.setAttribute('height', String(CANVAS_HEIGHT));

    // Build map of skills for prerequisite coordinate lookup
    const skillLookup = new Map(book.skills.map(s => [s.id, s]));

    for (const skill of book.skills) {
      for (const prereq of skill.prerequisites) {
        const parent = skillLookup.get(prereq.skillId);
        if (parent) {
          const x1 = Math.round(parent.left * TOME_SCALE) + offsetX + HALF_NODE;
          const y1 = Math.round(parent.top * TOME_SCALE) + offsetY + HALF_NODE;
          const x2 = Math.round(skill.left * TOME_SCALE) + offsetX + HALF_NODE;
          const y2 = Math.round(skill.top * TOME_SCALE) + offsetY + HALF_NODE;

          const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
          line.setAttribute('x1', x1.toString());
          line.setAttribute('y1', y1.toString());
          line.setAttribute('x2', x2.toString());
          line.setAttribute('y2', y2.toString());
          line.setAttribute('class', 'tome-connector-line');
          line.dataset.parentId = parent.id;
          line.dataset.childId = skill.id;
          svgLayer.appendChild(line);
        }
      }
    }
    canvasWrapper.appendChild(svgLayer);

    // Skill nodes
    for (const skill of book.skills) {
      const nodeX = Math.round(skill.left * TOME_SCALE) + offsetX;
      const nodeY = Math.round(skill.top * TOME_SCALE) + offsetY;
      const node = new TomeNode(skill, this.engine, nodeX, nodeY);
      this.tomeNodes.push(node);
      canvasWrapper.appendChild(node.getElement());
    }

    col.appendChild(canvasWrapper);

    // Footer Reset Button
    const footer = document.createElement('div');
    footer.className = 'tome-book-footer';
    const resetBtn = document.createElement('button');
    resetBtn.className = 'jd-btn';
    resetBtn.style.fontSize = '0.7rem';
    resetBtn.style.padding = '4px 8px';
    resetBtn.textContent = '↺ Reset Book';
    resetBtn.title = `Reset points spent in ${book.name}`;
    resetBtn.addEventListener('click', () => {
      this.engine.resetTomeBook(book.book);
    });
    footer.appendChild(resetBtn);
    col.appendChild(footer);

    return col;
  }

  private onEngineUpdate() {
    // Update individual nodes
    for (const node of this.tomeNodes) {
      node.updateState();
    }

    // Update connector lines active/inactive status
    const lines = this.container.querySelectorAll('.tome-connector-line');
    lines.forEach(lineEl => {
      const line = lineEl as SVGLineElement;
      const parentId = line.dataset.parentId;
      const childId = line.dataset.childId;
      if (parentId && childId) {
        const parentRank = this.engine.getTomeRank(parentId);
        const childRank = this.engine.getTomeRank(childId);
        line.classList.toggle('active', parentRank > 0 && childRank > 0);
        line.classList.toggle('available', parentRank > 0 && childRank === 0);
      }
    });

    // Update book point badges
    const classDef = this.engine.getClassDefinition();
    if (classDef.tomes) {
      for (const book of classDef.tomes) {
        const pts = this.engine.getTomeBookPoints(book.book);
        const badge = document.getElementById(`tome-pts-badge-${book.book}`);
        if (badge) {
          badge.textContent = `${pts} pts`;
        }
        const mobilePts = document.getElementById(`mobile-tome-pts-${book.book}`);
        if (mobilePts) {
          mobilePts.textContent = `(${pts})`;
        }
      }
    }
  }
}
