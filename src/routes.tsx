import { Routes, Route, Navigate } from 'react-router-dom'
import AppShell from '@/components/layout/AppShell'
import LoginPage from '@/pages/LoginPage'
import JobsListPage from '@/pages/JobsListPage'
import JobDetailPage from '@/pages/JobDetailPage'
import CandidatesListPage from '@/pages/CandidatesListPage'
import CandidateDetailPage from '@/pages/CandidateDetailPage'

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/jobs" replace />} />
        <Route path="/jobs" element={<JobsListPage />} />
        <Route path="/jobs/:id" element={<JobDetailPage />} />
        <Route path="/candidates" element={<CandidatesListPage />} />
        <Route path="/candidates/:id" element={<CandidateDetailPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/jobs" replace />} />
    </Routes>
  )
}
