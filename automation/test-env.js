/* eslint-env node */
import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';

const envPath = resolve(process.cwd(), 'automation/.env');
loadEnv({ path: envPath });

console.log('API Key length:', process.env.ANTHROPIC_API_KEY?.length);
console.log('API Key value:', process.env.ANTHROPIC_API_KEY);
console.log('Contains #:', process.env.ANTHROPIC_API_KEY?.includes('#'));
