import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ROUTES } from './constants'
import { Checkout } from './pages/Checkout'
import { Registration } from './pages/Registration'
import { getCurrentUser } from './services/api'
import { setActiveUser } from './store/authSlice'
import type { AppDispatch } from './store/store'

function App() {
  const dispatch = useDispatch<AppDispatch>()

  useEffect(() => {
    getCurrentUser()
      .then(({ user }) => dispatch(setActiveUser(user)))
      .catch(() => undefined)
  }, [dispatch])

  return (
    <BrowserRouter>
      <div className="app-shell">
        <Routes>
          <Route path="/" element={<Navigate to={ROUTES.registration} replace />} />
          <Route path={ROUTES.registration} element={<Registration />} />
          <Route path={ROUTES.checkout} element={<Checkout />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
