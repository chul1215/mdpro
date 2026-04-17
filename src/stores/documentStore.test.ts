import { beforeEach, describe, expect, it } from 'vitest';
import { useDocumentStore } from './documentStore';

describe('documentStore', () => {
  beforeEach(() => {
    useDocumentStore.getState().reset();
  });

  it('has a default title and content', () => {
    const state = useDocumentStore.getState();
    expect(state.title).toBe('새 문서');
    expect(state.content).toContain('# 새 문서');
  });

  it('updates title', () => {
    useDocumentStore.getState().setTitle('My Doc');
    expect(useDocumentStore.getState().title).toBe('My Doc');
  });

  it('updates content', () => {
    useDocumentStore.getState().setContent('hello');
    expect(useDocumentStore.getState().content).toBe('hello');
  });

  it('resets to defaults', () => {
    useDocumentStore.getState().setContent('changed');
    useDocumentStore.getState().reset();
    expect(useDocumentStore.getState().title).toBe('새 문서');
    expect(useDocumentStore.getState().content).toContain('# 새 문서');
  });
});
