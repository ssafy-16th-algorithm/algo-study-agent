export type MemberId = 'jonghyuck' | 'yeajeong' | 'taekgi' | 'minkyung';

export type Member = {
  id:MemberId;
  name:string;
  handle:string;
  repositoryUrl:string;
  tone:'blue'|'purple'|'orange'|'green';
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
  {id:'jonghyuck',name:'이종혁',handle:'jonghyuck',repositoryUrl:'https://github.com/ssafy-16th-algorithm/jonghyuck',tone:'blue'},
  {id:'yeajeong',name:'강예정',handle:'yeajeong',repositoryUrl:'https://github.com/ssafy-16th-algorithm/yeajeong',tone:'purple'},
  {id:'taekgi',name:'민택기',handle:'taekki',repositoryUrl:'https://github.com/ssafy-16th-algorithm/taekki',tone:'orange'},
  {id:'minkyung',name:'주민경',handle:'minkyung-',repositoryUrl:'https://github.com/ssafy-16th-algorithm/minkyung-',tone:'green'},
];

