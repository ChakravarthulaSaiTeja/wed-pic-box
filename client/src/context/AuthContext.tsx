import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { User, AuthState, LoginCredentials, RegisterData } from '../types';
import { authService } from '../services/authService';

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<boolean>;
  register: (userData: RegisterData) => Promise<boolean>;
  logout: () => void;
  updateUser: (user: User) => void;
  clearError: () => void;
}

type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: User }
  | { type: 'SET_TOKEN'; payload: string }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'CLEAR_AUTH' }
  | { type: 'CLEAR_ERROR' };

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case 'SET_TOKEN':
      return { ...state, token: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    case 'CLEAR_AUTH':
      return {
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    default:
      return state;
  }
};

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    // Check for stored authentication data on app load
    const initializeAuth = async () => {
      const storedToken = authService.getStoredToken();
      const storedUser = authService.getStoredUser();

      if (storedToken && storedUser) {
        dispatch({ type: 'SET_TOKEN', payload: storedToken });
        dispatch({ type: 'SET_USER', payload: storedUser });
        
        // Optionally verify token with server
        try {
          const response = await authService.getCurrentUser();
          if (response.success && response.data) {
            dispatch({ type: 'SET_USER', payload: response.data });
          }
        } catch (error) {
          // Token might be invalid, clear auth
          authService.logout();
          dispatch({ type: 'CLEAR_AUTH' });
        }
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    initializeAuth();
  }, []);

  const login = async (credentials: LoginCredentials): Promise<boolean> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'CLEAR_ERROR' });

    try {
      const response = await authService.login(credentials);
      
      if (response.success && response.data) {
        dispatch({ type: 'SET_TOKEN', payload: response.data.token });
        dispatch({ type: 'SET_USER', payload: response.data.user });
        return true;
      } else {
        dispatch({ type: 'SET_ERROR', payload: response.message || 'Login failed' });
        return false;
      }
    } catch (error: any) {
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error.response?.data?.message || 'Login failed' 
      });
      return false;
    }
  };

  const register = async (userData: RegisterData): Promise<boolean> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'CLEAR_ERROR' });

    try {
      const response = await authService.register(userData);
      
      if (response.success && response.data) {
        dispatch({ type: 'SET_TOKEN', payload: response.data.token });
        dispatch({ type: 'SET_USER', payload: response.data.user });
        return true;
      } else {
        dispatch({ type: 'SET_ERROR', payload: response.message || 'Registration failed' });
        return false;
      }
    } catch (error: any) {
      dispatch({ 
        type: 'SET_ERROR', 
        payload: error.response?.data?.message || 'Registration failed' 
      });
      return false;
    }
  };

  const logout = () => {
    authService.logout();
    dispatch({ type: 'CLEAR_AUTH' });
  };

  const updateUser = (user: User) => {
    dispatch({ type: 'SET_USER', payload: user });
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    updateUser,
    clearError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};