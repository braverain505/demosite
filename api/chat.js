const MODEL = 'llama-3.1-8b-instant';
const MAX_QUESTION_LENGTH = 500;

const SYSTEM_PROMPT = `You are Ask EIS, the concise admissions and school information assistant for Excellence International Schools in Jalingo, Taraba State, Nigeria.

Use only these verified facts unless the user asks a general conversational question:
- The school was founded on 19 September 2016 and serves Nursery/Early Years through Senior Secondary (Key Stages 1-4+).
- It balances British and Nigerian curricula and offers day and boarding options.
- It is located at Shavon Mile 6, Jalingo, Taraba State, Nigeria.
- Phone and WhatsApp: +234 803 087 5393.
- Email: principal@eisjalingo.com.
- Admissions follow enquiry, application, assessment/interview, then offer.
- Fees, term dates, transport routes, and current availability should be confirmed with the Admissions Office.

Answer in plain text, with short paragraphs or bullets when useful. Do not invent prices, dates, policies, staff names, or availability. When information is not confirmed, direct the user to the Admissions Office and include the relevant contact details. Keep answers under 120 words.`;

export async function getChatAnswer(question) {
  if (!process.env.GROQ_API_KEY) {
    return { status: 503, body: { error: 'Chat service is not configured.' } };
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.2,
        max_tokens: 220,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: question },
        ],
      }),
    });

    if (!response.ok) {
      return { status: 502, body: { error: 'The chat service is temporarily unavailable.' } };
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content?.trim();
    if (!answer) {
      return { status: 502, body: { error: 'The chat service returned no answer.' } };
    }
    return { status: 200, body: { answer } };
  } catch {
    return { status: 502, body: { error: 'The chat service is temporarily unavailable.' } };
  }
}

function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8').send(JSON.stringify(body));
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    json(res, 405, { error: 'Method not allowed' });
    return;
  }

  const question = typeof req.body?.question === 'string' ? req.body.question.trim() : '';
  if (!question || question.length > MAX_QUESTION_LENGTH) {
    json(res, 400, { error: `Question must be between 1 and ${MAX_QUESTION_LENGTH} characters.` });
    return;
  }

  const result = await getChatAnswer(question);
  json(res, result.status, result.body);
}
