"use client";

import { X } from "lucide-react";
import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function AddPersonModal({ isOpen, onClose, onSuccess }: Props) {
  const [mounted, setMounted] = useState(false);
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'STAFF' | 'STUDENT'>('STAFF');
  const [tenantId, setTenantId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  
  const [tenants, setTenants] = useState<{id: string, name: string}[]>([]);
  const [departments, setDepartments] = useState<{id: string, name: string}[]>([]);
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    const supabase = createClient();
    const { data } = await supabase.from('tenants').select('id, name').order('name');
    if (data) setTenants(data);
  };

  useEffect(() => {
    if (tenantId) {
      const fetchDepts = async () => {
        const supabase = createClient();
        const { data } = await supabase.from('departments').select('id, name').eq('tenant_id', tenantId).order('name');
        if (data) setDepartments(data);
      };
      fetchDepts();
      setDepartmentId(''); // Reset department when tenant changes
    } else {
      setDepartments([]);
    }
  }, [tenantId]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      setFullName('');
      setRole('STAFF');
      setTenantId('');
      setDepartmentId('');
    } else {
      document.body.style.overflow = "unset";
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen]);

  if (!mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !tenantId || !departmentId) return;
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.from('profiles').insert([
      { full_name: fullName, role, tenant_id: tenantId, department_id: departmentId }
    ]);

    setLoading(false);

    if (error) {
      console.error('Error inserting person:', error);
      alert('Failed to save person: ' + error.message);
    } else {
      onSuccess();
      onClose();
    }
  };

  return (
    <div className={`fixed inset-0 z-50 flex justify-end transition-opacity duration-200 ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      <div 
        className={`fixed inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity duration-200 ${isOpen ? 'opacity-100' : 'opacity-0'}`} 
        onClick={onClose}
      />
      
      <div className={`relative w-full max-w-sm h-full bg-white flex flex-col transform transition-transform duration-300 ease-out border-l border-slate-200 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-white">
          <div>
            <h2 className="text-base font-semibold text-slate-900 tracking-tight">Add Person</h2>
            <p className="text-xs text-slate-500 mt-0.5">Register a new staff or student.</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
          <form id="add-person-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700">Full Name</label>
              <input 
                type="text" 
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="John Doe" 
                required
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors text-xs"
              />
            </div>
            
            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700">Role</label>
              <select 
                value={role}
                onChange={e => setRole(e.target.value as 'STAFF' | 'STUDENT')}
                required
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors text-xs appearance-none"
              >
                <option value="STAFF">Staff</option>
                <option value="STUDENT">Student</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700">Institution</label>
              <select 
                value={tenantId}
                onChange={e => setTenantId(e.target.value)}
                required
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors text-xs appearance-none"
              >
                <option value="" disabled>Select institution...</option>
                {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-slate-700">Department</label>
              <select 
                value={departmentId}
                onChange={e => setDepartmentId(e.target.value)}
                required
                disabled={!tenantId || departments.length === 0}
                className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors text-xs appearance-none disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="" disabled>
                  {!tenantId ? 'Select an institution first...' : departments.length === 0 ? 'No departments available' : 'Select department...'}
                </option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </form>
        </div>

        <div className="p-4 border-t border-slate-100 bg-white flex justify-end gap-2">
          <button 
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-md hover:bg-slate-50 hover:text-slate-900 transition-colors"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            form="add-person-form"
            disabled={loading}
            className="px-3 py-1.5 text-xs font-medium text-white bg-purple-600 border border-purple-700 rounded-md hover:bg-purple-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></span> : null}
            Add Person
          </button>
        </div>
      </div>
    </div>
  );
}
