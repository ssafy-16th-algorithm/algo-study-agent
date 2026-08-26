import type { Metadata } from 'next';
import './globals.css';

const siteUrl = 'https://algo-study-agent.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'SSAFY ALGO · 16th',
  description: 'SSAFY 16기 알고리즘 스터디의 주차별 문제, 멤버 풀이와 공개 AI 리뷰를 한곳에서 확인합니다.',
  icons: {
    icon: [{url:'/ssafy-algo-square.png',type:'image/png'}],
    shortcut: ['/ssafy-algo-square.png'],
    apple: [{url:'/ssafy-algo-square.png',type:'image/png'}],
  },
  openGraph: {
    title: 'SSAFY ALGO · 16th',
    description: 'Notion × GitHub × AI로 연결한 알고리즘 스터디 대시보드',
    url: siteUrl,
    siteName: 'SSAFY ALGO',
    images: [{ url: '/og.png', width: 1731, height: 909, alt: 'SSAFY ALGO 16기 알고리즘 스터디 플랫폼' }],
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title: 'SSAFY ALGO · 16th', description: 'Notion × GitHub × AI 알고리즘 스터디 대시보드', images: ['/og.png'] },
};

const themeScript = `(function(){try{var saved=localStorage.getItem('algostudy-theme');var theme=saved||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.dataset.theme=theme;}catch(e){document.documentElement.dataset.theme='light';}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:themeScript}} /></head><body>{children}</body></html>;
}
