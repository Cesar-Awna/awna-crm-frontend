import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/public/Login.jsx';
import PrivateRoute from './components/PrivateRoute.jsx';
import DefaultRedirect from './components/DefaultRedirect.jsx';

import Dashboard from './pages/private/company-admin/Dashboard.jsx';
import MyDay from './pages/private/executive/MyDay.jsx';
import LeadsRouter from './pages/private/LeadsRouter.jsx';
import NewLead from './pages/private/executive/NewLeadV2.jsx';
import DormantLeadsRouter from './pages/private/DormantLeadsRouter.jsx';
import StagnantLeadsRouter from './pages/private/StagnantLeadsRouter.jsx';
import RankingRouter from './pages/private/RankingRouter.jsx';
import MyRanking from './pages/private/executive/MyRanking.jsx';
import MetricsRouter from './pages/private/MetricsRouter.jsx';
import MyMetrics from './pages/private/executive/MyMetrics.jsx';
import AssignmentsRouter from './pages/private/AssignmentsRouter.jsx';
import Notifications from './pages/private/shared/Notifications.jsx';
import Profile from './pages/private/shared/Profile.jsx';
import AdminPanel from './pages/private/company-admin/AdminPanel.jsx';
import Audit from './pages/private/company-admin/Audit.jsx';
import Companies from './pages/private/super-admin/Companies.jsx';
import CompanyDetail from './pages/private/super-admin/CompanyDetail.jsx';
import Monitoring from './pages/private/super-admin/Monitoring.jsx';
import Support from './pages/private/super-admin/Support.jsx';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<PrivateRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/my-day" element={<MyDay />} />
          <Route path="/leads" element={<LeadsRouter />} />
          <Route path="/leads/new" element={<NewLead />} />
          <Route path="/leads/dormant" element={<DormantLeadsRouter />} />
          <Route path="/leads/stagnant" element={<StagnantLeadsRouter />} />
          <Route path="/leads/:leadId" element={<NewLead />} />
          <Route path="/ranking" element={<RankingRouter />} />
          <Route path="/my-ranking" element={<MyRanking />} />
          <Route path="/metrics" element={<MetricsRouter />} />
          <Route path="/my-metrics" element={<MyMetrics />} />
          <Route path="/assignments" element={<AssignmentsRouter />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/audit" element={<Audit />} />
          <Route path="/companies" element={<Companies />} />
          <Route path="/companies/:id" element={<CompanyDetail />} />
          <Route path="/monitoring" element={<Monitoring />} />
          <Route path="/support" element={<Support />} />
          <Route path="*" element={<DefaultRedirect />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
