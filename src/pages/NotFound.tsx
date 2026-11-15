import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center font-mono">
        <h1 className="mb-2 text-4xl font-bold text-foreground">404</h1>
        <p className="mb-6 text-muted-foreground">This page does not exist.</p>
        <Link to="/" className="text-primary hover:underline">
          Back to projects
        </Link>
      </div>
    </div>
  );
}
