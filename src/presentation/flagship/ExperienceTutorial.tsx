import {useState} from 'react';
import {QuickExperience} from './QuickExperience';
import type {ExperienceId} from '../../domain/playRecipes';
export function ExperienceTutorial({kind,defaultOpen=false}:{kind:ExperienceId;defaultOpen?:boolean}){const [open,setOpen]=useState(defaultOpen);return <details className="workshop-tutorial" open={open} onToggle={e=>setOpen(e.currentTarget.open)}><summary>처음인가요? 30초 원리 체험</summary>{open&&<QuickExperience kind={kind}/>}</details>;}
