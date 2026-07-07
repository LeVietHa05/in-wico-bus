'use client';

import { useState, useEffect, useCallback } from 'react';
import { Student, BusRoute } from '@/lib/types';

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [routes, setRoutes] = useState<BusRoute[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formRfid, setFormRfid] = useState('');
  const [formParentName, setFormParentName] = useState('');
  const [formParentEmail, setFormParentEmail] = useState('');
  const [formRouteIds, setFormRouteIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [studentsRes, routesRes] = await Promise.all([
        fetch('/api/students'),
        fetch('/api/routes'),
      ]);
      const studentsJson = await studentsRes.json();
      const routesJson = await routesRes.json();
      setStudents(studentsJson.data || []);
      setRoutes(routesJson.data || []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const resetForm = () => {
    setFormName('');
    setFormRfid('');
    setFormParentName('');
    setFormParentEmail('');
    setFormRouteIds([]);
    setEditingId(null);
    setShowForm(false);
    setErrors([]);
    setSubmitting(false);
  };

  const openEdit = (student: Student) => {
    setFormName(student.name);
    setFormRfid(student.rfidTag);
    setFormParentName(student.parentName || '');
    setFormParentEmail(student.parentEmail || '');
    setFormRouteIds(student.routeIds);
    setEditingId(student.id);
    setShowForm(true);
    setErrors([]);
    setSubmitting(false);
  };

  const handleToggleRoute = (routeId: string) => {
    setFormRouteIds((prev) =>
      prev.includes(routeId)
        ? prev.filter((id) => id !== routeId)
        : [...prev, routeId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);

    const errs: string[] = [];
    if (!formName.trim()) errs.push('Student name is required');
    if (!formRfid.trim()) errs.push('RFID tag is required');
    if (errs.length > 0) { setErrors(errs); return; }

    setSubmitting(true);

    const url = editingId ? `/api/students/${editingId}` : '/api/students';
    const method = editingId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName.trim(),
          rfidTag: formRfid.trim(),
          parentName: formParentName.trim(),
          parentEmail: formParentEmail.trim(),
          routeIds: formRouteIds,
        }),
      });

      if (res.ok) {
        resetForm();
        fetchData();
      } else {
        const err = await res.json();
        setErrors([err.error || 'Failed to save student']);
        setSubmitting(false);
      }
    } catch {
      setErrors(['Failed to save student. Check your connection.']);
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this student?')) return;
    try {
      const res = await fetch(`/api/students/${id}`, { method: 'DELETE' });
      if (res.ok) fetchData();
    } catch (err) {
      console.error('Failed to delete student:', err);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Student Management</h1>
          <p className="text-sm text-gray-500">Register students and assign them to routes</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(!showForm); }}
          className="px-4 py-2 bg-[var(--primary)] text-white text-sm font-medium rounded-md hover:bg-[var(--primary-light)] transition-colors"
        >
          {showForm ? 'Cancel' : 'New Student'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-[var(--border)] p-6 mb-6">
          <h2 className="text-base font-semibold mb-4">
            {editingId ? 'Edit Student' : 'New Student'}
          </h2>

          {errors.length > 0 && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              {errors.map((err, i) => (
                <p key={i} className="text-sm text-red-700">{err}</p>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Student Name</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                placeholder="e.g. John Doe"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">RFID Tag</label>
              <input
                type="text"
                value={formRfid}
                onChange={(e) => setFormRfid(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                placeholder="e.g. A1:B2:C3:D4"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parent Name</label>
              <input
                type="text"
                value={formParentName}
                onChange={(e) => setFormParentName(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                placeholder="e.g. Jane Doe"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parent Email</label>
              <input
                type="email"
                value={formParentEmail}
                onChange={(e) => setFormParentEmail(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                placeholder="e.g. parent@example.com"
              />
            </div>
          </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Assigned Routes</label>
            {routes.length === 0 ? (
              <p className="text-sm text-gray-400">No routes available. Create routes first.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {routes.map((route) => (
                  <label
                    key={route.id}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm cursor-pointer transition-colors ${
                      formRouteIds.includes(route.id)
                        ? 'border-[var(--primary)] bg-blue-50 text-[var(--primary)]'
                        : 'border-[var(--border)] text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formRouteIds.includes(route.id)}
                      onChange={() => handleToggleRoute(route.id)}
                      className="sr-only"
                    />
                    {route.name}
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={resetForm}
              disabled={submitting}
              className="px-4 py-2 border border-[var(--border)] text-sm rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-[var(--primary)] text-white text-sm font-medium rounded-md hover:bg-[var(--primary-light)] transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {submitting && (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {submitting ? 'Saving...' : editingId ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="text-center text-gray-400 py-12">Loading...</div>
      ) : students.length === 0 ? (
        <div className="text-center text-gray-400 py-12 bg-white rounded-lg border border-[var(--border)]">
          No students registered yet.
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-[var(--border)] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-[var(--border)]">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">RFID Tag</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Routes</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {students.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                        {student.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-gray-900">{student.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-gray-600">{student.rfidTag}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {student.routeIds.length === 0 ? (
                        <span className="text-xs text-gray-400">None</span>
                      ) : (
                        student.routeIds.map((rid) => {
                          const route = routes.find((r) => r.id === rid);
                          return (
                            <span key={rid} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">
                              {route?.name || 'Unknown'}
                            </span>
                          );
                        })
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-1 justify-end">
                      <button
                        onClick={() => openEdit(student)}
                        className="px-3 py-1 text-xs border border-[var(--border)] rounded-md hover:bg-gray-50 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(student.id)}
                        className="px-3 py-1 text-xs border border-red-200 text-red-600 rounded-md hover:bg-red-50 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
