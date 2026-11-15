import {useState} from 'react';
import {QuickExperience} from './QuickExperience';
import type {ExperienceId} from '../../domain/playRecipes';
export function ExperienceTutorial({kind}:{kind:ExperienceId}){const [open,setOpen]=useState(false);return <details className="workshop-tutorial" onToggle={e=>setOpen(e.currentTarget.open)}><summary>처음인가요? 30초 원리 체험</summary>{open&&<QuickExperience kind={kind}/>}</details>;}
