import type {ReactNode} from 'react';
import type {ExpeditionAction} from './MapGame';
import {DeviceStatusContext} from './deviceStatusContext';
export function DeviceReporting({send,children}:{send:ExpeditionAction|null;children:ReactNode}){return <DeviceStatusContext.Provider value={send}>{children}</DeviceStatusContext.Provider>;}
