import { Navigate } from "react-router-dom";
import { tokenManager } from "./utils/secureStorage";

const PrivateRoute = ({ children }) => {
  const token = tokenManager.getToken();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (!tokenManager.isValidToken(token)) {
    tokenManager.clearAll();
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default PrivateRoute;
