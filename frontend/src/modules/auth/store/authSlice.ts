import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { AuthUser } from '../../../lib/types';
import {
  clearStoredAuthState,
  loadAuthState,
  persistAuthState,
} from './authStorage';

type AuthState = {
  user: AuthUser | null;
  token: string | null;
};

const initialStored = loadAuthState();

const initialState: AuthState = {
  user: initialStored.user,
  token: initialStored.token,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ token: string; user: AuthUser }>,
    ) => {
      state.token = action.payload.token;
      state.user = action.payload.user;
      persistAuthState(action.payload.token, action.payload.user);
    },
    logout: (state) => {
      state.token = null;
      state.user = null;
      clearStoredAuthState();
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export const authReducer = authSlice.reducer;
