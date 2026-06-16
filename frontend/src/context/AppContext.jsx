import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  getCurrentUserProfile,
  loginUser as loginUserApi,
  registerUser as registerUserApi,
} from '../services/api/auth.js';
import {
  addCartItem as addCartItemApi,
  getCart as getCartApi,
  removeCartItem as removeCartItemApi,
  updateCartItem as updateCartItemApi,
} from '../services/api/cart.js';
import { checkoutCart as checkoutCartApi, getMyOrders as getMyOrdersApi } from '../services/api/orders.js';

const AUTH_TOKEN_KEY = 'rashed_auth_token';
const GUEST_SESSION_KEY = 'rashed_guest_session_id';
const THEME_MODE_KEY = 'rashed_theme_mode';
const THEME_COLORS_KEY_PREFIX = 'rashed_theme_colors_';
const MAX_CLIENT_CART_QUANTITY = 20;

const EMPTY_CART_STATE = {
  id: null,
  userId: null,
  sessionId: null,
  items: [],
  itemCount: 0,
  subtotal: 0,
};

const THEME_COLOR_PRESETS = {
  light: {
    accent: '#39FF14',
    bgCanvas: '#F8FAFC',
    bgSurface: '#FFFFFF',
    textPrimary: '#0F172A',
    textMuted: '#475569',
    borderSoft: '#D1DCE8',
  },
  dark: {
    accent: '#39FF14',
    bgCanvas: '#0F0F0F',
    bgSurface: '#1A1A1A',
    textPrimary: '#F3F5F7',
    textMuted: '#94A3B8',
    borderSoft: '#2A2A2A',
  },
};

const normalizeThemeMode = (value) => (String(value || '').toLowerCase() === 'dark' ? 'dark' : 'light');

const isValidHexColor = (value) => /^#([0-9a-fA-F]{6})$/.test(String(value || '').trim());

const buildThemeColorStorageKey = (mode) => `${THEME_COLORS_KEY_PREFIX}${mode}`;

const readThemeColors = (mode) => {
  return { ...(THEME_COLOR_PRESETS[mode] || THEME_COLOR_PRESETS.light) };
};

const createGuestSessionId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `guest-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
};

const toMoneyNumber = (value) => Number(Number(value || 0).toFixed(2));

const sanitizeCartQuantity = (value) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.max(0, Math.min(MAX_CLIENT_CART_QUANTITY, Math.trunc(parsed)));
};

const normalizeCartItem = (item) => {
  const quantity = sanitizeCartQuantity(item?.quantity);
  const unitPrice = toMoneyNumber(item?.unitPrice ?? item?.price ?? 0);
  const lineTotal = toMoneyNumber(item?.lineTotal ?? item?.totalPrice ?? unitPrice * quantity);

  return {
    ...item,
    id: item?.id ?? item?.cartItemId ?? `temp-${item?.variantId || Date.now()}`,
    cartItemId: item?.cartItemId ?? item?.id ?? `temp-${item?.variantId || Date.now()}`,
    variantId: Number(item?.variantId || 0) || null,
    quantity,
    unitPrice,
    lineTotal,
  };
};

const buildCartStateFromItems = ({ baseCart = {}, items = [] } = {}) => {
  const normalizedItems = (Array.isArray(items) ? items : [])
    .map(normalizeCartItem)
    .filter((item) => item.quantity > 0);

  const subtotal = toMoneyNumber(
    normalizedItems.reduce(
      (accumulator, item) => accumulator + toMoneyNumber(item.lineTotal ?? item.unitPrice * item.quantity),
      0,
    ),
  );

  const itemCount = normalizedItems.reduce(
    (accumulator, item) => accumulator + sanitizeCartQuantity(item.quantity),
    0,
  );

  return {
    ...EMPTY_CART_STATE,
    ...baseCart,
    items: normalizedItems,
    itemCount,
    subtotal,
  };
};

const normalizeCartPayload = (payload) => {
  if (!payload || typeof payload !== 'object') {
    return { ...EMPTY_CART_STATE };
  }

  return buildCartStateFromItems({
    baseCart: {
      ...payload,
      id: payload.id ?? null,
      userId: payload.userId ?? null,
      sessionId: payload.sessionId ?? null,
    },
    items: payload.items,
  });
};

const mutateCartItems = (currentCart, mutateFn) => {
  const nextItems = mutateFn(Array.isArray(currentCart?.items) ? currentCart.items : []);
  return buildCartStateFromItems({
    baseCart: currentCart,
    items: nextItems,
  });
};

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const [apiStatus, setApiStatus] = useState('idle');
  const [authUser, setAuthUser] = useState(null);
  const [authToken, setAuthToken] = useState(() => localStorage.getItem(AUTH_TOKEN_KEY) || '');
  const [authLoading, setAuthLoading] = useState(false);
  const [themeMode, setThemeMode] = useState(() =>
    normalizeThemeMode(localStorage.getItem(THEME_MODE_KEY) || 'light'),
  );
  const [themeColors, setThemeColors] = useState(() => {
    const mode = normalizeThemeMode(localStorage.getItem(THEME_MODE_KEY) || 'light');
    return readThemeColors(mode);
  });
  const [guestSessionId, setGuestSessionId] = useState(() =>
    localStorage.getItem(GUEST_SESSION_KEY) || createGuestSessionId(),
  );
  const [cart, setCart] = useState({ ...EMPTY_CART_STATE });
  const [cartLoading, setCartLoading] = useState(false);
  const [cartSyncing, setCartSyncing] = useState(false);
  const [cartError, setCartError] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [orders, setOrders] = useState([]);

  const persistGuestSessionId = useCallback((sessionId) => {
    localStorage.setItem(GUEST_SESSION_KEY, sessionId);
    setGuestSessionId(sessionId);
    return sessionId;
  }, []);

  const ensureGuestSessionId = useCallback(() => {
    if (guestSessionId) {
      return guestSessionId;
    }

    return persistGuestSessionId(createGuestSessionId());
  }, [guestSessionId, persistGuestSessionId]);

  const getCartSessionId = useCallback(() => {
    if (authToken) {
      return undefined;
    }

    return ensureGuestSessionId();
  }, [authToken, ensureGuestSessionId]);

  const loadCart = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setCartLoading(true);
    }

    setCartError('');

    try {
      const response = await getCartApi({ sessionId: getCartSessionId() });
      const normalizedCart = normalizeCartPayload(response?.data);
      setCart(normalizedCart);
      return normalizedCart;
    } catch (error) {
      setCartError(error?.response?.data?.message || 'Unable to load cart.');
      return null;
    } finally {
      if (!silent) {
        setCartLoading(false);
      }
    }
  }, [getCartSessionId]);

  const addCartItem = useCallback(async ({ variantId, quantity = 1, optimisticItem = null }) => {
    const numericVariantId = Number(variantId);

    if (!Number.isInteger(numericVariantId) || numericVariantId <= 0) {
      return { success: false, message: 'A valid variant is required.' };
    }

    const nextQuantity = Math.max(1, sanitizeCartQuantity(quantity || 1));
    let previousSnapshot = null;

    setCartError('');
    setCartSyncing(true);

    setCart((current) => {
      previousSnapshot = normalizeCartPayload(current);

      return mutateCartItems(current, (items) => {
        const matchIndex = items.findIndex(
          (item) => Number(item.variantId || 0) === numericVariantId,
        );

        if (matchIndex >= 0) {
          return items.map((item, index) => {
            if (index !== matchIndex) {
              return item;
            }

            const updatedQuantity = sanitizeCartQuantity(item.quantity + nextQuantity);

            return {
              ...item,
              quantity: updatedQuantity,
              lineTotal: toMoneyNumber(item.unitPrice * updatedQuantity),
            };
          });
        }

        if (optimisticItem) {
          const optimisticPayload = {
            ...optimisticItem,
            id: optimisticItem.id || `temp-${numericVariantId}`,
            cartItemId: optimisticItem.cartItemId || optimisticItem.id || `temp-${numericVariantId}`,
            variantId: numericVariantId,
            quantity: nextQuantity,
          };

          return [optimisticPayload, ...items];
        }

        return items;
      });
    });

    try {
      const response = await addCartItemApi({
        variantId: numericVariantId,
        quantity: nextQuantity,
        sessionId: getCartSessionId(),
      });
      if (response?.data) {
        setCart(normalizeCartPayload(response.data));
      }
      return { success: true, data: response?.data };
    } catch (error) {
      if (previousSnapshot) {
        setCart(previousSnapshot);
      }

      const message = error?.response?.data?.message || 'Unable to add item to cart.';
      setCartError(message);
      return { success: false, message };
    } finally {
      setCartSyncing(false);
    }
  }, [getCartSessionId]);

  const updateCartItemQuantity = useCallback(async ({ cartItemId, quantity }) => {
    const targetCartItemId = Number(cartItemId);

    if (!Number.isInteger(targetCartItemId) || targetCartItemId <= 0) {
      return { success: false, message: 'A valid cart item is required.' };
    }

    const nextQuantity = sanitizeCartQuantity(quantity);
    let previousSnapshot = null;

    setCartError('');
    setCartSyncing(true);

    setCart((current) => {
      previousSnapshot = normalizeCartPayload(current);

      return mutateCartItems(current, (items) =>
        items
          .map((item) => {
            if (Number(item.id) !== targetCartItemId && Number(item.cartItemId) !== targetCartItemId) {
              return item;
            }

            if (nextQuantity === 0) {
              return null;
            }

            return {
              ...item,
              quantity: nextQuantity,
              lineTotal: toMoneyNumber(item.unitPrice * nextQuantity),
            };
          })
          .filter(Boolean),
      );
    });

    try {
      const response = await updateCartItemApi({
        cartItemId: targetCartItemId,
        quantity: nextQuantity,
        sessionId: getCartSessionId(),
      });
      if (response?.data) {
        setCart(normalizeCartPayload(response.data));
      }
      return { success: true, data: response?.data };
    } catch (error) {
      if (previousSnapshot) {
        setCart(previousSnapshot);
      }

      const message = error?.response?.data?.message || 'Unable to update cart item.';
      setCartError(message);
      return { success: false, message };
    } finally {
      setCartSyncing(false);
    }
  }, [getCartSessionId]);

  const removeCartItemById = useCallback(async (cartItemId) => {
    const targetCartItemId = Number(cartItemId);

    if (!Number.isInteger(targetCartItemId) || targetCartItemId <= 0) {
      return { success: false, message: 'A valid cart item is required.' };
    }

    let previousSnapshot = null;

    setCartError('');
    setCartSyncing(true);

    setCart((current) => {
      previousSnapshot = normalizeCartPayload(current);

      return mutateCartItems(current, (items) =>
        items.filter(
          (item) => Number(item.id) !== targetCartItemId && Number(item.cartItemId) !== targetCartItemId,
        ),
      );
    });

    try {
      const response = await removeCartItemApi({
        cartItemId: targetCartItemId,
        sessionId: getCartSessionId(),
      });
      if (response?.data) {
        setCart(normalizeCartPayload(response.data));
      }
      return { success: true, data: response?.data };
    } catch (error) {
      if (previousSnapshot) {
        setCart(previousSnapshot);
      }

      const message = error?.response?.data?.message || 'Unable to remove item from cart.';
      setCartError(message);
      return { success: false, message };
    } finally {
      setCartSyncing(false);
    }
  }, [getCartSessionId]);

  const checkoutCart = async ({ customer = {}, total } = {}) => {
    setCheckoutLoading(true);
    setCartError('');

    try {
      const response = await checkoutCartApi({
        customer,
        total,
        sessionId: getCartSessionId(),
      });

      setCart({ ...EMPTY_CART_STATE, sessionId: getCartSessionId() || null });

      if (authToken) {
        const myOrders = await getMyOrdersApi();
        setOrders(myOrders?.data || []);
      }

      return { success: true, data: response };
    } catch (error) {
      const message = error?.response?.data?.message || 'Unable to complete checkout.';
      setCartError(message);
      return { success: false, message };
    } finally {
      setCheckoutLoading(false);
    }
  };

  const refreshMyOrders = async () => {
    if (!authToken) {
      setOrders([]);
      return [];
    }

    try {
      const response = await getMyOrdersApi();
      const nextOrders = response?.data || [];
      setOrders(nextOrders);
      return nextOrders;
    } catch (_error) {
      return [];
    }
  };

  const persistToken = (token) => {
    if (token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
      setAuthToken(token);
      return;
    }

    localStorage.removeItem(AUTH_TOKEN_KEY);
    setAuthToken('');
  };

  const loadProfile = async (tokenOverride) => {
    const tokenForRequest = tokenOverride || authToken;

    if (!tokenForRequest) {
      setAuthUser(null);
      return null;
    }

    try {
      const response = await getCurrentUserProfile();
      setAuthUser(response.data);
      return response.data;
    } catch (_error) {
      persistToken('');
      setAuthUser(null);
      return null;
    }
  };

  const login = async ({ email, password }) => {
    setAuthLoading(true);
    try {
      const response = await loginUserApi({ email, password });
      const token = response?.data?.token || '';
      const user = response?.data?.user || null;

      persistToken(token);
      setAuthUser(user);
      await loadProfile(token);

      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        message: error?.response?.data?.message || 'Unable to login right now.',
      };
    } finally {
      setAuthLoading(false);
    }
  };

  const register = async ({ email, password, firstName, lastName }) => {
    setAuthLoading(true);
    try {
      const response = await registerUserApi({ email, password, firstName, lastName });
      const token = response?.data?.token || '';
      const user = response?.data?.user || null;

      persistToken(token);
      setAuthUser(user);
      await loadProfile(token);

      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        message: error?.response?.data?.message || 'Unable to create account right now.',
      };
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = () => {
    persistToken('');
    setAuthUser(null);
    const nextGuestSession = persistGuestSessionId(createGuestSessionId());
    setCart({ ...EMPTY_CART_STATE, sessionId: nextGuestSession });
  };

  const toggleTheme = () => {
    setThemeMode((current) => (current === 'light' ? 'dark' : 'light'));
  };

  const updateThemeColor = (key, value) => {
    if (!Object.prototype.hasOwnProperty.call(THEME_COLOR_PRESETS.light, key)) {
      return false;
    }

    if (!isValidHexColor(value)) {
      return false;
    }

    setThemeColors((current) => ({
      ...current,
      [key]: String(value).trim().toUpperCase(),
    }));

    return true;
  };

  const resetThemeColors = () => {
    setThemeColors({ ...THEME_COLOR_PRESETS[themeMode] });
  };

  useEffect(() => {
    const normalizedMode = normalizeThemeMode(themeMode);

    localStorage.setItem(THEME_MODE_KEY, normalizedMode);

    document.documentElement.classList.toggle('light-mode', normalizedMode === 'light');
    document.documentElement.classList.toggle('dark-mode', normalizedMode === 'dark');

    setThemeColors(readThemeColors(normalizedMode));
  }, [themeMode]);

  useEffect(() => {
    const root = document.documentElement;

    root.style.setProperty('--theme-accent', themeColors.accent);
    root.style.setProperty('--theme-bg-canvas', themeColors.bgCanvas);
    root.style.setProperty('--theme-bg-surface', themeColors.bgSurface);
    root.style.setProperty('--theme-text-primary', themeColors.textPrimary);
    root.style.setProperty('--theme-text-muted', themeColors.textMuted);
    root.style.setProperty('--theme-border-soft', themeColors.borderSoft);

    localStorage.setItem(buildThemeColorStorageKey(themeMode), JSON.stringify(themeColors));
  }, [themeColors, themeMode]);

  useEffect(() => {
    if (authToken) {
      loadProfile();
    }
  }, [authToken]);

  useEffect(() => {
    if (guestSessionId) {
      localStorage.setItem(GUEST_SESSION_KEY, guestSessionId);
      return;
    }

    persistGuestSessionId(createGuestSessionId());
  }, [guestSessionId, persistGuestSessionId]);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  useEffect(() => {
    if (authToken) {
      refreshMyOrders();
    } else {
      setOrders([]);
    }
  }, [authToken]);

  const value = useMemo(
    () => ({
      apiStatus,
      setApiStatus,
      authUser,
      authToken,
      authLoading,
      themeMode,
      themeColors,
      toggleTheme,
      setThemeMode,
      updateThemeColor,
      resetThemeColors,
      login,
      register,
      logout,
      refreshProfile: loadProfile,
      cart,
      cartLoading,
      cartSyncing,
      cartError,
      checkoutLoading,
      orders,
      guestSessionId,
      refreshCart: loadCart,
      addCartItem,
      updateCartItemQuantity,
      removeCartItemById,
      checkoutCart,
      refreshMyOrders,
    }),
    [
      apiStatus,
      authUser,
      authToken,
      authLoading,
      themeMode,
      themeColors,
      cart,
      cartLoading,
      cartSyncing,
      cartError,
      checkoutLoading,
      orders,
      guestSessionId,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error('useAppContext must be used within AppProvider.');
  }

  return context;
};
