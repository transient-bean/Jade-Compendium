export type Faction = 'human' | 'athan';

export type SkillType = 'Active' | 'Passive' | 'Buff' | 'Curse' | 'Attack' | 'Summon' | 'Array';

export interface SkillPrerequisite {
  skillId: string;
  requiredRank: number;
  skillName?: string;
}

export interface SkillRankEffect {
  rank: number;
  spiritCost?: number | string;
  cooldown?: number | string;
  castTime?: number | string;
  description: string;
  bonusNotes?: string[];
}

export interface Skill {
  id: string;
  name: string;
  chineseName?: string;
  tier: number; // 0 for Initiate, 1-5 for class tiers
  row: number;  // 1-indexed vertical position in tier grid
  col: number;  // 1-indexed horizontal position in tier grid
  top?: number; // pixel top offset
  left?: number; // pixel left offset
  maxRank: number;
  icon: string; // Authentic game icon path or URL
  spriteCoords?: { x: number; y: number };
  type: SkillType;
  description: string;
  prerequisites: SkillPrerequisite[];
  rankEffects: SkillRankEffect[];
}

export interface TomeSkill {
  id: string;
  name: string;
  book: number; // 1, 2, 3
  top: number;
  left: number;
  row?: number;
  col?: number;
  maxRank: number;
  icon: string;
  spriteCoords: { x: number; y: number };
  description: string;
  affectedSkillIds?: string[];
  affectedSkillNames?: string[];
  prerequisites: SkillPrerequisite[];
  rankEffects: SkillRankEffect[];
}

export interface TomeBookDefinition {
  book: number; // 1, 2, 3
  name: string;
  skills: TomeSkill[];
}

export interface TierDefinition {
  tier: number;
  name: string;
  requiredCharacterLevel: number;
  requiredTierPoints: number; // Points needed in previous tier (or Initiate) to invest
  skills: Skill[];
}

export interface ClassDefinition {
  id: string;
  name: string;
  chineseName?: string;
  faction: Faction;
  title: string;
  description: string;
  crestIcon: string;
  weapon: string;
  primaryRole: string;
  tiers: TierDefinition[];
  tomes?: TomeBookDefinition[];
}

export type BuildAllocation = Record<string, number>;
export type TomeAllocation = Record<string, number>;

export interface SavedBuild {
  id: string;
  name: string;
  classId: string;
  timestamp: number;
  totalPoints: number;
  totalTomePoints?: number;
  allocation: BuildAllocation;
  tomeAllocation?: TomeAllocation;
  hashString: string;
  notes?: string;
}

export interface ClassStats {
  // 6 Canonical Jade Dynasty 3.11 Combat Radar Dimensions (0-100 scale):
  dps: number;             // Single-Target Damage / Burst Lethality
  aoe: number;             // Area of Effect Damage / Farming Devastation
  survivability: number;   // HP / Defense / Invincibility / Evasion
  control: number;         // Stun / Sleep / Paralyze / Silence / CC
  support: number;         // Heals / Buffs / Resurrection / Cleanse
  mobilityRange: number;   // Cast Distance / Sprint Speed / Gap Closers

  // Authentic Jade Dynasty Resistances & Base Attributes (0-100 scale):
  stunRes: number;     // Stun Resistance
  silenceRes: number;  // Silence Resistance
  weakenRes: number;   // Weaken Resistance
  sleepRes: number;    // Sleep Resistance
  paralyzeRes: number; // Paralyze Resistance
  attk: number;        // Attack
  defence: number;     // Defence
  accuracy: number;    // Accuracy
  evasion: number;     // Evasion

  // Backward compatibility fields
  singleTarget?: number;
  aoeRange?: number;
  defense?: number;
  vitality?: number;
  controlResists?: number;
  buffsHealing?: number;
  evasionAgility?: number;
  attack?: number;
  mobility?: number;
}

export interface Character {
  id: string;
  name: string;
  classId: string;
  createdAt: number;
  updatedAt: number;
  allocation: BuildAllocation;
  tomeAllocation: TomeAllocation;
}

export interface ClassMetadata {
  id: string;
  name: string;
  chineseName: string;
  faction: Faction;
  title: string;
  description: string;
  crestIcon: string;
  weapon: string;
  role: string;
  hasInitiateTree: boolean;
  sprite?: string;
  spriteCoords?: { x: number; y: number };
  stats: ClassStats;
}
