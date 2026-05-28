// content.js - IdeaTok AI Idea Collector Content Script

// 수집 실행 차단 필터 (결제, 보안, 마이페이지 등 민감 키워드 차단)
const BLOCKED_PATH_KEYWORDS = ['checkout', 'payment', 'login', 'signup', 'passwd', 'password', 'mypage', 'account', 'banking'];

function isBlockedUrl(url) {
  const lowercaseUrl = url.toLowerCase();
  return BLOCKED_PATH_KEYWORDS.some(keyword => lowercaseUrl.includes(keyword));
}

// ─────────────────────────────────────────────────────────
// 1. 유튜브 수집 엔진 (Lazy Load 대응 안전장치 탑재)
// ─────────────────────────────────────────────────────────
async function extractYoutubeData() {
  // 영상 상세 페이지(/watch)가 아니면 스킵
  if (!window.location.pathname.includes('/watch')) return null;

  const titleSelector = 'h1.ytd-watch-metadata yt-formatted-string, #title yt-formatted-string';
  const commentTextSelector = 'ytd-comment-thread-renderer #content-text';

  // 1. 제목 추출
  let title = '';
  const titleEl = document.querySelector(titleSelector);
  if (titleEl) {
    title = titleEl.textContent.trim();
  } else {
    title = document.title.replace(' - YouTube', '').trim();
  }

  // 2. 비동기 댓글 로딩 대기 로직 (1.5초 간격으로 최대 3회 감지 시도)
  let topComments = [];
  const maxRetries = 3;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const commentElements = document.querySelectorAll(commentTextSelector);
    if (commentElements.length >= 3) {
      // 상위 베스트 댓글 3개만 추출
      topComments = Array.from(commentElements)
        .slice(0, 3)
        .map(el => el.textContent.trim());
      break;
    }
    // 댓글이 아직 로드되지 않은 경우 1.5초 대기 후 재스캔
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  return {
    source: 'youtube',
    url: window.location.href,
    title: title,
    content: topComments.length > 0 
      ? `상위 댓글:\n- ${topComments.join('\n- ')}` 
      : '댓글 없음 (또는 로딩 지연)',
    meta: {
      domain: 'youtube.com',
      category: 'video',
      comment_count: topComments.length
    },
    timestamp: new Date().toISOString()
  };
}

// ─────────────────────────────────────────────────────────
// 2. 뉴스 수집 엔진 (네이버, 다음 및 표준 메타데이터)
// ─────────────────────────────────────────────────────────
function extractNewsData() {
  const host = window.location.host;
  let title = '';
  let content = '';

  // 네이버 뉴스 특화 셀렉터
  if (host.includes('news.naver.com')) {
    const titleEl = document.querySelector('h2.media_end_head_title, #title_area');
    const descEl = document.querySelector('meta[property="og:description"], #articeBody, #newsct_article');
    title = titleEl ? titleEl.textContent.trim() : document.title;
    content = descEl ? (descEl.getAttribute('content') || descEl.textContent.slice(0, 300).trim()) : '';
  }
  // 다음 뉴스 특화 셀렉터
  else if (host.includes('news.daum.net') || host.includes('v.daum.net')) {
    const titleEl = document.querySelector('h3.tit_view, .tit_view');
    const descEl = document.querySelector('meta[property="og:description"], .article_view');
    title = titleEl ? titleEl.textContent.trim() : document.title;
    content = descEl ? (descEl.getAttribute('content') || descEl.textContent.slice(0, 300).trim()) : '';
  }
  // 그 외 일반 뉴스/블로그 (표준 og 태그 및 description 활용 - 초경량)
  else {
    const titleEl = document.querySelector('meta[property="og:title"]') || document.querySelector('h1');
    const descEl = document.querySelector('meta[name="description"]') || document.querySelector('meta[property="og:description"]');
    title = titleEl ? (titleEl.getAttribute('content') || titleEl.textContent.trim()) : document.title;
    content = descEl ? descEl.getAttribute('content') : '';
  }

  return {
    source: 'news',
    url: window.location.href,
    title: title.replace(/ : 네이버 뉴스| - Daum 뉴스/g, '').trim(),
    content: content ? content.slice(0, 400).trim() : '',
    meta: {
      domain: host,
      category: 'article'
    },
    timestamp: new Date().toISOString()
  };
}

// ─────────────────────────────────────────────────────────
// 3. AI 대화 포털 수집 엔진 (ChatGPT, Claude, Gemini)
// ─────────────────────────────────────────────────────────
function extractAiChatData() {
  const host = window.location.host;
  let title = 'AI 대화 로그';
  let conversationText = '';

  // ChatGPT
  if (host.includes('chatgpt.com')) {
    title = document.title || 'ChatGPT 대화';
    const messageElements = document.querySelectorAll('[data-message-author-role]');
    const messages = Array.from(messageElements).slice(-4); // 최근 4개의 대화 쌍만 가져옴
    conversationText = messages.map(el => {
      const role = el.getAttribute('data-message-author-role') === 'user' ? 'User' : 'ChatGPT';
      return `${role}: ${el.textContent.trim()}`;
    }).join('\n');
  }
  // Claude
  else if (host.includes('claude.ai')) {
    title = document.title || 'Claude 대화';
    const userMessages = document.querySelectorAll('.font-user-message');
    const aiMessages = document.querySelectorAll('.font-claude-message');
    // 최근 2개의 대화 쌍 매칭
    const lastUser = userMessages.length > 0 ? userMessages[userMessages.length - 1].textContent.trim() : '';
    const lastAi = aiMessages.length > 0 ? aiMessages[aiMessages.length - 1].textContent.trim() : '';
    if (lastUser) conversationText += `User: ${lastUser}\n`;
    if (lastAi) conversationText += `Claude: ${lastAi.slice(0, 300)}`;
  }
  // Gemini
  else if (host.includes('gemini.google.com')) {
    title = document.title || 'Gemini 대화';
    const chatEntries = document.querySelectorAll('chat-entry');
    const lastEntries = Array.from(chatEntries).slice(-2);
    conversationText = lastEntries.map(entry => {
      const isUser = entry.querySelector('.query-text') !== null;
      const role = isUser ? 'User' : 'Gemini';
      const text = entry.textContent.trim();
      return `${role}: ${text.slice(0, 300)}`;
    }).join('\n');
  }

  if (!conversationText) return null;

  return {
    source: 'ai_chat',
    url: window.location.href,
    title: title,
    content: conversationText,
    meta: {
      domain: host,
      category: 'ai_chat'
    },
    timestamp: new Date().toISOString()
  };
}

// ─────────────────────────────────────────────────────────
// 메인 수집 컨트롤러
// ─────────────────────────────────────────────────────────
async function runCollector() {
  const currentUrl = window.location.href;

  // 민감한 도메인/경로는 차단
  if (isBlockedUrl(currentUrl)) return;

  const host = window.location.host;
  let collectedPayload = null;

  if (host.includes('youtube.com')) {
    collectedPayload = await extractYoutubeData();
  } else if (host.includes('news.naver.com') || host.includes('news.daum.net') || host.includes('v.daum.net')) {
    collectedPayload = extractNewsData();
  } else if (host.includes('chatgpt.com') || host.includes('claude.ai') || host.includes('gemini.google.com')) {
    collectedPayload = extractAiChatData();
  }

  // 데이터 수집이 성공했고, 제목과 내용이 존재할 때만 전송
  if (collectedPayload && collectedPayload.title && collectedPayload.content) {
    chrome.runtime.sendMessage({
      type: 'COLLECT_TEXT',
      payload: collectedPayload
    }, (response) => {
      if (chrome.runtime.lastError) {
        // 백그라운드 서비스 워커가 준비되지 않았을 경우의 에러 로깅 방지 (조용한 작동)
        return;
      }
      console.log('IdeaTok Extracted Response:', response);
    });
  }
}

// 1. 페이지 로딩이 완벽히 끝난 시점에 최초 1회 수집 기동
if (document.readyState === 'complete') {
  runCollector();
} else {
  window.addEventListener('load', runCollector);
}

// 2. AI 대화 포털 등 단일 페이지 애플리케이션(SPA)의 URL 변경 감지
let lastUrl = window.location.href;
new MutationObserver(() => {
  const url = window.location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    // URL이 바뀔 때 리소스를 보호하기 위해 1.5초 뒤 가볍게 한 번 실행
    setTimeout(runCollector, 1500);
  }
}).observe(document, { subtree: true, childList: true });
