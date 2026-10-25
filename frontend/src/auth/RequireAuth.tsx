import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext.js";
import { Loader } from "../components/ui/loader.js";

export function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#fafaf9] dark:bg-[#09090b]">
        <Loader variant="line" size={48} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
