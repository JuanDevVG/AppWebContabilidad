// src/utils/ProtectedRoute.jsx

import { isAuthenticated } from './apiService';

export function ProtectedRoute({ children }) {
  if (!isAuthenticated()) {
    return null; // O redirigir a login
  }
  
  return children;
}

export default ProtectedRoute;
