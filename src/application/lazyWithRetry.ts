import { createElement, lazy, type ComponentType, type LazyExoticComponent } from 'react';
import { isChunkLoadError } from '../components/chunkLoadError';

/**
 * 화면 파일을 한 번 못 받아도 다음에 다시 받을 수 있게 하는 lazy.
 *
 * React.lazy는 실패한 import를 기억해서, 인터넷이 돌아와도 같은 화면은 새로고침 전까지 계속 오류가 난다.
 * 브라우저도 실패한 모듈 주소를 기억하므로 같은 주소로 다시 import하면 또 실패한다.
 * 그래서 실패한 뒤 새로 그릴 때(다른 놀이로 옮기거나 '다시 열기'를 누를 때)는
 *  1) 새 lazy를 만들고
 *  2) 원래 import가 또 실패하면, 오류에 적힌 파일 주소에 ?retry=n을 붙여 한 번 더 받는다.
 * 새 버전이 배포되어 파일 자체가 없어진 경우는 main.tsx의 한 번 새로고침이 그대로 맡는다.
 */
export const CHUNK_URL = /(https?:\/\/[^\s'"]+?\.js)(?:\?[^\s'"]*)?(?=$|[\s'"])/;

export function chunkUrlFrom(error: unknown): string | null {
  const text = error instanceof Error ? error.message : String(error ?? '');
  const match = CHUNK_URL.exec(text);
  return match ? match[1] : null;
}

export function retryUrl(url: string, attempt: number): string {
  return `${url}${url.includes('?') ? '&' : '?'}retry=${attempt}-${Date.now().toString(36)}`;
}

type Loader<M> = () => Promise<M>;
type Importer = (url: string) => Promise<unknown>;

// 시험에서 바꿔 끼울 수 있게 따로 둔다. 실제로는 브라우저의 import()를 쓴다.
let importUrl: Importer = url => import(/* @vite-ignore */ url);
export function setRetryImporterForTest(next: Importer | null) { importUrl = next ?? (url => import(/* @vite-ignore */ url)); }

export interface RetryableLoad<C> {
  /** 실제로 화면을 받는 함수. 다시 시도하는 중이면 주소를 바꿔 한 번 더 받는다. */
  load: () => Promise<C>;
  /** 지금까지 화면 파일 받기에 실패했는지(마지막 시도가 실패였는지). */
  failed: () => boolean;
  /** 실패했으면 다음 시도를 준비한다. 준비했으면 true. */
  prepareRetry: () => boolean;
}

/** React와 상관없는 부분: 받기·실패 기억·주소 바꿔 다시 받기. 시험하기 쉽게 따로 뺐다. */
export function retryableLoad<M, C>(loader: Loader<M>, pick: (module: M) => C): RetryableLoad<C> {
  let failedOnce = false;
  let attempt = 0;
  let lastUrl: string | null = null;
  return {
    failed: () => failedOnce,
    prepareRetry: () => { if (!failedOnce) return false; attempt++; return true; },
    load: async () => {
      try {
        const module = await loader();
        failedOnce = false;
        return pick(module);
      } catch (error) {
        if (!isChunkLoadError(error)) throw error;
        failedOnce = true;
        lastUrl = chunkUrlFrom(error) ?? lastUrl;
        // 처음 실패했을 때는 그대로 알린다(배포 직후라면 main.tsx가 새로고침한다).
        // 다시 시도하는 중이고 파일 주소를 알면, 주소를 바꿔 한 번 더 받아 본다.
        const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
        if (attempt > 0 && lastUrl && !offline) {
          const module = await importUrl(retryUrl(lastUrl, attempt)) as M;
          failedOnce = false;
          return pick(module);
        }
        throw error;
      }
    },
  };
}

// 실패한 lazy들. '다시 열기'를 누르거나 오류 화면을 떠날 때만 새로 만든다.
// (그리는 도중에 새로 만들면, 실패 → 다시 그리기 → 또 새로 받기가 끝없이 되풀이된다.)
const resetters = new Set<() => boolean>();

/** 실패했던 화면들을 다음에 그릴 때 새로 받게 한다. 하나라도 준비했으면 true. */
export function resetFailedLazies(): boolean {
  let any = false;
  resetters.forEach(reset => { if (reset()) any = true; });
  return any;
}

/**
 * lazyWithRetry(() => import('./GamePlayPage'), m => m.GamePlayPage)
 * 받기에 실패한 뒤 resetFailedLazies()가 불리면, 다음에 그릴 때 새 lazy로 다시 받는다.
 */
export function lazyWithRetry<M, P extends object>(loader: Loader<M>, pick: (module: M) => ComponentType<P>): ComponentType<P> {
  const retry = retryableLoad(loader, pick);
  const make = (): LazyExoticComponent<ComponentType<P>> => lazy(async () => ({ default: await retry.load() }));
  let current = make();
  resetters.add(() => { if (!retry.prepareRetry()) return false; current = make(); return true; });
  function RetryableLazy(props: P) {
    // 그리는 동안에는 아무것도 바꾸지 않고, 지금 준비된 lazy를 그린다.
    return createElement(current as ComponentType<P>, props);
  }
  return RetryableLazy;
}
