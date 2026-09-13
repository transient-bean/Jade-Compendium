import { ClassDefinition, Skill, TomeSkill, BuildAllocation, TomeAllocation } from '../types/skill.ts';

export const MAX_TOTAL_POINTS = 150;
export const MAX_TOME_POINTS = 48;

export interface SynergyHighlightState {
  sourceType: 'skill' | 'tome';
  sourceId: string;
  sourceName: string;
  highlightedSkillIds: Set<string>;
  highlightedTomeIds: Set<string>;
}

export class SkillEngine {
  private classDef: ClassDefinition;
  private allocation: BuildAllocation = {};
  private tomeAllocation: TomeAllocation = {};
  private skillMap: Map<string, Skill> = new Map();
  private tomeMap: Map<string, TomeSkill> = new Map();
  private activeTab: 'skills' | 'tomes' = 'skills';
  private synergyHighlight: SynergyHighlightState | null = null;
  private listeners: Array<() => void> = [];

  constructor(
    classDef: ClassDefinition,
    initialAllocation: BuildAllocation = {},
    initialTomeAllocation: TomeAllocation = {}
  ) {
    this.classDef = classDef;
    this.rebuildMaps();
    this.setAllocation(initialAllocation, initialTomeAllocation);
  }

  public setClassDefinition(
    classDef: ClassDefinition,
    initialAllocation: BuildAllocation = {},
    initialTomeAllocation: TomeAllocation = {}
  ) {
    this.classDef = classDef;
    this.synergyHighlight = null;
    this.rebuildMaps();
    this.setAllocation(initialAllocation, initialTomeAllocation);
  }

  public getClassDefinition(): ClassDefinition {
    return this.classDef;
  }

  public getActiveTab(): 'skills' | 'tomes' {
    return this.activeTab;
  }

  public setActiveTab(tab: 'skills' | 'tomes') {
    if (this.activeTab !== tab) {
      this.activeTab = tab;
      this.notifyListeners();
    }
  }

  private rebuildMaps() {
    this.skillMap.clear();
    for (const tier of this.classDef.tiers) {
      for (const skill of tier.skills) {
        this.skillMap.set(skill.id, skill);
      }
    }

    this.tomeMap.clear();
    if (this.classDef.tomes) {
      for (const book of this.classDef.tomes) {
        for (const skill of book.skills) {
          this.tomeMap.set(skill.id, skill);
        }
      }
    }
  }

  public getAllocation(): BuildAllocation {
    return { ...this.allocation };
  }

  public getRank(skillId: string): number {
    return this.allocation[skillId] || 0;
  }

  public getSkill(skillId: string): Skill | undefined {
    return this.skillMap.get(skillId);
  }

  public getTotalPoints(): number {
    let total = 0;
    for (const count of Object.values(this.allocation)) {
      total += count;
    }
    return total;
  }

  public getRemainingPoints(): number {
    return Math.max(0, MAX_TOTAL_POINTS - this.getTotalPoints());
  }

  public getTierPoints(tierNum: number): number {
    const tierDef = this.classDef.tiers.find(t => t.tier === tierNum);
    if (!tierDef) return 0;
    let sum = 0;
    for (const skill of tierDef.skills) {
      sum += this.getRank(skill.id);
    }
    return sum;
  }

  public isTierUnlocked(tierNum: number): boolean {
    const tierDef = this.classDef.tiers.find(t => t.tier === tierNum);
    if (!tierDef) return false;

    // Initiate tier is always unlocked
    if (tierNum === 0) return true;

    // For Athans, Tier 1 has 0 required points and is unlocked
    if (tierNum === 1 && !this.classDef.faction.includes('human')) {
      return true;
    }

    // For Humans, Tier 1 requires 8 points in Initiate (tier 0)
    if (tierNum === 1 && this.classDef.faction === 'human') {
      const initiatePoints = this.getTierPoints(0);
      return initiatePoints >= tierDef.requiredTierPoints;
    }

    // For Tiers 2..5, requires at least 24 points in previous tier
    const prevTierNum = tierNum - 1;
    const prevTierPoints = this.getTierPoints(prevTierNum);
    return prevTierPoints >= tierDef.requiredTierPoints;
  }

  public getTierUnlockRequirement(tierNum: number): { required: number; current: number; prevTierName: string } | null {
    const tierDef = this.classDef.tiers.find(t => t.tier === tierNum);
    if (!tierDef || tierNum === 0) return null;
    if (tierNum === 1 && this.classDef.faction !== 'human') return null;

    const prevTierNum = tierNum - 1;
    const prevTier = this.classDef.tiers.find(t => t.tier === prevTierNum);
    return {
      required: tierDef.requiredTierPoints,
      current: this.getTierPoints(prevTierNum),
      prevTierName: prevTier?.name || `Tier ${prevTierNum}`
    };
  }

  public isSkillUnlocked(skillId: string): boolean {
    const skill = this.skillMap.get(skillId);
    if (!skill) return false;

    // Tier must be unlocked
    if (!this.isTierUnlocked(skill.tier)) return false;

    // Prerequisites must be met
    for (const prereq of skill.prerequisites) {
      const parentRank = this.getRank(prereq.skillId);
      if (parentRank < prereq.requiredRank) {
        return false;
      }
    }

    return true;
  }

  public getUnmetPrerequisites(skillId: string): Array<{ name: string; required: number; current: number }> {
    const skill = this.skillMap.get(skillId);
    if (!skill) return [];
    const unmet: Array<{ name: string; required: number; current: number }> = [];

    for (const prereq of skill.prerequisites) {
      const parent = this.skillMap.get(prereq.skillId);
      const current = this.getRank(prereq.skillId);
      if (current < prereq.requiredRank) {
        unmet.push({
          name: parent?.name || prereq.skillName || prereq.skillId,
          required: prereq.requiredRank,
          current
        });
      }
    }

    return unmet;
  }

  public canAllocate(skillId: string): boolean {
    const skill = this.skillMap.get(skillId);
    if (!skill) return false;
    if (this.getRemainingPoints() <= 0) return false;
    if (this.getRank(skillId) >= skill.maxRank) return false;
    return this.isSkillUnlocked(skillId);
  }

  public allocate(skillId: string, count = 1): boolean {
    const skill = this.skillMap.get(skillId);
    if (!skill) return false;

    let pointsAdded = 0;
    for (let i = 0; i < count; i++) {
      if (this.canAllocate(skillId)) {
        this.allocation[skillId] = (this.allocation[skillId] || 0) + 1;
        pointsAdded++;
      } else {
        break;
      }
    }

    if (pointsAdded > 0) {
      this.notifyListeners();
      return true;
    }
    return false;
  }

  public canDeallocate(skillId: string): boolean {
    const skill = this.skillMap.get(skillId);
    if (!skill) return false;
    const currentRank = this.getRank(skillId);
    if (currentRank <= 0) return false;

    // 1. Check if any skill has points that directly depends on this skill's current rank
    for (const [, otherSkill] of this.skillMap) {
      const otherRank = this.getRank(otherSkill.id);
      if (otherRank > 0) {
        for (const prereq of otherSkill.prerequisites) {
          if (prereq.skillId === skillId) {
            // If reducing 1 point would make currentRank < prereq.requiredRank
            if (currentRank - 1 < prereq.requiredRank) {
              return false;
            }
          }
        }
      }
    }

    // 2. Check if removing 1 point from this tier violates minimum tier points for higher tiers
    const nextTierNum = skill.tier + 1;
    const nextTierDef = this.classDef.tiers.find(t => t.tier === nextTierNum);
    if (nextTierDef) {
      // Check if any higher tier (from nextTierNum upwards) has points allocated
      const hasPointsInHigherTiers = this.classDef.tiers
        .filter(t => t.tier >= nextTierNum)
        .some(t => this.getTierPoints(t.tier) > 0);

      if (hasPointsInHigherTiers) {
        const tierPoints = this.getTierPoints(skill.tier);
        if (tierPoints - 1 < nextTierDef.requiredTierPoints) {
          return false;
        }
      }
    }

    return true;
  }

  public deallocate(skillId: string, count = 1): boolean {
    let pointsRemoved = 0;
    for (let i = 0; i < count; i++) {
      if (this.canDeallocate(skillId)) {
        this.allocation[skillId] = Math.max(0, (this.allocation[skillId] || 0) - 1);
        if (this.allocation[skillId] === 0) {
          delete this.allocation[skillId];
        }
        pointsRemoved++;
      } else {
        break;
      }
    }

    if (pointsRemoved > 0) {
      this.notifyListeners();
      return true;
    }
    return false;
  }

  public resetTier(tierNum: number) {
    // Only reset if higher tiers are also reset, or reset everything higher
    const tiersToReset = this.classDef.tiers.filter(t => t.tier >= tierNum);
    for (const t of tiersToReset) {
      for (const skill of t.skills) {
        delete this.allocation[skill.id];
      }
    }
    this.notifyListeners();
  }

  public resetAll() {
    this.allocation = {};
    this.tomeAllocation = {};
    this.notifyListeners();
  }

  // ===================== TOME METHODS =====================
  public getTomeAllocation(): TomeAllocation {
    return { ...this.tomeAllocation };
  }

  public getTomeRank(tomeId: string): number {
    return this.tomeAllocation[tomeId] || 0;
  }

  public getTome(tomeId: string): TomeSkill | undefined {
    return this.tomeMap.get(tomeId);
  }

  public getTotalTomePoints(): number {
    let total = 0;
    for (const count of Object.values(this.tomeAllocation)) {
      total += count;
    }
    return total;
  }

  public getRemainingTomePoints(): number {
    return Math.max(0, MAX_TOME_POINTS - this.getTotalTomePoints());
  }

  public getTomeBookPoints(bookNum: number): number {
    const bookDef = this.classDef.tomes?.find(b => b.book === bookNum);
    if (!bookDef) return 0;
    let sum = 0;
    for (const skill of bookDef.skills) {
      sum += this.getTomeRank(skill.id);
    }
    return sum;
  }

  public isTomeUnlocked(tomeId: string): boolean {
    const skill = this.tomeMap.get(tomeId);
    if (!skill) return false;

    for (const prereq of skill.prerequisites) {
      const parentRank = this.getTomeRank(prereq.skillId);
      if (parentRank < prereq.requiredRank) {
        return false;
      }
    }
    return true;
  }

  public getUnmetTomePrerequisites(tomeId: string): Array<{ name: string; required: number; current: number }> {
    const skill = this.tomeMap.get(tomeId);
    if (!skill) return [];
    const unmet: Array<{ name: string; required: number; current: number }> = [];

    for (const prereq of skill.prerequisites) {
      const parent = this.tomeMap.get(prereq.skillId);
      const current = this.getTomeRank(prereq.skillId);
      if (current < prereq.requiredRank) {
        unmet.push({
          name: parent?.name || prereq.skillName || prereq.skillId,
          required: prereq.requiredRank,
          current
        });
      }
    }
    return unmet;
  }

  public canAllocateTome(tomeId: string): boolean {
    const skill = this.tomeMap.get(tomeId);
    if (!skill) return false;
    if (this.getRemainingTomePoints() <= 0) return false;
    if (this.getTomeRank(tomeId) >= skill.maxRank) return false;
    return this.isTomeUnlocked(tomeId);
  }

  public allocateTome(tomeId: string, count = 1): boolean {
    const skill = this.tomeMap.get(tomeId);
    if (!skill) return false;

    let pointsAdded = 0;
    for (let i = 0; i < count; i++) {
      if (this.canAllocateTome(tomeId)) {
        this.tomeAllocation[tomeId] = (this.tomeAllocation[tomeId] || 0) + 1;
        pointsAdded++;
      } else {
        break;
      }
    }

    if (pointsAdded > 0) {
      this.notifyListeners();
      return true;
    }
    return false;
  }

  public canDeallocateTome(tomeId: string): boolean {
    const skill = this.tomeMap.get(tomeId);
    if (!skill) return false;
    const currentRank = this.getTomeRank(tomeId);
    if (currentRank <= 0) return false;

    // Check if any other tome skill has points that directly requires this tome skill's rank
    for (const [, otherSkill] of this.tomeMap) {
      const otherRank = this.getTomeRank(otherSkill.id);
      if (otherRank > 0) {
        for (const prereq of otherSkill.prerequisites) {
          if (prereq.skillId === tomeId && currentRank - 1 < prereq.requiredRank) {
            return false;
          }
        }
      }
    }

    return true;
  }

  public deallocateTome(tomeId: string, count = 1): boolean {
    let pointsRemoved = 0;
    for (let i = 0; i < count; i++) {
      if (this.canDeallocateTome(tomeId)) {
        this.tomeAllocation[tomeId] = Math.max(0, (this.tomeAllocation[tomeId] || 0) - 1);
        if (this.tomeAllocation[tomeId] === 0) {
          delete this.tomeAllocation[tomeId];
        }
        pointsRemoved++;
      } else {
        break;
      }
    }

    if (pointsRemoved > 0) {
      this.notifyListeners();
      return true;
    }
    return false;
  }

  public resetTomes() {
    this.tomeAllocation = {};
    this.notifyListeners();
  }

  public resetTomeBook(bookNum: number) {
    const bookDef = this.classDef.tomes?.find(b => b.book === bookNum);
    if (!bookDef) return;
    for (const skill of bookDef.skills) {
      delete this.tomeAllocation[skill.id];
    }
    this.notifyListeners();
  }

  // ===================== DYNAMIC LEVEL CALCULATION =====================
  public getRequiredPlayerLevel(): number {
    let minLevel = 1;

    // Highest unlocked/invested tier requirement
    for (const tier of this.classDef.tiers) {
      if (this.getTierPoints(tier.tier) > 0) {
        minLevel = Math.max(minLevel, tier.requiredCharacterLevel);
      }
    }

    // Tomes require at least Level 45, and each tome point adds to character level up to Lv 90+
    const tomePoints = this.getTotalTomePoints();
    if (tomePoints > 0) {
      minLevel = Math.max(minLevel, 45 + Math.min(45, tomePoints));
    }

    return minLevel;
  }

  public setAllocation(newSkillAlloc: BuildAllocation, newTomeAlloc: TomeAllocation = {}) {
    this.allocation = {};
    this.tomeAllocation = {};

    // Apply skills in tier order
    const sortedTiers = [...this.classDef.tiers].sort((a, b) => a.tier - b.tier);
    for (const tier of sortedTiers) {
      for (const skill of tier.skills) {
        const targetRank = newSkillAlloc[skill.id] || 0;
        for (let r = 0; r < targetRank; r++) {
          if (this.canAllocate(skill.id)) {
            this.allocation[skill.id] = (this.allocation[skill.id] || 0) + 1;
          }
        }
      }
    }

    // Apply tomes iteratively (until prerequisites resolve)
    const tomeSkills = Array.from(this.tomeMap.values());
    let added = true;
    while (added) {
      added = false;
      for (const skill of tomeSkills) {
        const targetRank = newTomeAlloc[skill.id] || 0;
        const currentRank = this.getTomeRank(skill.id);
        if (currentRank < targetRank && this.canAllocateTome(skill.id)) {
          this.tomeAllocation[skill.id] = (this.tomeAllocation[skill.id] || 0) + 1;
          added = true;
        }
      }
    }

    this.notifyListeners();
  }

  // ===================== TOME SYNERGY CROSS-REFERENCING =====================
  public getInfluencingTomes(skillId: string): Array<{ tome: TomeSkill; bookNum: number; bookName: string }> {
    const skill = this.skillMap.get(skillId);
    if (!skill || !this.classDef.tomes) return [];

    const results: Array<{ tome: TomeSkill; bookNum: number; bookName: string }> = [];
    for (const book of this.classDef.tomes) {
      for (const tome of book.skills) {
        const matchesId = tome.affectedSkillIds?.includes(skill.id);
        const matchesName = tome.affectedSkillNames?.some(n => n.toLowerCase() === skill.name.toLowerCase());
        if (matchesId || matchesName) {
          results.push({
            tome,
            bookNum: book.book,
            bookName: book.name || `Book ${book.book}`
          });
        }
      }
    }
    return results;
  }

  public getInfluencedSkills(tomeId: string): Array<Skill> {
    const tome = this.tomeMap.get(tomeId);
    if (!tome) return [];

    const results: Skill[] = [];
    const addedIds = new Set<string>();

    for (const tier of this.classDef.tiers) {
      for (const skill of tier.skills) {
        const matchesId = tome.affectedSkillIds?.includes(skill.id);
        const matchesName = tome.affectedSkillNames?.some(n => n.toLowerCase() === skill.name.toLowerCase());
        if ((matchesId || matchesName) && !addedIds.has(skill.id)) {
          results.push(skill);
          addedIds.add(skill.id);
        }
      }
    }
    return results;
  }

  public getSynergyHighlight(): SynergyHighlightState | null {
    return this.synergyHighlight;
  }

  public setSynergyHighlight(highlight: SynergyHighlightState | null) {
    this.synergyHighlight = highlight;
    this.notifyListeners();
  }

  public clearSynergyHighlight() {
    if (this.synergyHighlight) {
      this.synergyHighlight = null;
      this.notifyListeners();
    }
  }

  public toggleSkillSynergyHighlight(skillId: string): boolean {
    if (this.synergyHighlight && this.synergyHighlight.sourceId === skillId) {
      this.clearSynergyHighlight();
      return false;
    }
    const skill = this.skillMap.get(skillId);
    if (!skill) return false;

    const tomes = this.getInfluencingTomes(skillId);
    const tomeIds = new Set<string>(tomes.map(t => t.tome.id));

    this.setSynergyHighlight({
      sourceType: 'skill',
      sourceId: skillId,
      sourceName: skill.name,
      highlightedSkillIds: new Set([skillId]),
      highlightedTomeIds: tomeIds
    });
    return true;
  }

  public toggleTomeSynergyHighlight(tomeId: string): boolean {
    if (this.synergyHighlight && this.synergyHighlight.sourceId === tomeId) {
      this.clearSynergyHighlight();
      return false;
    }
    const tome = this.tomeMap.get(tomeId);
    if (!tome) return false;

    const skills = this.getInfluencedSkills(tomeId);
    const skillIds = new Set<string>(skills.map(s => s.id));

    this.setSynergyHighlight({
      sourceType: 'tome',
      sourceId: tomeId,
      sourceName: tome.name,
      highlightedSkillIds: skillIds,
      highlightedTomeIds: new Set([tomeId])
    });
    return true;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    for (const listener of this.listeners) {
      listener();
    }
  }
}
