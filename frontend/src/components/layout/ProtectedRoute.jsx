import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/store/auth';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute({ children, roles }) {
  const { user, loading, initialised, init } = useAuth();
  const location = useLocation();

  useEffect(() => { if (!initialised) init(); }, [initialised, init]);

  if (!initialised || loading) {
    return (
      <div className="grid h-screen place-items-center text-muted-fg">
        <Loader2 className="size-8 animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth/login" state={{ from: location }} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}
