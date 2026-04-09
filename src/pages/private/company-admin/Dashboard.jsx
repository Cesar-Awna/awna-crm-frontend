import React from 'react';
import Sidebar from '../../../components/Sidebar.jsx';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card.jsx';

const Dashboard = () => {
  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-50">
      <Sidebar />
      <main className="flex-1 px-4 py-6 lg:px-10 lg:py-8">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
              Dashboard
            </h1>
            <p className="text-xs text-slate-400">
              Resumen general de tu empresa (COMPANY_ADMIN).
            </p>
          </div>
        </header>
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle>Bienvenido al panel de administración</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-300">
              Usa el menú izquierdo para gestionar usuarios, unidades de negocio y revisar la
              actividad de tu empresa.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Dashboard;

