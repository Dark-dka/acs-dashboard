import { createContext, useContext, useState } from 'react';
import { isAuthenticated, logout as apiLogout, getCurrentUser } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState({
    isLoggedIn: isAuthenticated(),
    user: getCurrentUser(),
  });

  function onLogin(user) {
    setAuth({ isLoggedIn: true, user });
  }

  function onLogout() {
    apiLogout();
    setAuth({ isLoggedIn: false, user: null });
  }

  return (
    <AuthContext.Provider value={{ ...auth, onLogin, onLogout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
