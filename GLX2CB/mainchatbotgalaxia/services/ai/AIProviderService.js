const axios = require("axios");
const configManager = require("./ConfigManager");

// Standard pricing helper per 1 Million tokens (in USD)
const PROVIDER_RATES = {
  deepseek: { input: 0.14, output: 0.28 },
  openai: { input: 0.15, output: 0.60 }, // gpt-4o-mini default
  grok: { input: 2.00, output: 10.00 },
  gemini: { input: 0.075, output: 0.30 }, // gemini-1.5-flash default
  claude: { input: 3.00, output: 15.00 } // claude-3-5-sonnet default
};

class AIProviderService {
  async generateCompletion(messages, temperature = 0.2) {
    const provider = configManager.get("AI_PROVIDER").toLowerCase();
    const apiKey = configManager.get("API_KEY");
    const baseURL = configManager.get("BASE_URL");
    const model = configManager.get("MODEL_NAME");

    if (!apiKey) {
      throw new Error(`API key is missing for provider: ${provider}`);
    }

    const startTime = Date.now();
    let text = "";
    let usage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

    try {
      if (provider === "claude" && !baseURL.includes("openai")) {
        // Native Anthropic API
        const response = await axios.post(
          baseURL || "https://api.anthropic.com/v1/messages",
          {
            model: model || "claude-3-5-sonnet-20241022",
            max_tokens: 2048,
            messages: messages.filter(m => m.role !== "system"),
            system: messages.find(m => m.role === "system")?.content || "",
            temperature: temperature
          },
          {
            headers: {
              "x-api-key": apiKey,
              "anthropic-version": "2023-06-01",
              "content-type": "application/json"
            }
          }
        );
        text = response.data.content[0].text;
        usage = {
          prompt_tokens: response.data.usage?.input_tokens || 0,
          completion_tokens: response.data.usage?.output_tokens || 0,
          total_tokens: (response.data.usage?.input_tokens || 0) + (response.data.usage?.output_tokens || 0)
        };
      } else if (provider === "gemini" && !baseURL.includes("openai")) {
        // Native Gemini API
        const cleanedModel = model || "gemini-1.5-flash";
        const url = `${baseURL || "https://generativelanguage.googleapis.com/v1beta"}/models/${cleanedModel}:generateContent?key=${apiKey}`;
        
        // Convert messages to Gemini format: role 'user' or 'model', and contents
        const contents = messages.map(m => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }]
        }));

        const response = await axios.post(url, {
          contents,
          generationConfig: {
            temperature: temperature,
            maxOutputTokens: 2048
          }
        });
        
        text = response.data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        if (!text || !text.trim()) {
          console.warn(`[AIProviderService] Gemini returned empty content. Finish reason: ${response.data.candidates?.[0]?.finishReason}`);
        }
        // Native Gemini token count may be absent in direct REST, estimate if null
        const inputCharCount = messages.reduce((acc, cur) => acc + cur.content.length, 0);
        const outputCharCount = text.length;
        usage = {
          prompt_tokens: Math.ceil(inputCharCount / 4),
          completion_tokens: Math.ceil(outputCharCount / 4),
          total_tokens: Math.ceil(inputCharCount / 4) + Math.ceil(outputCharCount / 4)
        };
      } else {
        // OpenAI, DeepSeek, Grok and any other OpenAI-compatible APIs
        const defaultBaseUrl = provider === "deepseek" ? "https://api.deepseek.com/v1" : "https://api.openai.com/v1";
        const url = `${baseURL || defaultBaseUrl}/chat/completions`;

        let response = await axios.post(
          url,
          {
            model: model,
            messages: messages,
            temperature: temperature,
            max_tokens: 2048
          },
          {
            headers: {
              "Authorization": `Bearer ${apiKey}`,
              "Content-Type": "application/json"
            },
            timeout: 30000
          }
        );

        text = response.data.choices?.[0]?.message?.content;
        const finishReason = response.data.choices?.[0]?.finish_reason;

        // If content is null/empty (safety filter, content_filter, or truncation), retry once
        if (!text || !text.trim()) {
          console.warn(`[AIProviderService] ${provider} returned empty content (finish_reason: ${finishReason}). Retrying with higher limit...`);
          response = await axios.post(
            url,
            {
              model: model,
              messages: messages,
              temperature: Math.min(temperature + 0.1, 0.5),
              max_tokens: 4096
            },
            {
              headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
              },
              timeout: 45000
            }
          );
          text = response.data.choices?.[0]?.message?.content;
          const retryFinish = response.data.choices?.[0]?.finish_reason;
          if (!text || !text.trim()) {
            console.error(`[AIProviderService] ${provider} retry also returned empty (finish_reason: ${retryFinish}). Giving up.`);
          } else {
            console.log(`[AIProviderService] ${provider} retry succeeded (finish_reason: ${retryFinish}).`);
          }
        }

        usage = {
          prompt_tokens: response.data.usage?.prompt_tokens || 0,
          completion_tokens: response.data.usage?.completion_tokens || 0,
          total_tokens: response.data.usage?.total_tokens || 0
        };
      }
    } catch (err) {
      console.error(`[AIProviderService] API call failed for provider ${provider}:`, err.response?.data || err.message);
      throw new Error(`AI Provider Error (${provider}): ${err.response?.data?.error?.message || err.message}`);
    }

    const latency = Date.now() - startTime;
    const cost = this.calculateCost(provider, usage.prompt_tokens, usage.completion_tokens);

    return {
      text,
      usage,
      latency,
      cost
    };
  }

  calculateCost(provider, promptTokens, completionTokens) {
    const rates = PROVIDER_RATES[provider.toLowerCase()] || PROVIDER_RATES.openai;
    const inputCost = (promptTokens / 1000000) * rates.input;
    const outputCost = (completionTokens / 1000000) * rates.output;
    return inputCost + outputCost;
  }
}

module.exports = new AIProviderService();
