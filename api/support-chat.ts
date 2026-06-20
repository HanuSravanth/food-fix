import { GoogleGenAI } from "@google/genai";

const policyDocument = `
FoodFix Customer Support Policy

1. Refund Policy
Customers may be eligible for a refund if:
- The order is cancelled by the restaurant.
- The order is not delivered.
- The delivered food is spoiled, unsafe, or not edible.
- A major item is missing from the order.
- The wrong item is delivered.

Refunds are not guaranteed automatically. Final refund approval may require review by the FoodFix support team.

2. Refund Timeline
Once approved, refunds usually take 3 to 7 business days to reflect in the customer's original payment method.
Wallet refunds may reflect faster.

3. Delay Compensation Policy
If an order is delayed, the customer may be eligible for an apology coupon depending on the delay duration and order value.
A delayed order does not always mean automatic refund.
If the customer wants exact live order status, the issue should be escalated to a human agent.

4. Cancellation Policy
Customers can cancel an order before the restaurant starts preparing it.
Once preparation has started, cancellation may not be allowed.
If the order is extremely delayed, FoodFix support may review the case.

5. Coupon Policy
Only one coupon can be applied per order unless clearly mentioned in the offer.
Coupons may fail if the order does not meet minimum order value, restaurant eligibility, location eligibility, or payment method conditions.

6. Missing or Wrong Item Policy
If an item is missing or the wrong item is delivered, the customer should report it through support.
FoodFix may ask for order details or an image.
Refund or replacement depends on verification.

7. Food Quality Policy
If food is spoiled, unsafe, spilled, leaked, or packaging is damaged, the customer should upload a clear image.
FoodFix support will review the complaint.
The customer may be eligible for refund, coupon, or replacement depending on the case.

8. Human Escalation Policy
Escalate to a human agent if:
- The customer asks for a human.
- The issue needs payment verification.
- The issue needs live order tracking.
- The issue is unclear.
- The customer is very angry.
- The AI is not sure about the answer.
`;

const supportPromptTemplate = `
You are FoodFix's customer support assistant.

Your job:
Answer only those customer questions that can be safely answered from the FoodFix policy document (like food quality complaints, refund queries, cancellations, delay compensation, or coupon helper questions).

Use these inputs:
Chat history:
{history}

FoodFix policy document:
{policy_document}

Customer's latest message:
{user_input}

Rules:
1. If the user's latest message is completely unrelated to food delivery, food quality, stale food, order queries, or other policy items defined in the document above, you MUST route them to a human support agent immediately.
2. If the user asks about general off-topic concepts (like general knowledge, coding, writing recipes from scratch, or non-FoodFix related questions) that do not fall under our policies, politely redirect them to a human agent.
3. If the answer is clearly available in the policy document, answer politely and briefly.
4. Do not approve refunds directly.
5. Do not promise exact refund approval, exact delivery time, or exact payment status.
6. For anything needing order ID, payment verification, live delivery tracking, restaurant confirmation, or human judgment, escalate to a human.
7. Keep the tone warm, simple, and like a support agent.
8. Do not show internal reasoning.
9. Do not mention the policy document to the customer unless needed.
10. If escalating to a human, ALWAYS start or say exactly: "Let me connect you to a support agent who can help with this."

Return only the customer-facing reply.
`;

const imageComplaintPromptTemplate = `
You are FoodFix's food quality support assistant.

Your job:
Look at the uploaded food image and help the human support agent decide the next step.

Use these inputs:

Chat history:
{history}

FoodFix policy document:
{policy_document}

Customer's latest message:
{user_input}

Important rules:
1. You are not the final refund approver.
2. Do not directly say "refund approved".
3. If the image clearly shows spoiled food, stale food, spilled food, damaged packaging, unsafe-looking food, leakage, broken seal, or visibly wrong food condition, recommend refund review.
4. If the image is unrelated, or unclear, say that the case should go to a human agent.
5. If the issue cannot be verified visually, say that a human agent should review it.
6. Be supportive to the customer.
7. Create a short internal summary for the support agent.
8. Keep the customer reply simple and polite.
9. Do not expose technical reasoning.
10. Do not reject the customer's complaint harshly.

Return in this exact format:

Customer Reply:
<message to customer>

Agent Note:
<short internal note for human support agent>

Recommended Action:
<Refund review / Human review / Ask for clearer image>
`;

export default async function handler(req: any, res: any) {
  // Allow OPTIONS pre-flight request (important for Vercel CORS/handlers)
  if (req.method === 'OPTIONS') {
    return res.status(200).send('OK');
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { message, history, image } = req.body;

    const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: "Neither GOOGLE_API_KEY nor GEMINI_API_KEY environment variable is defined. Please verify it in Settings > Secrets or in the deployment console.",
      });
    }

    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    // Format previous chat history
    const formattedHistory = history && Array.isArray(history)
      ? history
          .map((msg: any) => `${msg.type === "user" ? "user" : "model"}: ${msg.text}`)
          .join("\n")
      : "";

    if (image) {
      const match = image.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) {
        return res.status(400).json({ error: "Invalid image format uploaded. Must be a base64 Data URL." });
      }
      const mimeType = match[1];
      const base64Data = match[2];

      const finalPrompt = imageComplaintPromptTemplate
        .replace("{history}", formattedHistory)
        .replace("{policy_document}", policyDocument)
        .replace("{user_input}", message || "Attached food image for quality review.");

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          { inlineData: { mimeType, data: base64Data } },
          { text: finalPrompt },
        ],
      });

      const responseText = response.text || "";

      let customerReply = responseText;
      let agentNote = "";
      let recommendedAction = "";

      // Parse structured output using regexes
      const replyMatch = responseText.match(/Customer Reply:\s*([\s\S]*?)(?=Agent Note:|$)/i);
      const noteMatch = responseText.match(/Agent Note:\s*([\s\S]*?)(?=Recommended Action:|$)/i);
      const actionMatch = responseText.match(/Recommended Action:\s*([\s\S]*?)$/i);

      if (replyMatch) customerReply = replyMatch[1].trim();
      if (noteMatch) agentNote = noteMatch[1].trim();
      if (actionMatch) recommendedAction = actionMatch[1].trim();

      if (!replyMatch && !noteMatch && !actionMatch) {
         customerReply = responseText.replace(/Customer Reply:\s*/i, "").trim();
      }

      return res.json({
        text: customerReply,
        parsedImageResult: {
          agentNote: agentNote || "Refer to the customer message for details.",
          recommendedAction: recommendedAction || "Human review",
          rawResponse: responseText,
        },
        type: "bot",
      });
    } else {
      const finalPrompt = supportPromptTemplate
        .replace("{history}", formattedHistory)
        .replace("{policy_document}", policyDocument)
        .replace("{user_input}", message);

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: finalPrompt,
      });

      return res.json({
        text: response.text || "I will look that up in our policies.",
        type: "bot",
      });
    }
  } catch (error: any) {
    console.error("Support Chat API error:", error);
    return res.status(500).json({
      error: error.message || "An error occurred while connecting with the FoodFix support system.",
    });
  }
}
