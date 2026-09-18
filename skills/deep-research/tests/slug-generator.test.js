import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateSlug } from '../scripts/slug-generator.js';

test('generateSlug: removes PT-BR stopwords', () => {
  const slug = generateSlug('como automatizar a emissao de nota fiscal', new Date('2026-05-12'));
  assert.match(slug, /^2026-05-12-/);
  assert.doesNotMatch(slug, /\b(a|de|como|para)\b/);
  assert.match(slug, /automatizar/);
  assert.match(slug, /emissao/);
});

test('generateSlug: removes EN stopwords', () => {
  const slug = generateSlug('the best way to build a saas in 2026', new Date('2026-05-12'));
  assert.doesNotMatch(slug, /\b(the|to|a|in)\b/);
  assert.match(slug, /best/);
  assert.match(slug, /saas/);
  assert.match(slug, /2026/);
});

test('generateSlug: produces kebab-case', () => {
  const slug = generateSlug('Multi-Tenant SaaS Boilerplate', new Date('2026-05-12'));
  assert.match(slug, /^2026-05-12-[a-z0-9-]+$/);
  assert.doesNotMatch(slug, /[A-Z]/);
  assert.doesNotMatch(slug, /[ _.]/);
});

test('generateSlug: max 50 chars (excluding date prefix)', () => {
  const longQuery = 'como construir uma plataforma completa de gestao financeira pessoal com integracao bancaria automatica';
  const slug = generateSlug(longQuery, new Date('2026-05-12'));
  const withoutDate = slug.replace(/^\d{4}-\d{2}-\d{2}-/, '');
  assert.ok(withoutDate.length <= 50, `Slug too long: ${withoutDate.length} chars`);
});

test('generateSlug: preserves technical terms (NFS-e, MCP, AI)', () => {
  const slug = generateSlug('automatizar NFS-e via MCP usando AI', new Date('2026-05-12'));
  assert.match(slug, /nfse/);
  assert.match(slug, /mcp/);
  assert.match(slug, /ai/);
});

test('generateSlug: removes special chars except hyphen', () => {
  const slug = generateSlug('queries: how to use APIs (REST/GraphQL)?', new Date('2026-05-12'));
  assert.doesNotMatch(slug, /[:()?/]/);
});

test('generateSlug: deterministic (same input = same output)', () => {
  const date = new Date('2026-05-12');
  const a = generateSlug('automatizar NFS-e Claude Code', date);
  const b = generateSlug('automatizar NFS-e Claude Code', date);
  assert.equal(a, b);
});

test('generateSlug: handles accents (preserves ASCII equivalent)', () => {
  const slug = generateSlug('automacao de produçao com inteligência artificial', new Date('2026-05-12'));
  assert.doesNotMatch(slug, /[áàâãéèêíïóôõöúçÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ]/);
  assert.match(slug, /producao/);
  assert.match(slug, /inteligencia/);
});
