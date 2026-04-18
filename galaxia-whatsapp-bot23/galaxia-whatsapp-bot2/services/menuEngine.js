/**
 * Menu Engine
 *
 * Core logic for the button-based FAQ chatbot.
 * getResponse(choice, session, botType) → { message, options, image?, link?, carousel? }
 */

const { menuTree } = require("../data/faqMenu");
const { getSession, resetSession } = require("./sessionStore");

/**
 * Process a user's button choice and return the next menu node.
 *
 * @param {string} choice  - The value of the button the user tapped (e.g. "budget_properties")
 * @param {string} userId  - Unique user identifier
 * @param {string} botType - "staycation" or "celebration"
 * @returns {{ message: string, options: Array, image?: string, link?: string, carousel?: Array }}
 */
function getResponse(choice, userId, botType = "staycation") {
  const session = getSession(userId);
  const rootNodeStr = `${botType}_main`;

  /* ── handle "back" navigation ──────────────── */
  if (choice === "back") {
    const prev = session.navStack.pop();
    const target = prev || rootNodeStr;
    session.currentMenu = target;
    return buildResponse(target, rootNodeStr);
  }

  /* ── handle "main" (resets stack) ──────────── */
  if (choice === "main") {
    resetSession(userId);
    return buildResponse(rootNodeStr, rootNodeStr);
  }

  /* ── push current location to stack, navigate ─ */
  if (menuTree[choice]) {
    // Don't push if it's the same menu (avoid duplicate stack entries)
    if (session.currentMenu !== choice) {
      session.navStack.push(session.currentMenu);
    }
    session.currentMenu = choice;
    return buildResponse(choice, rootNodeStr);
  }

  /* ── unknown choice → return main menu ──────── */
  return buildResponse(rootNodeStr, rootNodeStr);
}

/**
 * Build the response object from a menu node.
 */
function buildResponse(nodeKey, rootNodeStr) {
  const node = menuTree[nodeKey];
  if (!node) return buildResponse(rootNodeStr, rootNodeStr); // fallback to root

  return {
    message: node.message,
    options: node.options || [],
    ...(node.image && { image: node.image }),
    ...(node.link && { link: node.link }),
    ...(node.carousel && { carousel: node.carousel })
  };
}

/**
 * Get the initial greeting (main menu).
 */
function getMainMenu(botType = "staycation") {
  return buildResponse(`${botType}_main`, `${botType}_main`);
}

module.exports = { getResponse, getMainMenu };
