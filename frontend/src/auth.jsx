import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from './api.js';

const Ctx = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined);
  const refresh = useCallback(async () => { try { setUser(await api('/auth/me')); } catch { setUser(null); } }, []);
  useEffect(() => { refresh(); }, [refresh]);
  const after = async u => { setUser(u); try { await api('/shop/cart/merge', { method: 'POST' }); } catch { /* cart stays as guest cart */ } window.dispatchEvent(new Event('cart:changed')); };
  const login = async (email, password) => after(await api('/auth/login', { method: 'POST', body: { email, password } }));
  const register = async (name, email, password) => after(await api('/auth/register', { method: 'POST', body: { name, email, password } }));
  const google = async session_id => after(await api('/auth/google/session', { method: 'POST', body: { session_id } }));
  const logout = async () => { await api('/auth/logout', { method: 'POST' }); setUser(null); window.dispatchEvent(new Event('cart:changed')); };
  return <Ctx.Provider value={{ user, refresh, login, register, google, logout }}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);

export function startGoogle(next = '/arbeitsbereich') {
  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  sessionStorage.setItem('nx_after_login', next);
  const redirectUrl = window.location.origin + '/anmelden';
  window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
}
