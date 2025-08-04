import { Routes, Route } from 'react-router-dom'
import { Toaster } from './components/ui/Toaster'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import DashboardPage from './pages/DashboardPage'
import CreateLinkPage from './pages/CreateLinkPage'

function App() {
  return (
    <>
      <Layout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/create" element={<CreateLinkPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
        </Routes>
      </Layout>
      <Toaster />
    </>
  )
}

export default App 