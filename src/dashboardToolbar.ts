import {createContext} from 'react'
/** The Today dashboard owns its actions; the app supplies their place in the tab bar. */
export const DashboardToolbarContext=createContext<HTMLElement|null>(null)
