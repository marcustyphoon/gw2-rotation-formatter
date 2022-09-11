/**
 * imported elite insights data (incomplete)
 */
export interface eiSkillCastEntry {
  castTime: number;
  duration: number;
  timeGained: number;
  quickness: number;
}
export interface eiSkillEntry {
  id: number;
  skills: eiSkillCastEntry[];
}
export interface playerData {
  rotation: eiSkillEntry[];
  name: string;
}
export interface eiSkillMapEntry {
  name: string;
  autoAttack: boolean;
  isSwap: boolean;
  canCrit: boolean;
  icon: string;
}
export interface dpsReportData {
  players: playerData[];
  skillMap: Record<string, eiSkillMapEntry>;
  recordedBy: string;
}

/**
 * internal skill dictionary
 */
export interface skillTypeDictionaryEntry {
  name: string;
  id: number;
  idsSet: Set<number>;
  isSwap: boolean;
  autoAttack: boolean;
  instant: boolean;
  shortName: string;
}
export type skillTypeDictionary = Record<number, skillTypeDictionaryEntry>;

/**
 * internal rotation format
 */
export interface generatedSkillCast {
  id: number;
  data?: skillTypeDictionaryEntry;
  castTime?: number;
  instant?: boolean;
  cancelled?: boolean;
  count: number;
}
export type skillCast = Required<generatedSkillCast>;

// lax; can be missing data
export type generatedSkillSequence = generatedSkillCast[];
export interface generatedRotationSkillSequence {
  label: string;
  skillSequence: generatedSkillSequence;
}
export type generatedRotation = generatedRotationSkillSequence[];

// strict
export type skillSequence = skillCast[];
export interface rotationSkillSequence {
  label: string;
  skillSequence: skillSequence;
}
export type rotation = rotationSkillSequence[];

/**
 * used for text output formatting
 */
export interface rotationFormat {
  label: (label: string) => string;
  weaponSwap: () => string;
  skill: (id: number) => string;
  arrow: () => string;
}
