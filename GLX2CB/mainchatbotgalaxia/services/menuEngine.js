/**
 * Menu Engine
 *
 * Core logic for the button-based FAQ chatbot.
 * getResponse(choice, session, botType) → { message, options, image?, link?, carousel? }
 *
 * Supports bot types:
 *   - "staycation"     → Staycation website chatbot
 *   - "celebration"    → Digital Diaries chatbot
 *   - "ambrose_ig"     → Ambrose IG chatbot
 *   - "amstelnest_ig"  → Amstel Nest IG chatbot
 *   - "laparaiso_ig"   → La Paraiso IG chatbot
 *   - "mountview_ig"   → Mount View IG chatbot
 *   - "heavenlyvilla_ig" → Heavenly Villa IG chatbot
 *   - "hillview_ig"    → Hill View IG chatbot
 */

const { menuTree } = require("../data/faqMenu");
const { igMenuTrees, IG_BOT_TYPES } = require("../data/igMenuTrees");
const { getSession, resetSession } = require("./sessionStore");

// Merge all trees: main chatbot tree + IG bot trees
const fullTree = { ...menuTree, ...igMenuTrees };

/**
 * Process a user's button choice and return the next menu node.
 *
 * @param {string} choice  - The value of the button the user tapped (e.g. "budget_properties")
 * @param {string} userId  - Unique user identifier
 * @param {string} botType - "staycation", "celebration", or an IG bot type
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

  /* ── handle numbered input (1, 2, 3, ...) ──── */
  const numMatch = choice.match(/^(\d+)$/);
  if (numMatch) {
    const idx = parseInt(numMatch[1], 10) - 1; // 1-indexed → 0-indexed
    const currentNode = fullTree[session.currentMenu] || fullTree[rootNodeStr];
    if (currentNode && currentNode.options && currentNode.options[idx]) {
      const targetValue = currentNode.options[idx].value;
      if (fullTree[targetValue]) {
        if (session.currentMenu !== targetValue) {
          session.navStack.push(session.currentMenu);
        }
        session.currentMenu = targetValue;
        return buildResponse(targetValue, rootNodeStr);
      }
    }
    // Invalid number — show current menu again
    return buildResponse(session.currentMenu || rootNodeStr, rootNodeStr);
  }

  /* ── push current location to stack, navigate ─ */
  if (fullTree[choice]) {
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
  const node = fullTree[nodeKey];
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

module.exports = { getResponse, getMainMenu, IG_BOT_TYPES };
