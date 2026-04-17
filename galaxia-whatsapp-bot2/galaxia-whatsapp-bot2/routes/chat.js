const express = require("express");
const router = express.Router();
const { getResponse, getMainMenu } = require("../services/menuEngine");

/**
 * POST /chat
 *
 * Website chat widget endpoint.
 * Accepts: { user: string, choice: string }
 * Returns: { message, options, image?, link? }
 */
router.post("/", (req, res) => {
  try {
    const { user, choice, botType = "staycation" } = req.body;

    if (!user) {
      return res.status(400).json({ error: "Missing 'user' field." });
    }

    // First message or explicit main menu
    if (!choice || choice === "main") {
      const response = getMainMenu(botType);
      return res.json(response);
    }

    const response = getResponse(choice, user, botType);
    return res.json(response);

  } catch (err) {
    console.error("Chat route error:", err.message);
    res.status(500).json({ error: "Something went wrong. Please try again." });
  }
});

module.exports = router;