/* eslint-disable import/prefer-default-export */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import client from 'gw2api-client';
import cacheMemory from 'gw2api-client/src/cache/memory';
import { objectFromEntries } from 'ts-extras';

const api = client();
api.cacheStorage(cacheMemory());
api.schema('latest');

interface ApiSkill {
  id: number;
  slot?: string;
}

export const getSkillData = async (skills: number[]) => {
  const data = (await api.skills().many(skills)) as Record<string, ApiSkill>;
  return objectFromEntries(data.map((entry) => [entry.id, entry]));
};
