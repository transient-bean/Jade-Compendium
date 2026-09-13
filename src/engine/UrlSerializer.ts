import { ClassDefinition, BuildAllocation, TomeAllocation } from '../types/skill.ts';
import { ALL_CLASS_DEFINITIONS } from '../data/skills/index.ts';

export class UrlSerializer {
  /**
   * Returns a deterministic flat list of all skills for a class definition
   */
  public static getDeterministicSkillList(classDef: ClassDefinition): string[] {
    const skillIds: string[] = [];
    const sortedTiers = [...classDef.tiers].sort((a, b) => a.tier - b.tier);
    for (const tier of sortedTiers) {
      const sortedSkills = [...tier.skills].sort((a, b) => {
        if (a.row !== b.row) return a.row - b.row;
        if (a.col !== b.col) return a.col - b.col;
        return a.id.localeCompare(b.id);
      });
      for (const skill of sortedSkills) {
        skillIds.push(skill.id);
      }
    }
    return skillIds;
  }

  /**
   * Returns deterministic list of tome skill IDs
   */
  public static getDeterministicTomeList(classDef: ClassDefinition): string[] {
    const tomeIds: string[] = [];
    if (!classDef.tomes) return tomeIds;
    const sortedBooks = [...classDef.tomes].sort((a, b) => a.book - b.book);
    for (const book of sortedBooks) {
      const sortedSkills = [...book.skills].sort((a, b) => {
        if (a.top !== b.top) return a.top - b.top;
        if (a.left !== b.left) return a.left - b.left;
        return a.id.localeCompare(b.id);
      });
      for (const skill of sortedSkills) {
        tomeIds.push(skill.id);
      }
    }
    return tomeIds;
  }

  /**
   * Encodes class, skill allocation, and tome allocation into a URL hash string
   * e.g. "#/vim?b=3-2-0-1...&t=2-3-1..."
   */
  public static encode(
    classDef: ClassDefinition,
    allocation: BuildAllocation,
    tomeAllocation: TomeAllocation = {}
  ): string {
    const skillIds = this.getDeterministicSkillList(classDef);
    const ranks = skillIds.map(id => allocation[id] || 0);

    let lastNonZero = ranks.length - 1;
    while (lastNonZero >= 0 && ranks[lastNonZero] === 0) {
      lastNonZero--;
    }
    const trimmedRanks = lastNonZero >= 0 ? ranks.slice(0, lastNonZero + 1) : [];

    // Tomes
    const tomeIds = this.getDeterministicTomeList(classDef);
    const tomeRanks = tomeIds.map(id => tomeAllocation[id] || 0);
    let lastTomeNonZero = tomeRanks.length - 1;
    while (lastTomeNonZero >= 0 && tomeRanks[lastTomeNonZero] === 0) {
      lastTomeNonZero--;
    }
    const trimmedTomeRanks = lastTomeNonZero >= 0 ? tomeRanks.slice(0, lastTomeNonZero + 1) : [];

    const params: string[] = [];
    if (trimmedRanks.length > 0) {
      params.push(`b=${trimmedRanks.join('-')}`);
    }
    if (trimmedTomeRanks.length > 0) {
      params.push(`t=${trimmedTomeRanks.join('-')}`);
    }

    const query = params.length > 0 ? `?${params.join('&')}` : '';
    return `#/${classDef.id}${query}`;
  }

  /**
   * Decodes current window.location.hash or a given hash string
   */
  public static decode(hash: string): {
    classId: string;
    allocation: BuildAllocation;
    tomeAllocation: TomeAllocation;
  } | null {
    if (!hash || !hash.startsWith('#/')) return null;

    const pathPart = hash.slice(2);
    const [classIdPart, queryPart] = pathPart.split('?');
    const classId = classIdPart.trim();

    const classDef = ALL_CLASS_DEFINITIONS[classId];
    if (!classDef) return null;

    const allocation: BuildAllocation = {};
    const tomeAllocation: TomeAllocation = {};

    if (!queryPart) {
      return { classId, allocation, tomeAllocation };
    }

    const params = new URLSearchParams(queryPart);
    const buildStr = params.get('b');
    if (buildStr) {
      const ranks = buildStr.split('-').map(s => parseInt(s, 10) || 0);
      const skillIds = this.getDeterministicSkillList(classDef);
      for (let i = 0; i < Math.min(ranks.length, skillIds.length); i++) {
        const rank = ranks[i];
        if (rank > 0) {
          allocation[skillIds[i]] = rank;
        }
      }
    }

    const tomeStr = params.get('t');
    if (tomeStr) {
      const ranks = tomeStr.split('-').map(s => parseInt(s, 10) || 0);
      const tomeIds = this.getDeterministicTomeList(classDef);
      for (let i = 0; i < Math.min(ranks.length, tomeIds.length); i++) {
        const rank = ranks[i];
        if (rank > 0) {
          tomeAllocation[tomeIds[i]] = rank;
        }
      }
    }

    return { classId, allocation, tomeAllocation };
  }

  /**
   * Generates absolute shareable URL for the current build
   */
  public static getShareableUrl(
    classDef: ClassDefinition,
    allocation: BuildAllocation,
    tomeAllocation: TomeAllocation = {}
  ): string {
    const hash = this.encode(classDef, allocation, tomeAllocation);
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}${hash}`;
  }
}
