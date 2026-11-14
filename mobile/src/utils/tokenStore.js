const LEGACY_KEY = '@sangeetx_token';
const SECURE_KEY = 'sangeetx.token';

export function createTokenStore({ native, plain, secure }) {
  return {
    async get() {
      if (!native) return plain.getItem(LEGACY_KEY);
      const token = await secure.getItemAsync(SECURE_KEY);
      if (token) {
        await plain.removeItem(LEGACY_KEY);
        return token;
      }
      const legacy = await plain.getItem(LEGACY_KEY);
      if (legacy) {
        // Only remove the old value after encrypted storage succeeds.
        await secure.setItemAsync(SECURE_KEY, legacy);
        await plain.removeItem(LEGACY_KEY);
      }
      return legacy;
    },
    async set(token) {
      if (!native) {
        if (token) await plain.setItem(LEGACY_KEY, token);
        else await plain.removeItem(LEGACY_KEY);
        return;
      }
      if (token) await secure.setItemAsync(SECURE_KEY, token);
      else await secure.deleteItemAsync(SECURE_KEY);
      await plain.removeItem(LEGACY_KEY);
    },
  };
}
