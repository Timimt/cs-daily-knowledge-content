import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { LoadingState } from "./Feedback";

export function AdminGuard() {
  const auth = useAuth();
  const location = useLocation();

  if (auth.loading) {
    return (
      <div className="page-container">
        <LoadingState label="正在確認登入狀態…" />
      </div>
    );
  }
  if (!auth.authenticated) {
    return (
      <Navigate
        to="/admin/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }
  return <Outlet />;
}
