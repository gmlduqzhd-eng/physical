import {readJsonStorage,writeStorage} from './browserStorage';
import {classStorageKey} from '../domain/classRoster';
import {parseSeriesProgress,type SeriesProgress} from '../domain/sportSeries';

/** 반마다 종목 연속 차시에서 마친 차시(이 기기에만). 반을 지우면 함께 지운다(CLASS_DATA_KEYS). */
export const SERIES_BASE='physical_sport_series_v1';
export const readSeries=(classId:string)=>parseSeriesProgress(readJsonStorage(classStorageKey(SERIES_BASE,classId)));
export const writeSeries=(classId:string,p:SeriesProgress)=>writeStorage(classStorageKey(SERIES_BASE,classId),JSON.stringify(p));
