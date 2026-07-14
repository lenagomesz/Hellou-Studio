import { mkdir, readFile, writeFile } from 'node:fs/promises';

const runtimeFile = 'test-results/e2e-runtime.json';

export type E2ERuntime = {
  userEmail?: string;
  userPassword?: string;
  pixOrderId?: string;
  cardOrderId?: string;
  stlOrderId?: string;
};

export async function readRuntime(): Promise<E2ERuntime> {
  try { return JSON.parse(await readFile(runtimeFile, 'utf8')) as E2ERuntime; } catch { return {}; }
}

export async function updateRuntime(values: Partial<E2ERuntime>) {
  await mkdir('test-results', { recursive: true });
  await writeFile(runtimeFile, JSON.stringify({ ...await readRuntime(), ...values }, null, 2));
}
