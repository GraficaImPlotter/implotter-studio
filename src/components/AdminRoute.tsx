import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";

/**
 * SEC-004: Route guard for admin pages.
 * Prevents non-admin users from loading admin components entirely,
 * complementing the RLS policies on the backend.
 */
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-highlight border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default AdminRoute;
