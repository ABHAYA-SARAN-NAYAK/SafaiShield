import { Routes, Route } from 'react-router-dom';
import { WorkerProvider } from './context/WorkerContext';
import { SessionProvider } from './context/SessionContext';
import { AlertProvider, useAlert } from './context/AlertContext';
import Navbar from './components/layout/Navbar';
import BottomNav from './components/layout/BottomNav';
import Home from './pages/Home';
import PreEntryCheck from './pages/PreEntryCheck';
import DescentGuardian from './pages/DescentGuardian';
import RightsAdvisor from './pages/RightsAdvisor';
import DangerMap from './pages/DangerMap';
import JobHistory from './pages/JobHistory';
import WorkerProfile from './pages/WorkerProfile';
import AdminPanel from './pages/AdminPanel';

function AppContent() {
  const { isAlarming } = useAlert();

  return (
    <div className={`flex flex-col min-h-dvh ${isAlarming ? 'screen-flash' : ''}`}>
      <Navbar />
      <main className="flex-1 pb-20">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/check" element={<PreEntryCheck />} />
          <Route path="/descend" element={<DescentGuardian />} />
          <Route path="/report" element={<RightsAdvisor />} />
          <Route path="/map" element={<DangerMap />} />
          <Route path="/history" element={<JobHistory />} />
          <Route path="/profile" element={<WorkerProfile />} />
          <Route path="/admin" element={<AdminPanel />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  );
}

export default function App() {
  return (
    <WorkerProvider>
      <SessionProvider>
        <AlertProvider>
          <AppContent />
        </AlertProvider>
      </SessionProvider>
    </WorkerProvider>
  );
}
