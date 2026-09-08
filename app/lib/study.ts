export type MemberId = 'jonghyuck' | 'yeajeong' | 'taekgi' | 'minkyung' | 'juyeon' | 'jiwoo';

export type Member = {
  id:MemberId;
  name:string;
  joinedWeek:number;
  handle:string|null;
  repositoryUrl:string|null;
  tone:'blue'|'purple'|'orange'|'green'|'teal'|'pink';
};

export type StudyProblem = {
  id:string;
  title:string;
  week:number;
  date:string;
  externalUrl:string|null;
  notionUrl:string;
};

export type StudySolution = {
  member:Member;
  code:string|null;
  attemptedCode:string|null;
  attemptedLanguage:string;
  strategy:string;
  retrospective:string;
  language:string;
  source:'notion'|'github'|null;
  sourceUrl:string;
};

export type ProblemDetail = {
  problem:StudyProblem;
  solutions:StudySolution[];
  syncedAt:string;
};

export const members:Member[] = [
  {id:'jonghyuck',name:'이종혁',joinedWeek:1,handle:'jonghyuck',repositoryUrl:'https://github.com/ssafy-16th-algorithm/jonghyuck',tone:'blue'},
  {id:'yeajeong',name:'강예정',joinedWeek:1,handle:'yeajeong',repositoryUrl:'https://github.com/ssafy-16th-algorithm/yeajeong',tone:'purple'},
  {id:'taekgi',name:'민택기',joinedWeek:1,handle:'taekki',repositoryUrl:'https://github.com/ssafy-16th-algorithm/taekki',tone:'orange'},
  {id:'minkyung',name:'주민경',joinedWeek:1,handle:'minkyung-',repositoryUrl:'https://github.com/ssafy-16th-algorithm/minkyung-',tone:'green'},
  {id:'juyeon',name:'정주연',joinedWeek:8,handle:null,repositoryUrl:null,tone:'teal'},
  {id:'jiwoo',name:'박지우',joinedWeek:8,handle:null,repositoryUrl:null,tone:'pink'},
];

export function membersForWeek(week:number):Member[] {
  return members.filter((member)=>member.joinedWeek<=week);
}

