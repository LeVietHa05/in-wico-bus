'use client';

import { useState, useEffect, useCallback } from 'react';
import { BusRoute, Stop } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

const defaultStop = (order: number): Stop => ({
  id: uuidv4(),
  name: '',
  lat: 0,
  lng: 0,
  order,
});

export default function RoutesPage() {
  const [routes, setRoutes] = useState<BusRoute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formStops, setFormStops] = useState<Stop[]>([defaultStop(0)]);

  const fetchRoutes = useCallback(async () => {
    try {
      const res = await fetch('/api/routes');
      const json = await res.json();
      setRoutes(json.data || []);
    } catch (err) {
      console.error('Failed to fetch routes:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchRoutes(); }, [fetchRoutes]);

  const resetForm = () => {
    setFormName('');
    setFormStops([defaultStop(0)]);
    setEditingId(null);
    setShowForm(false);
  };

  const openEdit = (route: BusRoute) => {
    setFormName(route.name);
    setFormStops(route.stops.length > 0 ? route.stops : [defaultStop(0)]);
    setEditingId(route.id);
    setShowForm(true);
  };

  const handleAddStop = () => {
    setFormStops([...formStops, defaultStop(formStops.length)]);
  };

  const handleRemoveStop = (index: number) => {
    setFormStops(formStops.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i })));
  };

  const handleStopChange = (index: number, field: keyof Stop, value: string | number) => {
    const updated = [...formStops];
    (updated[index] as any)[field] = value;
    setFormStops(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const validStops = formStops.filter((s) => s.name.trim());

    const url = editingId ? `/api/routes/${editingId}` : '/api/routes';
    const method = editingId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName.trim(),
          stops: validStops,
        }),
      });

      if (res.ok) {
        resetForm();
        fetchRoutes();
      }
    } catch (err) {
      console.error('Failed to save route:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this route?')) return;
    try {
      const res = await fetch(`/api/routes/${id}`, { method: 'DELETE' });
      if (res.ok) fetchRoutes();
    } catch (err) {
      console.error('Failed to delete route:', err);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Route Management</h1>
          <p className="text-sm text-gray-500">Create and manage bus routes with stops</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(!showForm); }}
          className="px-4 py-2 bg-[var(--primary)] text-white text-sm font-medium rounded-md hover:bg-[var(--primary-light)] transition-colors"
        >
          {showForm ? 'Cancel' : 'New Route'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-[var(--border)] p-6 mb-6">
          <h2 className="text-base font-semibold mb-4">
            {editingId ? 'Edit Route' : 'New Route'}
          </h2>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Route Name</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
              placeholder="e.g. Route A - North"
              required
            />
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Stops</label>
              <button
                type="button"
                onClick={handleAddStop}
                className="text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                + Add Stop
              </button>
            </div>

            <div className="space-y-2">
              {formStops.map((stop, i) => (
                <div key={stop.id} className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-5 text-center">{i + 1}.</span>
                  <input
                    type="text"
                    value={stop.name}
                    onChange={(e) => handleStopChange(i, 'name', e.target.value)}
                    placeholder="Stop name"
                    className="flex-1 px-3 py-1.5 border border-[var(--border)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                  <input
                    type="number"
                    step="any"
                    value={stop.lat || ''}
                    onChange={(e) => handleStopChange(i, 'lat', parseFloat(e.target.value) || 0)}
                    placeholder="Lat"
                    className="w-24 px-2 py-1.5 border border-[var(--border)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                  <input
                    type="number"
                    step="any"
                    value={stop.lng || ''}
                    onChange={(e) => handleStopChange(i, 'lng', parseFloat(e.target.value) || 0)}
                    placeholder="Lng"
                    className="w-24 px-2 py-1.5 border border-[var(--border)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveStop(i)}
                    className="text-red-500 hover:text-red-700 text-sm px-2"
                    disabled={formStops.length === 1}
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 border border-[var(--border)] text-sm rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[var(--primary)] text-white text-sm font-medium rounded-md hover:bg-[var(--primary-light)] transition-colors"
            >
              {editingId ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="text-center text-gray-400 py-12">Loading...</div>
      ) : routes.length === 0 ? (
        <div className="text-center text-gray-400 py-12 bg-white rounded-lg border border-[var(--border)]">
          No routes yet. Create your first route.
        </div>
      ) : (
        <div className="space-y-3">
          {routes.map((route) => (
            <div key={route.id} className="bg-white rounded-lg border border-[var(--border)] p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">{route.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {route.stops.length} stop{route.stops.length !== 1 ? 's' : ''}
                    {' '}&middot;{' '}
                    {route.studentIds.length} student{route.studentIds.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(route)}
                    className="px-3 py-1 text-xs border border-[var(--border)] rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(route.id)}
                    className="px-3 py-1 text-xs border border-red-200 text-red-600 rounded-md hover:bg-red-50 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
              {route.stops.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {route.stops.map((stop, i) => (
                    <span
                      key={stop.id}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-xs text-gray-600 rounded-md"
                    >
                      <span className="font-medium">{i + 1}.</span>
                      {stop.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
