import { configureStore } from '@reduxjs/toolkit';
import { authReducer } from '../modules/auth/store/authSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
  },
  devTools: import.meta.env.DEV,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
