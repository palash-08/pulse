import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export function NotFoundPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
      <div className="text-6xl font-black text-slate-300">404</div>
      <h1 className="text-xl font-bold text-slate-800 mt-2">Page Not Found</h1>
      <p className="text-xs text-slate-500 mt-1 max-w-sm">
        The page you are looking for doesn't exist, has been removed, or you don't have permission to access it.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors shadow-sm"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Return to Dashboard
      </Link>
    </div>
  );
}
