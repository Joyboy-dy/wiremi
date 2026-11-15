import { beforeEach, describe, expect, it } from 'vitest';
import { createEditorState } from '../contexts/editorReducer';
import {
  createProject, deleteProject, duplicateProject, getProjectData, getProjectsList, renameProject, saveProjectData,
} from './projectStorage';

beforeEach(() => localStorage.clear());

describe('projectStorage', () => {
  it('creates, renames, duplicates and deletes projects', () => {
    const id = createProject({ projectName: 'Shop' });
    renameProject(id, 'Store');
    const copy = duplicateProject(id)!;
    expect(getProjectsList().map(p => p.name).sort()).toEqual(['Store', 'Store copy']);
    deleteProject(id);
    expect(getProjectsList().map(p => p.id)).toEqual([copy]);
  });

  it('saves without history or selection', () => {
    const id = createProject({ projectName: 'A' });
    const state = { ...createEditorState(null), selectedIds: ['x'], past: [{ elements: [], pages: [], timestamp: 0 }] };
    saveProjectData(id, state);
    const saved = getProjectData(id)!;
    expect(saved).not.toHaveProperty('past');
    expect(saved).not.toHaveProperty('selectedIds');
  });

  it('hides list entries whose data is gone', () => {
    const id = createProject({ projectName: 'Ghost' });
    localStorage.removeItem(`wireframe-project-${id}`);
    expect(getProjectsList()).toHaveLength(0);
  });

  it('moves the single project of the first version into the list', () => {
    localStorage.setItem('wireframe-editor-state', JSON.stringify({ projectName: 'Old', elements: [] }));
    expect(getProjectsList().map(p => p.name)).toEqual(['Old']);
    expect(localStorage.getItem('wireframe-editor-state')).toBeNull();
  });
});
