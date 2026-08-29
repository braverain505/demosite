<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);
$question = is_array($data) && isset($data['question']) ? trim((string) $data['question']) : '';

if ($question === '' || strlen($question) > 500) {
    http_response_code(400);
    echo json_encode(['error' => 'Question must be between 1 and 500 characters.']);
    exit;
}

$apiKey = getenv('GROQ_API_KEY');
if (!$apiKey || $apiKey === '') {
    http_response_code(503);
    echo json_encode(['error' => 'Chat service is not configured.']);
    exit;
}

$schoolOnlySystemPrompt = <<<'PROMPT'
You are Ask EIS, the official school information assistant for Excellence International Schools, Jalingo, Taraba State, Nigeria.

Hard rules:
- Answer only questions about this school, its admissions, curriculum, campus, fees, boarding, timetable, facilities, transport, school life, contacts, or parent/student logistics.
- If a question is unrelated to this school, politely refuse and redirect to school-related support.
- Do not answer general knowledge questions, politics, religion, personal advice, coding, business strategy, legal advice, medical advice, or unrelated topics.
- Do not invent facts, prices, dates, names, or policies.
- If a detail is not confirmed, say it must be confirmed with the Admissions Office and provide the school contact details.
- Use only verified school facts. When needed, mention: Shavali Mile 6, Jalingo, Taraba State, Nigeria; +234 809 925 3111; +234 803 655 6278; info@eisjalingo.com.
- Keep replies short, friendly, and in plain text.
- If asked something outside school scope, reply with: "I can only help with questions about Excellence International Schools, Jalingo. Please ask about admissions, costs, programmes, facilities, boarding, transport, or contact details."
PROMPT;

$payload = [
    'model' => 'llama-3.1-8b-instant',
    'temperature' => 0.2,
    'max_tokens' => 220,
    'messages' => [
        [
            'role' => 'system',
            'content' => $schoolOnlySystemPrompt
        ],
        [
            'role' => 'user',
            'content' => $question
        ]
    ]
];

$ch = curl_init('https://api.groq.com/openai/v1/chat/completions');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ' . $apiKey,
    'Content-Type: application/json'
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($response === false || $httpCode >= 400) {
    http_response_code(502);
    echo json_encode(['error' => 'The chat service is temporarily unavailable.']);
    exit;
}

$data = json_decode($response, true);
$answer = isset($data['choices'][0]['message']['content']) ? trim((string) $data['choices'][0]['message']['content']) : '';

if ($answer === '') {
    http_response_code(502);
    echo json_encode(['error' => 'The chat service returned no answer.']);
    exit;
}

http_response_code(200);
echo json_encode(['answer' => $answer]);
