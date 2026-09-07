<?php
/**
 * EIS — careers application handler.
 * Receives the CV upload form (multipart POST) and emails the details
 * plus the attached document to principal@eisjalingo.com.
 * Returns JSON so the page can show a success message without navigating.
 */

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

$TO = 'principal@eisjalingo.com';
$FROM = 'careers@eisjalingo.com';

$name   = isset($_POST['name'])   ? trim((string) $_POST['name'])   : '';
$email  = isset($_POST['email'])  ? trim((string) $_POST['email'])  : '';
$phone  = isset($_POST['phone'])  ? trim((string) $_POST['phone'])  : '';
$role   = isset($_POST['role'])   ? trim((string) $_POST['role'])   : '';
$msg    = isset($_POST['message'])? trim((string) $_POST['message']): '';

if ($name === '' || $email === '' || $phone === '' || $msg === '') {
    http_response_code(400);
    echo json_encode(['error' => 'Please complete the required fields.']);
    exit;
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['error' => 'Please provide a valid email address.']);
    exit;
}

$file = null;
if (isset($_FILES['cv']) && is_array($_FILES['cv']) && $_FILES['cv']['error'] === UPLOAD_ERR_OK) {
    $file = $_FILES['cv'];
}

$subject = "Career application — {$name} ({$role})";

// Build a multipart MIME message with the CV attached, if present.
$boundary = '----EIS_' . md5(uniqid((string) mt_rand(), true));
$headers  = "From: {$FROM}\r\n";
$headers .= "Reply-To: {$name} <{$email}>\r\n";
$headers .= "MIME-Version: 1.0\r\n";
$headers .= "Content-Type: multipart/mixed; boundary=\"{$boundary}\"\r\n";

$body  = "--{$boundary}\r\n";
$body .= "Content-Type: text/plain; charset=UTF-8\r\n";
$body .= "Content-Transfer-Encoding: 8bit\r\n\r\n";
$body .= "A new career application was submitted through the EIS website.\n\n";
$body .= "Name:    {$name}\n";
$body .= "Email:   {$email}\n";
$body .= "Phone:   {$phone}\n";
$body .= "Role:    {$role}\n\n";
$body .= "Note from applicant:\n{$msg}\n\n";
$body .= "--{$boundary}\r\n";

if ($file) {
    $raw    = file_get_contents($file['tmp_name']);
    $b64    = chunk_split(base64_encode($raw));
    $fname  = basename($file['name']);
    $ftype  = $file['type'] !== '' ? $file['type'] : 'application/octet-stream';
    $body  .= "Content-Type: {$ftype}; name=\"{$fname}\"\r\n";
    $body  .= "Content-Disposition: attachment; filename=\"{$fname}\"\r\n";
    $body  .= "Content-Transfer-Encoding: base64\r\n\r\n";
    $body  .= $b64 . "\r\n";
    $body  .= "--{$boundary}\r\n";
}

$body .= "\r\n";

$sent = @mail($TO, $subject, $body, $headers);

if (!$sent) {
    http_response_code(502);
    echo json_encode(['error' => 'The application could not be sent right now. Please email principal@eisjalingo.com directly.']);
    exit;
}

echo json_encode(['ok' => true]);