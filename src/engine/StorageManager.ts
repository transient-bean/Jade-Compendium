import { SavedBuild, ClassDefinition, BuildAllocation, TomeAllocation, Character } from '../types/skill.ts';
import { UrlSerializer } from './UrlSerializer.ts';

const STORAGE_KEY_BUILDS = 'jade_compendium_saved_builds';
const STORAGE_KEY_AUTOSAVE_PREFIX = 'jade_compendium_autosave_';
const STORAGE_KEY_LAST_CLASS = 'jade_compendium_last_class';

export class StorageManager {
  public static getSavedBuilds(classId?: string): SavedBuild[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_BUILDS);
      if (!raw) return [];
      const builds: SavedBuild[] = JSON.parse(raw);
      if (classId) {
        return builds.filter(b => b.classId === classId);
      }
      return builds;
    } catch {
      return [];
    }
  }

  public static saveBuild(
    name: string,
    classDef: ClassDefinition,
    allocation: BuildAllocation,
    tomeAllocation: TomeAllocation = {},
    notes?: string
  ): SavedBuild {
    const builds = this.getSavedBuilds();
    let totalPoints = 0;
    for (const pts of Object.values(allocation)) {
      totalPoints += pts;
    }
    let totalTomePoints = 0;
    for (const pts of Object.values(tomeAllocation)) {
      totalTomePoints += pts;
    }

    const hashString = UrlSerializer.encode(classDef, allocation, tomeAllocation);
    const newBuild: SavedBuild = {
      id: 'build_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      name: name.trim() || `${classDef.name} Build (${new Date().toLocaleDateString()})`,
      classId: classDef.id,
      timestamp: Date.now(),
      totalPoints,
      totalTomePoints,
      allocation,
      tomeAllocation,
      hashString,
      notes
    };

    builds.unshift(newBuild);
    localStorage.setItem(STORAGE_KEY_BUILDS, JSON.stringify(builds));
    return newBuild;
  }

  public static deleteBuild(id: string): boolean {
    const builds = this.getSavedBuilds();
    const filtered = builds.filter(b => b.id !== id);
    if (filtered.length !== builds.length) {
      localStorage.setItem(STORAGE_KEY_BUILDS, JSON.stringify(filtered));
      return true;
    }
    return false;
  }

  public static getBuildById(id: string): SavedBuild | null {
    const builds = this.getSavedBuilds();
    return builds.find(b => b.id === id) || null;
  }

  public static autoSave(classId: string, allocation: BuildAllocation, tomeAllocation: TomeAllocation = {}) {
    try {
      localStorage.setItem(STORAGE_KEY_AUTOSAVE_PREFIX + classId, JSON.stringify({ allocation, tomeAllocation }));
    } catch {
      // Ignore quota error
    }
  }

  public static getAutoSave(classId: string): { allocation: BuildAllocation; tomeAllocation: TomeAllocation } | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_AUTOSAVE_PREFIX + classId);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        if ('allocation' in parsed) {
          return { allocation: parsed.allocation || {}, tomeAllocation: parsed.tomeAllocation || {} };
        }
        return { allocation: parsed, tomeAllocation: {} };
      }
      return null;
    } catch {
      return null;
    }
  }

  public static setLastClass(classId: string) {
    try {
      localStorage.setItem(STORAGE_KEY_LAST_CLASS, classId);
    } catch {
      // Ignore
    }
  }

  public static getLastClass(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEY_LAST_CLASS);
    } catch {
      return null;
    }
  }

  public static exportBuildsAsJson(): string {
    const builds = this.getSavedBuilds();
    return JSON.stringify(builds, null, 2);
  }

  public static importBuildsFromJson(jsonStr: string): number {
    try {
      const imported: SavedBuild[] = JSON.parse(jsonStr);
      if (!Array.isArray(imported)) return 0;
      const current = this.getSavedBuilds();
      const existingIds = new Set(current.map(b => b.id));
      let count = 0;

      for (const b of imported) {
        if (b.name && b.classId && b.allocation) {
          if (existingIds.has(b.id)) {
            b.id = 'build_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
          }
          current.unshift(b);
          count++;
        }
      }

      localStorage.setItem(STORAGE_KEY_BUILDS, JSON.stringify(current));
      return count;
    } catch {
      return 0;
    }
  }

  // ===================== MULTIPLE CHARACTERS SYSTEM =====================
  public static getCharacters(): Character[] {
    try {
      const raw = localStorage.getItem('jade_compendium_characters');
      if (!raw) {
        // Auto-seed initial character if empty
        const initial = this.createInitialCharacter();
        return initial ? [initial] : [];
      }
      const chars: Character[] = JSON.parse(raw);
      if (!Array.isArray(chars) || chars.length === 0) {
        const initial = this.createInitialCharacter();
        return initial ? [initial] : [];
      }
      return chars;
    } catch {
      return [];
    }
  }

  private static createInitialCharacter(): Character | null {
    const lastClass = this.getLastClass() || 'jadeon';
    const autoSave = this.getAutoSave(lastClass);
    const char: Character = {
      id: 'char_' + Date.now(),
      name: `My ${lastClass.charAt(0).toUpperCase() + lastClass.slice(1)}`,
      classId: lastClass,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      allocation: autoSave?.allocation || {},
      tomeAllocation: autoSave?.tomeAllocation || {}
    };
    try {
      localStorage.setItem('jade_compendium_characters', JSON.stringify([char]));
      localStorage.setItem('jade_compendium_active_character_id', char.id);
    } catch {
      // Ignore
    }
    return char;
  }

  public static getActiveCharacterId(): string | null {
    try {
      return localStorage.getItem('jade_compendium_active_character_id');
    } catch {
      return null;
    }
  }

  public static setActiveCharacterId(id: string | null): void {
    try {
      if (id) {
        localStorage.setItem('jade_compendium_active_character_id', id);
      } else {
        localStorage.removeItem('jade_compendium_active_character_id');
      }
    } catch {
      // Ignore
    }
  }

  public static getActiveCharacter(): Character | null {
    const chars = this.getCharacters();
    if (chars.length === 0) return null;
    const activeId = this.getActiveCharacterId();
    const found = chars.find(c => c.id === activeId);
    if (found) return found;
    // Fallback to first character
    this.setActiveCharacterId(chars[0].id);
    return chars[0];
  }

  public static createCharacter(
    name: string,
    classId: string,
    allocation: BuildAllocation = {},
    tomeAllocation: TomeAllocation = {}
  ): Character {
    const chars = this.getCharacters();
    const newChar: Character = {
      id: 'char_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: name.trim() || `New ${classId.charAt(0).toUpperCase() + classId.slice(1)}`,
      classId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      allocation,
      tomeAllocation
    };

    chars.unshift(newChar);
    try {
      localStorage.setItem('jade_compendium_characters', JSON.stringify(chars));
      this.setActiveCharacterId(newChar.id);
      this.setLastClass(classId);
    } catch {
      // Ignore
    }
    return newChar;
  }

  public static updateCharacter(
    id: string,
    allocation: BuildAllocation,
    tomeAllocation: TomeAllocation
  ): void {
    const chars = this.getCharacters();
    const target = chars.find(c => c.id === id);
    if (target) {
      target.allocation = allocation;
      target.tomeAllocation = tomeAllocation;
      target.updatedAt = Date.now();
      try {
        localStorage.setItem('jade_compendium_characters', JSON.stringify(chars));
      } catch {
        // Ignore
      }
    }
  }

  public static renameCharacter(id: string, newName: string): boolean {
    const chars = this.getCharacters();
    const target = chars.find(c => c.id === id);
    if (target && newName.trim()) {
      target.name = newName.trim();
      target.updatedAt = Date.now();
      try {
        localStorage.setItem('jade_compendium_characters', JSON.stringify(chars));
      } catch {
        // Ignore
      }
      return true;
    }
    return false;
  }

  public static deleteCharacter(id: string): boolean {
    let chars = this.getCharacters();
    const filtered = chars.filter(c => c.id !== id);
    if (filtered.length !== chars.length) {
      try {
        localStorage.setItem('jade_compendium_characters', JSON.stringify(filtered));
        if (this.getActiveCharacterId() === id) {
          const nextId = filtered.length > 0 ? filtered[0].id : null;
          this.setActiveCharacterId(nextId);
        }
      } catch {
        // Ignore
      }
      return true;
    }
    return false;
  }
}
