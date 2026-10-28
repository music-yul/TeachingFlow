import type { AppData } from './types'
import { taskCoversDate } from './taskDates'
import { collectionMembers } from './members'
export type SummaryKind='notices'|'collections'|'tasks'|'followups'
export const summaryNames:Record<SummaryKind,string>={notices:'안내할 일',collections:'취합 확인',tasks:'업무 확인',followups:'후속 확인'}
export function getTodayActions(data:AppData,date:string){const desk=data.teacherDesk;return{
 notices:data.settings.features.homeroom?desk.notices.filter(item=>!item.done&&taskCoversDate(item,date,true)):[],
 collections:data.settings.features.homeroom?desk.collections.filter(item=>!item.archived&&item.date===date&&collectionMembers(desk,item,date).some(s=>!item.received.includes(s.id))):[],
 tasks:data.settings.features.work?desk.tasks.filter(item=>!item.done&&taskCoversDate(item,date)):[],
 followups:data.settings.features.homeroom?desk.records.filter(item=>!item.followed&&item.followDate===date):[],
}}
