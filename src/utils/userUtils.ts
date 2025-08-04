import { uniqueNamesGenerator, adjectives, animals } from 'unique-names-generator';
import type { Config } from 'unique-names-generator';

export function getUserId(): string {
  let userId = localStorage.getItem('partykit-user-id');
  if (!userId) {
    userId = crypto.randomUUID();
    localStorage.setItem('partykit-user-id', userId);
  }
  return userId;
}

export function generateRandomName(): string {
  const config: Config = {
    dictionaries: [adjectives, animals],
    length: 2,
    separator: '_',
    style: 'capital'
  };
  
  return uniqueNamesGenerator(config);
} 