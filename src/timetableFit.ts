/** Find the largest readable type size whose actual wrapped table fits its widget. */
export function largestTimetableFont(maximum:number,fits:(fontSize:number)=>boolean){
 let low=.1,high=Math.max(low,maximum)
 for(let i=0;i<14;i++){
  const middle=(low+high)/2
  if(fits(middle))low=middle
  else high=middle
 }
 return low
}
