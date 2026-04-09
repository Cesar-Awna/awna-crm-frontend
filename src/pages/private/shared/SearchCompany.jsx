import React from 'react';
import Sidebar from '../../../components/Sidebar.jsx';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/card.jsx';
import { Input } from '../../../components/ui/input.jsx';
import { Button } from '../../../components/ui/button.jsx';

const SearchCompany = () => {
  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-50">
      <Sidebar />
      <main className="flex-1 px-4 py-6 lg:px-10 lg:py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Buscar Empresa</h1>
          <p className="text-xs text-slate-400">
            Búsqueda de leads por RUT o razón social (placeholder).
          </p>
        </header>
        <Card className="max-w-xl">
          <CardHeader>
            <CardTitle>Buscar</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-3">
              <Input placeholder="RUT o nombre de empresa" />
              <Button type="button">Buscar (demo)</Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default SearchCompany;

