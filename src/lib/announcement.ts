export type Announcement={title:string;message:string;type:'INFO'|'WARNING'|'PROMOTION'|'MAINTENANCE';isActive:boolean;updatedAt:string};
const state=globalThis as unknown as {digimartAnnouncement?:Announcement};
export function getAnnouncement(){return state.digimartAnnouncement??{title:'Service update',message:'Orders are monitored in real time. Confirm delivery timing before payment.',type:'INFO' as const,isActive:true,updatedAt:new Date().toISOString()};}
export function setAnnouncement(data:Omit<Announcement,'updatedAt'>){const next={...data,updatedAt:new Date().toISOString()};state.digimartAnnouncement=next;return next;}
