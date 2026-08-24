export type ReviewIssueKind = '삭제 후보'|'개선'|'오류 위험'|'알고리즘';

export type ReviewIssue = {
  kind:ReviewIssueKind;
  title:string;
  evidence:string;
  impact:string;
  suggestion:string;
  codeExample?:string;
  line:number;
};

export type Review = {
  verdict:string;
  complexity:string;
  issues:ReviewIssue[];
  betterApproach:{title:string;steps:string[];complexity:string};
  testCase:string;
  highlightLines:number[];
};

export type ReviewRequest = {
  problem?:{title?:string;externalUrl?:string|null};
  member?:string;
  language?:string;
  code?:string;
};
