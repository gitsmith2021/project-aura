"use client";

import React, { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Building2, Bell, ShieldCheck, CreditCard, Save, Globe, Smartphone, Mail, Lock, Upload, Server } from "lucide-react";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("general");
  const [isSaving, setIsSaving] = useState(false);

  const tabs = [
    { id: "general", label: "General", icon: Building2 },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "security", label: "Security", icon: ShieldCheck },
    { id: "billing", label: "Billing & Plans", icon: CreditCard },
  ];

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => setIsSaving(false), 1000);
  };

  return (
    <DashboardLayout>
      <div className="px-6 pt-2 pb-4 w-full flex flex-col h-[calc(100vh-56px)] min-h-0 overflow-hidden bg-slate-50/50">
        <div className="mb-3 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-slate-900 tracking-tight leading-tight">Platform Settings</h1>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">Global configuration for institutions in your group.</p>
          </div>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors text-xs font-semibold shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save size={14} />
            )}
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>

        <div className="flex flex-1 min-h-0 overflow-hidden bg-white border border-slate-200 rounded-xl shadow-sm">
          {/* Settings Sidebar */}
          <div className="w-56 border-r border-slate-200 bg-slate-50/50 flex flex-col shrink-0 p-3">
            <div className="space-y-0.5">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs font-semibold transition-colors ${
                      isActive 
                        ? "bg-purple-50 text-purple-700" 
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <Icon size={16} className={isActive ? "text-purple-600" : "text-slate-400"} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Settings Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-white">
            <div className="max-w-2xl">
              {activeTab === "general" && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">Group Profile</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">Group Name</label>
                        <input type="text" defaultValue="Bishop's Education Group" className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500/20 focus:border-purple-500 text-xs" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">Contact Email</label>
                        <input type="email" defaultValue="chairman@bishopgroup.edu" className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500/20 focus:border-purple-500 text-xs" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">Default Academic Year</label>
                        <select className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500/20 focus:border-purple-500 text-xs bg-white">
                          <option>2025 - 2026</option>
                          <option>2026 - 2027</option>
                          <option>2027 - 2028</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">Timezone</label>
                        <select className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500/20 focus:border-purple-500 text-xs bg-white">
                          <option>(UTC+05:30) Chennai, Kolkata, Mumbai, New Delhi</option>
                          <option>(UTC+00:00) Greenwich Mean Time</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">Branding</h2>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-md bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center">
                        <Building2 className="text-slate-400 w-6 h-6" />
                      </div>
                      <div>
                        <button className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-md hover:bg-slate-50 transition-colors text-xs font-semibold mb-1">
                          <Upload size={14} />
                          Upload Logo
                        </button>
                        <p className="text-[11px] text-slate-500">Recommended size: 256x256px. PNG or JPG.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "notifications" && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">Communication Gateways</h2>
                    <p className="text-xs text-slate-500 mb-3">Configure global SMS and Email gateways used across all your institutions.</p>
                    
                    <div className="space-y-4">
                      <div className="p-3 border border-slate-200 rounded-md bg-slate-50/50">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 bg-blue-100 rounded-md flex items-center justify-center">
                            <Smartphone className="w-3.5 h-3.5 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-900 text-xs">SMS Provider</h3>
                            <p className="text-[11px] text-slate-500">Twilio / AWS SNS</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-semibold text-slate-700">API Key</label>
                            <input type="password" defaultValue="************************" className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500/20 focus:border-purple-500 text-xs" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-semibold text-slate-700">Sender ID</label>
                            <input type="text" defaultValue="BISHOP_GRP" className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500/20 focus:border-purple-500 text-xs" />
                          </div>
                        </div>
                      </div>

                      <div className="p-3 border border-slate-200 rounded-md bg-slate-50/50">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 bg-orange-100 rounded-md flex items-center justify-center">
                            <Mail className="w-3.5 h-3.5 text-orange-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-900 text-xs">SMTP Settings</h3>
                            <p className="text-[11px] text-slate-500">SendGrid / Postmark</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-semibold text-slate-700">SMTP Host</label>
                            <input type="text" defaultValue="smtp.sendgrid.net" className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500/20 focus:border-purple-500 text-xs" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-semibold text-slate-700">SMTP Port</label>
                            <input type="text" defaultValue="587" className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500/20 focus:border-purple-500 text-xs" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">Chairman Alerts</h2>
                    <div className="space-y-3">
                      <label className="flex items-center justify-between p-2.5 border border-slate-200 rounded-md bg-white cursor-pointer hover:bg-slate-50 transition-colors">
                        <div>
                          <p className="text-xs font-semibold text-slate-900">Daily Digest Email</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">Receive a summary of attendance and activities across all colleges.</p>
                        </div>
                        <div className="relative inline-flex h-4 w-7 items-center rounded-full bg-purple-600">
                          <span className="inline-block h-3 w-3 translate-x-3.5 transform rounded-full bg-white transition" />
                        </div>
                      </label>
                      <label className="flex items-center justify-between p-2.5 border border-slate-200 rounded-md bg-white cursor-pointer hover:bg-slate-50 transition-colors">
                        <div>
                          <p className="text-xs font-semibold text-slate-900">System Downtime Alerts</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">Get instant SMS if any campus server goes offline.</p>
                        </div>
                        <div className="relative inline-flex h-4 w-7 items-center rounded-full bg-purple-600">
                          <span className="inline-block h-3 w-3 translate-x-3.5 transform rounded-full bg-white transition" />
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "security" && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">Global Security Policies</h2>
                    
                    <div className="space-y-3">
                      <label className="flex items-center justify-between p-3 border border-slate-200 rounded-md bg-white cursor-pointer hover:bg-slate-50 transition-colors">
                        <div className="flex items-start gap-2.5">
                          <div className="w-7 h-7 bg-emerald-100 rounded-md flex items-center justify-center shrink-0">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-900">Enforce Two-Factor Authentication (2FA)</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">Require all staff and admins to use 2FA when logging into the platform.</p>
                          </div>
                        </div>
                        <div className="relative inline-flex h-4 w-7 items-center rounded-full bg-slate-200">
                          <span className="inline-block h-3 w-3 translate-x-0.5 transform rounded-full bg-white transition shadow-sm" />
                        </div>
                      </label>

                      <label className="flex items-center justify-between p-3 border border-slate-200 rounded-md bg-white cursor-pointer hover:bg-slate-50 transition-colors">
                        <div className="flex items-start gap-2.5">
                          <div className="w-7 h-7 bg-rose-100 rounded-md flex items-center justify-center shrink-0">
                            <Lock className="w-3.5 h-3.5 text-rose-600" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-900">Strict Password Policy</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">Require minimum 12 characters, including uppercase, numbers, and symbols.</p>
                          </div>
                        </div>
                        <div className="relative inline-flex h-4 w-7 items-center rounded-full bg-purple-600">
                          <span className="inline-block h-3 w-3 translate-x-3.5 transform rounded-full bg-white transition shadow-sm" />
                        </div>
                      </label>
                    </div>
                  </div>

                  <div>
                    <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">Session Management</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">Idle Session Timeout</label>
                        <select className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500/20 focus:border-purple-500 text-xs bg-white">
                          <option>15 Minutes</option>
                          <option>30 Minutes</option>
                          <option>1 Hour</option>
                          <option>Never timeout</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700">Max Concurrent Sessions</label>
                        <select className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500/20 focus:border-purple-500 text-xs bg-white">
                          <option>1 Device</option>
                          <option>3 Devices</option>
                          <option>Unlimited</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "billing" && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">Current Subscription</h2>
                    <div className="bg-gradient-to-r from-purple-900 to-indigo-900 rounded-lg p-5 text-white relative overflow-hidden">
                      <div className="absolute right-0 top-0 opacity-10 pointer-events-none">
                        <Globe size={120} className="-mt-8 -mr-8" />
                      </div>
                      <div className="relative z-10">
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-semibold mb-3 border border-white/10 backdrop-blur-sm">
                          Enterprise Group Plan
                        </div>
                        <div className="flex items-end gap-1.5 mb-1.5">
                          <span className="text-3xl font-bold">$1,250</span>
                          <span className="text-purple-200 text-xs pb-1">/ month</span>
                        </div>
                        <p className="text-xs text-purple-200 max-w-xs mb-4">
                          Unlimited institutions, up to 10,000 active students, and dedicated priority support.
                        </p>
                        <div className="flex items-center gap-3">
                          <button className="px-3 py-1.5 bg-white text-purple-900 rounded-md text-xs font-semibold hover:bg-slate-50 transition-colors">
                            Manage Plan
                          </button>
                          <button className="px-3 py-1.5 bg-purple-800/50 border border-purple-400/30 text-white rounded-md text-xs font-medium hover:bg-purple-800/70 transition-colors">
                            View Invoices
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3.5 border border-slate-200 rounded-lg bg-white shadow-sm flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                          <CreditCard className="w-4 h-4 text-slate-600" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-900">Visa ending in 4242</p>
                          <p className="text-[11px] text-slate-500">Expires 12/2028</p>
                        </div>
                      </div>
                      <button className="text-xs text-purple-600 font-semibold hover:text-purple-700">Edit</button>
                    </div>

                    <div className="p-3.5 border border-slate-200 rounded-lg bg-white shadow-sm flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                          <Server className="w-4 h-4 text-slate-600" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-900">Database Storage</p>
                          <p className="text-[11px] text-slate-500">45 GB / 100 GB used</p>
                        </div>
                      </div>
                      <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 w-[45%]" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}