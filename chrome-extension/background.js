// background.js - IdeaTok AI Idea Collector Service Worker

// 7421 포트에 통신 시 사용할 기본 보안 토큰 설정
const DEFAULT_TOKEN = 'YOUR_DEFAULT_TOKEN';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'COLLECT_TEXT') {
    handleCollectText(message.payload)
      .then(result => sendResponse({ status: 'success', data: result }))
      .catch(error => sendResponse({ status: 'error', message: error.message }));
    
    return true; // 비동기 응답(sendResponse)을 사용하기 위해 true 반환
  }
});

async function handleCollectText(payload) {
  // 1. 크롬 익스텐션 스토리지에서 유저가 등록한 32자 보안 토큰 조회
  const storage = await getLocalStorage(['apiToken']);
  const token = storage.apiToken || DEFAULT_TOKEN;

  // 2. 데스크톱 앱 로컬 서버(localhost:7421/collect)로 POST 요청 포워딩
  try {
    const response = await fetch('http://localhost:7421/collect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-IdeaTok-Token': token
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Successfully forwarded data to desktop server:', data);
    return data;
  } catch (error) {
    console.warn('Failed to forward data to IdeaTok desktop app (Is the app running?):', error.message);
    throw error;
  }
}

// 스토리지 편의용 유틸 함수
function getLocalStorage(keys) {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, (result) => {
      resolve(result);
    });
  });
}
