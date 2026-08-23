import type { Metadata } from 'next';
import { Inter, Noto_Sans_KR } from 'next/font/google';
import './globals.css';

const inter = Inter({ variable: '--font-inter', subsets: ['latin'] });
const notoSansKr = Noto_Sans_KR({ variable: '--font-korean', subsets: ['latin'], weight: ['400','500','600','700'] });
const siteUrl = 'https://ssafy16-algostudy-agent.hyuck990324.chatgpt.site';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'AlgoStudy · SSAFY 16th',
  description: 'SSAFY 16기 알고리즘 스터디의 주차별 문제, 멤버 풀이와 공개 AI 리뷰를 한곳에서 확인합니다.',
  openGraph: {
    title: 'AlgoStudy · SSAFY 16th',
    description: 'Notion × GitHub × AI로 연결한 알고리즘 스터디 대시보드',
    url: siteUrl,
    siteName: 'AlgoStudy',
    images: [{ url: '/og.png', width: 1730, height: 909, alt: 'AlgoStudy SSAFY 16th 대시보드' }],
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title: 'AlgoStudy · SSAFY 16th', description: 'Notion × GitHub × AI 알고리즘 스터디 대시보드', images: ['/og.png'] },
};

const themeScript = `(function(){try{var saved=localStorage.getItem('algostudy-theme');var theme=saved||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.dataset.theme=theme;}catch(e){document.documentElement.dataset.theme='light';}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:themeScript}} /></head><body className={`${inter.variable} ${notoSansKr.variable}`}>{children}</body></html>;
}
