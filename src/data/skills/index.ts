import { ClassDefinition, TierDefinition, TomeBookDefinition } from '../../types/skill.ts';
import { CLASSES } from '../classes.ts';

import initiateData from './human/initiate.json';
import jadeonData from './human/jadeon.json';
import vimData from './human/vim.json';
import skysongData from './human/skysong.json';
import lupinData from './human/lupin.json';
import modoData from './human/modo.json';
import incenseMageData from './human/incense_mage.json';

import ardenData from './athan/arden.json';
import baloData from './athan/balo.json';
import rayanData from './athan/rayan.json';
import celanData from './athan/celan.json';
import fortaData from './athan/forta.json';
import voidaData from './athan/voida.json';

interface RawClassJson {
  classId: string;
  tiers: TierDefinition[];
  tomes?: TomeBookDefinition[];
}

const classRawDataMap: Record<string, RawClassJson> = {
  jadeon: jadeonData as unknown as RawClassJson,
  vim: vimData as unknown as RawClassJson,
  skysong: skysongData as unknown as RawClassJson,
  lupin: lupinData as unknown as RawClassJson,
  modo: modoData as unknown as RawClassJson,
  incense_mage: incenseMageData as unknown as RawClassJson,
  arden: ardenData as unknown as RawClassJson,
  balo: baloData as unknown as RawClassJson,
  rayan: rayanData as unknown as RawClassJson,
  celan: celanData as unknown as RawClassJson,
  forta: fortaData as unknown as RawClassJson,
  voida: voidaData as unknown as RawClassJson,
};

const initiateTier: TierDefinition = initiateData as unknown as TierDefinition;

export function cleanSkillDescription(desc?: string): string {
  if (!desc) return '';
  return desc
    // Strip leading "[Skill Name] [N] Rank(s)" header (e.g. "Fox Shadow 7 Ranks", "Vigor 6 Ranks", "Tiger Whisker 3 Ranks")
    .replace(/^\s*[^\n\r]*?\b\d+\s+Ranks?[\.:]*\s*($|\r?\n)/i, '')
    // Strip legacy in-game client instructions (e.g. "Right-click to see how this skill is influenced by your Tome skills.")
    .replace(/Right-click[\s\S]*?(?:\.|$)\s*/gi, '')
    .trim();
}

function sanitizeTiers(tiers: TierDefinition[]): TierDefinition[] {
  return tiers.map(tier => ({
    ...tier,
    skills: tier.skills.map(skill => ({
      ...skill,
      description: cleanSkillDescription(skill.description)
    }))
  }));
}

function sanitizeTomes(tomes?: TomeBookDefinition[]): TomeBookDefinition[] | undefined {
  if (!tomes) return undefined;
  return tomes.map(book => ({
    ...book,
    skills: book.skills.map(tome => ({
      ...tome,
      description: cleanSkillDescription(tome.description)
    }))
  }));
}

export function getClassDefinition(classId: string): ClassDefinition | null {
  const meta = CLASSES.find(c => c.id === classId);
  const data = classRawDataMap[classId];
  if (!meta || !data) return null;

  // If human, prepend Initiate tier
  const rawTiers: TierDefinition[] = meta.hasInitiateTree
    ? [initiateTier, ...data.tiers]
    : [...data.tiers];

  return {
    id: meta.id,
    name: meta.name,
    chineseName: meta.chineseName,
    faction: meta.faction,
    title: meta.title,
    description: meta.description,
    crestIcon: meta.crestIcon,
    weapon: meta.weapon,
    primaryRole: meta.role,
    tiers: sanitizeTiers(rawTiers),
    tomes: sanitizeTomes(data.tomes)
  };
}

export const ALL_CLASS_DEFINITIONS: Record<string, ClassDefinition> = {};
for (const c of CLASSES) {
  const def = getClassDefinition(c.id);
  if (def) {
    ALL_CLASS_DEFINITIONS[c.id] = def;
  }
}
