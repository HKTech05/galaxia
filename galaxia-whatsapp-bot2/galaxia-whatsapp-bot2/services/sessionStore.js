/**
 * Session Store
 * 
 * Tracks each user's current menu position and navigation history.
 * Sessions auto-expire after 30 minutes of inactivity.
 */

const SESSION_TTL = 30 * 60 * 1000; // 30 minutes

const sessions = {};

function getSession(userId) {
  if (!sessions[userId]) {
    sessions[userId] = {
      currentMenu: "main",
      navStack: [],
      lastActivity: Date.now()
    };
  }
  sessions[userId].lastActivity = Date.now();
  return sessions[userId];
}

function resetSession(userId) {
  sessions[userId] = {
    currentMenu: "main",
    navStack: [],
    lastActivity: Date.now()
  };
  return sessions[userId];
}

/* clean up stale sessions every 10 minutes */
setInterval(() => {
  const now = Date.now();
  for (const userId in sessions) {
    if (now - sessions[userId].lastActivity > SESSION_TTL) {
      delete sessions[userId];
    }
  }
}, 10 * 60 * 1000);

module.exports = { getSession, resetSession };