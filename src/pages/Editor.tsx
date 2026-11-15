import { useEffect } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { EditorProvider } from '../contexts/EditorContext';
import EditorLayout from '../components/editor/EditorLayout';
import { getProjectData } from '../utils/projectStorage';

export default function Editor() {
  const { projectId } = useParams<{ projectId: string }>();
  const exists = !!projectId && getProjectData(projectId) !== null;

  useEffect(() => {
    if (!exists) toast.error('This project no longer exists.');
  }, [exists]);

  if (!exists) return <Navigate to="/" replace />;

  return (
    <EditorProvider projectId={projectId} key={projectId}>
      <EditorLayout />
    </EditorProvider>
  );
}
