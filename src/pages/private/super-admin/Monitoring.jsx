import React from 'react';
import Sidebar from '../../../components/Sidebar.jsx';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card.jsx';

const Monitoring = () => {
  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-50">
      <Sidebar />
      <main className="flex-1 px-4 py-6 lg:px-10 lg:py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Monitoreo</h1>
          <p className="text-xs text-slate-400">Estado del sistema y salud de servicios (SUPER_ADMIN).</p>
        </header>
        <Card>
          <CardHeader>
            <CardTitle>Monitoreo</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-400">Métricas de plataforma y jobs (en construcción).</p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Monitoring;
