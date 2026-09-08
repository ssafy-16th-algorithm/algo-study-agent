'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Review } from '../lib/review';
import type { StudyProblem, StudySolution } from '../lib/study';
import { requestReviewWithRetry, ReviewRequestError, type ReviewRetryState } from '../lib/review-client';

type ReviewStatus='idle'|'loading'|'ready'|'error';
const memoryCache=new Map<string,Review>();
const cooldowns=new Map<string,number>();
const STORAGE_PREFIX='algorithm-review:v13:';

function shortHash(value:string) {
  let hash=2166136261;
  for (let index=0;index<value.length;index++) hash=Math.imul(hash^value.charCodeAt(index),16777619);
  return (hash>>>0).toString(36);
}

function readStored(key:string) {
  try {
    const value=window.localStorage.getItem(STORAGE_PREFIX+key);
    return value?JSON.parse(value) as Review:null;
  } catch { return null; }
}

function store(key:string,review:Review) {
  try { window.localStorage.setItem(STORAGE_PREFIX+key,JSON.stringify(review)); }
  catch { /* 메모리 캐시는 계속 사용한다. */ }
}

type ReviewState={key:string;review:Review|null;status:ReviewStatus;error:string;retry:ReviewRetryState|null;retryAt:number};
function initialState(key:string):ReviewState {
  return {key,review:null,status:'idle',error:'',retry:null,retryAt:0};
}

export function useCodeReview(problem:StudyProblem|null,solution:StudySolution|null) {
  const key=problem && solution?.code ? shortHash(`${problem.id}:${solution.member.id}:${solution.code}`) : '';
  const [state,setState]=useState<ReviewState>(()=>initialState(key));
  const [now,setNow]=useState(()=>Date.now());
  const active=useRef<{key:string;controller:AbortController}|null>(null);

  useEffect(()=>{
    const frame=requestAnimationFrame(()=>{
      if (active.current?.key===key) return;
      const cached=key ? memoryCache.get(key) ?? readStored(key) : null;
      setNow(Date.now());
      setState({...initialState(key),review:cached,status:cached?'ready':'idle',retryAt:cooldowns.get(key) ?? 0});
    });
    return ()=>{
      cancelAnimationFrame(frame);
      if (active.current?.key===key) {
        active.current.controller.abort();
        active.current=null;
      }
    };
  },[key]);

  const current=state.key===key?state:initialState(key);
  const nextRetryAt=current.retry?.retryAt || current.retryAt;
  useEffect(()=>{
    if (!nextRetryAt) return;
    const timer=window.setInterval(()=>{
      const time=Date.now();
      setNow(time);
      if (time>=nextRetryAt) window.clearInterval(timer);
    },1000);
    return ()=>window.clearInterval(timer);
  },[nextRetryAt]);

  const request=useCallback(async (refresh=false)=>{
    if (!problem || !solution?.code || !key) return;
    if (active.current?.key===key || (cooldowns.get(key) ?? 0)>Date.now()) return;
    active.current?.controller.abort();
    cooldowns.delete(key);
    const controller=new AbortController();
    active.current={key,controller};
    setState((previous)=>({...(previous.key===key?previous:initialState(key)),key,status:'loading',error:'',retry:null,retryAt:0}));
    try {
      const cached=refresh ? null : memoryCache.get(key) ?? readStored(key);
      const result=cached ?? await requestReviewWithRetry({
        problem:{title:problem.title,externalUrl:problem.externalUrl},
        member:solution.member.name,language:solution.language,code:solution.code,refresh,
      },{
        signal:controller.signal,
        onRetry:(retry)=>{
          if (active.current?.controller!==controller) return;
          if (retry) cooldowns.set(key,retry.retryAt);
          setNow(Date.now());
          setState((previous)=>({...previous,retry}));
        },
      });
      if (controller.signal.aborted || active.current?.controller!==controller) return;
      memoryCache.set(key,result);store(key,result);cooldowns.delete(key);
      setState({...initialState(key),review:result,status:'ready'});
    } catch (reason) {
      if (controller.signal.aborted || active.current?.controller!==controller) return;
      const retryAt=reason instanceof ReviewRequestError?reason.retryAt:0;
      if (retryAt>Date.now()) cooldowns.set(key,retryAt);
      setNow(Date.now());
      setState((previous)=>({...previous,status:'error',retry:null,retryAt,error:reason instanceof Error?reason.message:'AI 리뷰 생성에 실패했습니다.'}));
    } finally {
      if (active.current?.controller===controller) active.current=null;
    }
  },[key,problem,solution]);

  const remainingSeconds=Math.max(0,Math.ceil((nextRetryAt-now)/1000));
  return {...current,request,remainingSeconds,disabled:current.status==='loading'||remainingSeconds>0};
}
