import type { EditorState, ProjectMeta } from '../types/editor';

const PROJECTS_LIST_KEY = 'wireframe-projects-list';
const LEGACY_KEY = 'wireframe-editor-state';
const projectKey = (id: string) => `wireframe-project-${id}`;

export type SavedProject = Omit<EditorState, 'past' | 'future' | 'lastCheckpoint' | 'selectedIds'>;

function readJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/** Moves the single project of the first version into the project list. */
function migrateLegacyProject(): void {
  const legacy = readJSON<Partial<SavedProject>>(LEGACY_KEY);
  if (!legacy) return;
  if (legacy.elements) {
    const id = crypto.randomUUID();
    const now = Date.now();
    localStorage.setItem(projectKey(id), JSON.stringify(legacy));
    const meta: ProjectMeta = {
      id,
      name: legacy.projectName || 'Untitled Project',
      createdAt: now,
      updatedAt: now,
      pageCount: legacy.pages?.length || 1,
    };
    localStorage.setItem(PROJECTS_LIST_KEY, JSON.stringify([meta, ...readList()]));
  }
  localStorage.removeItem(LEGACY_KEY);
}

function readList(): ProjectMeta[] {
  const list = readJSON<ProjectMeta[]>(PROJECTS_LIST_KEY);
  return Array.isArray(list) ? list : [];
}

export function getProjectsList(): ProjectMeta[] {
  migrateLegacyProject();
  // Drop entries whose data is gone, so the dashboard never opens an empty project.
  const list = readList().filter(p => localStorage.getItem(projectKey(p.id)) !== null);
  return list.sort((a, b) => b.updatedAt - a.updatedAt);
}

function saveProjectsList(projects: ProjectMeta[]): void {
  localStorage.setItem(PROJECTS_LIST_KEY, JSON.stringify(projects));
}

export function getProjectData(id: string): Partial<SavedProject> | null {
  return readJSON<Partial<SavedProject>>(projectKey(id));
}

/** Throws when the browser storage is full. */
export function saveProjectData(id: string, state: EditorState): void {
  const { past, future, lastCheckpoint, selectedIds, ...data } = state;
  localStorage.setItem(projectKey(id), JSON.stringify(data));
  const projects = readList();
  const meta = projects.find(p => p.id === id);
  if (meta) {
    meta.name = state.projectName.trim() || 'Untitled Project';
    meta.updatedAt = Date.now();
    meta.pageCount = state.pages.length;
    saveProjectsList(projects);
  }
}

/** Creates a project from saved data and returns its id. */
export function createProject(data: Partial<SavedProject> & { projectName: string }): string {
  const id = crypto.randomUUID();
  const now = Date.now();
  localStorage.setItem(projectKey(id), JSON.stringify(data));
  const meta: ProjectMeta = {
    id,
    name: data.projectName.trim() || 'Untitled Project',
    createdAt: now,
    updatedAt: now,
    pageCount: data.pages?.length || 1,
  };
  saveProjectsList([meta, ...readList()]);
  return id;
}

export function duplicateProject(id: string): string | null {
  const data = getProjectData(id);
  if (!data) return null;
  return createProject({ ...data, projectName: `${data.projectName || 'Untitled Project'} copy` });
}

export function renameProject(id: string, name: string): void {
  const data = getProjectData(id);
  const projectName = name.trim() || 'Untitled Project';
  if (data) localStorage.setItem(projectKey(id), JSON.stringify({ ...data, projectName }));
  saveProjectsList(readList().map(p => (p.id === id ? { ...p, name: projectName, updatedAt: Date.now() } : p)));
}

export function deleteProject(id: string): void {
  localStorage.removeItem(projectKey(id));
  saveProjectsList(readList().filter(p => p.id !== id));
}
