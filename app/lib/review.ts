export type ReviewIssueKind = '삭제 후보'|'개선'|'오류 위험'|'알고리즘';
export type ReviewIssueSeverity = '반드시 수정'|'개선 권장'|'선택 사항';

export type ReviewIssue = {
  kind:ReviewIssueKind;
  severity:ReviewIssueSeverity;
  title:string;
  evidence:string;
  impact:string;
  suggestion:string;
  codeExample?:string;
  line:number;
};

export type Review = {
  verdict:string;
  currentApproach:string;
  strengths:string[];
  complexity:string;
  issues:ReviewIssue[];
  betterApproach:{title:string;steps:string[];complexity:string};
  testCase:string;
  learningPoints:string[];
  highlightLines:number[];
};

export type ReviewRequest = {
  problem?:{title?:string;externalUrl?:string|null};
  member?:string;
  language?:string;
  code?:string;
};
