import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export type UserProfile = {
  firstName: string
  lastName: string
  email: string
  phone: string
}

type AuthState = {
  activeUser: UserProfile | null
  pendingUser: UserProfile | null
}

const initialState: AuthState = { activeUser: null, pendingUser: null }

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setPendingUser: (state, action: PayloadAction<UserProfile>) => {
      state.pendingUser = action.payload
      state.activeUser = null
    },
    setActiveUser: (state, action: PayloadAction<UserProfile>) => {
      state.activeUser = action.payload
      state.pendingUser = null
    },
    clearAuth: (state) => {
      state.activeUser = null
      state.pendingUser = null
    },
  },
})

export const { setPendingUser, setActiveUser, clearAuth } = authSlice.actions
export default authSlice.reducer
