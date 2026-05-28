// Claude API 전송 전 PII(개인정보) 자동 마스킹 — api.md 11-4 규칙 준수

export function maskPII(text: string): string {
  return text
    // 이메일
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[EMAIL]')
    // 국제 전화번호
    .replace(/\+?\d{1,4}[\s.-]?\(?\d{1,4}\)?[\s.-]?\d{1,4}[\s.-]?\d{1,9}/g, '[PHONE]')
    // 한국 주민번호 (123456-1234567)
    .replace(/\d{6}[-]\d{7}/g, '[KR-SSN]')
    // 미국 SSN (123-45-6789)
    .replace(/\d{3}-\d{2}-\d{4}/g, '[US-SSN]')
    // 신용카드 번호 (15~16자리)
    .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{3,4}\b/g, '[CARD]');
}
