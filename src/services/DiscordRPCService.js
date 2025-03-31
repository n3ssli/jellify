// Discord RPC service for Jellify
// Provides an interface to the Discord Rich Presence functionality

const updateDiscordPresence = (trackData) => {
  if (!trackData) return;
  return window.electron.discord.updateActivity(trackData);
};

const clearDiscordPresence = () => {
  return window.electron.discord.clearActivity();
};

const isRPCEnabled = () => {
  if (!window.electron || !window.electron.discord) {
    return false;
  }
  return window.electron.discord.isEnabled();
};

const setRPCEnabled = (enabled) => {
  return window.electron.discord.setEnabled(enabled);
};

export {
  updateDiscordPresence,
  clearDiscordPresence,
  isRPCEnabled,
  setRPCEnabled
}; 