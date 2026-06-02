import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  ko: {
    translation: {
      title: 'Limina 제어판',
      statusLabel: '수집기 상태',
      running: '동작 중',
      stopped: '중지됨',
      tokenLabel: '익스텐션 연동 토큰',
      copyToken: '토큰 복사',
      copied: '복사 완료!',
      recentLogs: '최근 수집 데이터 로그 (로컬 저장)',
      noLogs: '아직 수집된 데이터가 없습니다.',
      toggleOn: '수집 시작',
      toggleOff: '수집 중지',
      dataInfo: '수집된 일상 데이터는 100% 로컬(PC)에만 안전하게 보관됩니다.',
      openDashboard: '웹 대시보드 열기',
      langLabel: '언어 설정',
      settingsBtn: '설정',
      noIdea: '아직 포착된 아이디어가 없습니다',
      noIdeaDesc: 'PC를 사용하면 AI가 자동으로 아이디어를 찾아드려요',
      recentIdea: '최근 생성된 아이디어',
      settings: {
        title: '설정',
        save: '저장',
        saved: '저장됨 ✓',
        apiKeyLabel: 'Anthropic API 키',
        apiKeyHint: 'Claude AI 분석에 필요합니다. anthropic.com에서 발급받으세요.',
        interestsLabel: '관심 분야 (AI가 맞춤 아이디어를 만들어요)',
        qualityLabel: '알림 품질 모드',
        languageLabel: '앱 언어'
      }
    }
  },
  en: {
    translation: {
      title: 'Limina Control Panel',
      statusLabel: 'Collector Status',
      running: 'Running',
      stopped: 'Stopped',
      tokenLabel: 'Extension Auth Token',
      copyToken: 'Copy Token',
      copied: 'Copied!',
      recentLogs: 'Recent Collected Logs (Local Only)',
      noLogs: 'No data collected yet.',
      toggleOn: 'Start Collecting',
      toggleOff: 'Stop Collecting',
      dataInfo: 'All collected daily logs are stored 100% locally on your PC.',
      openDashboard: 'Open Web Dashboard',
      langLabel: 'Language',
      settingsBtn: 'Settings',
      noIdea: 'No ideas captured yet',
      noIdeaDesc: 'Use your PC as usual — AI will find ideas for you',
      recentIdea: 'Latest Generated Idea',
      settings: {
        title: 'Settings',
        save: 'Save',
        saved: 'Saved ✓',
        apiKeyLabel: 'Anthropic API Key',
        apiKeyHint: 'Required for Claude AI analysis. Get one at anthropic.com.',
        interestsLabel: 'Interests (AI tailors ideas for you)',
        qualityLabel: 'Alert Quality Mode',
        languageLabel: 'App Language'
      }
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'ko', // 기본 언어
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
