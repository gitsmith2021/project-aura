"use client";

import React, { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { InstitutionTabBar } from "@/components/layout/InstitutionTabBar";
import { createClient } from "@/utils/supabase/client";
import {
  Building2,
  Bell,
  ShieldCheck,
  CreditCard,
  Save,
  Globe,
  Smartphone,
  Mail,
  Lock,
  Upload,
  Server,
  Workflow,
  Cpu,
} from "lucide-react";

type Institution = {
  id: string;
  name: string;
  college_type: string | null;
  subdomain: string | null;
  session_types: string[] | null;
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("general");
  const [isSaving, setIsSaving] = useState(false);

  // Campuses state
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selectedInstId, setSelectedInstId] = useState("");
  const [calendarMode, setCalendarMode] = useState("Semester");
  const [nfcEnabled, setNfcEnabled] = useState(true);
  const [autoPublish, setAutoPublish] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("institutions")
      .select("id, name, college_type, subdomain, session_types")
      .order("name")
      .then(({ data }) => {
        if (data) {
          setInstitutions(data);
          if (data.length > 0) {
            setSelectedInstId(data[0].id);
          }
        }
      });
  }, []);

  const tabs = [
    { id: "general", label: "Platform General", icon: Server },
    { id: "campuses", label: "Institution Settings", icon: Building2 },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "security", label: "Security", icon: ShieldCheck },
    { id: "billing", label: "Billing & Plans", icon: CreditCard },
  ];

  const handleSave = async () => {
    setIsSaving(true);

    if (activeTab === "campuses" && selectedInstId) {
      const activeInst = institutions.find((i) => i.id === selectedInstId);
      if (activeInst) {
        const supabase = createClient();
        const { error } = await supabase
          .from("institutions")
          .update({
            name: activeInst.name,
            college_type: activeInst.college_type,
          })
          .eq("id", activeInst.id);

        if (error) {
          alert("Failed to save changes: " + error.message);
        }
      }
    }

    setTimeout(() => setIsSaving(false), 1000);
  };

  const activeInst = institutions.find((i) => i.id === selectedInstId);

  return (
    <DashboardLayout>
      <div className="px-6 pt-2 pb-4 w-full flex flex-col h-[calc(100vh-56px)] min-h-0 overflow-hidden bg-slate-50/50 dark:bg-slate-950/20">
        <div className="mb-3 shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
              Platform Settings
            </h1>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
              Global and campus-specific configuration for institutions in your group.
            </p>
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

        <div className="flex flex-1 min-h-0 overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
          {/* Settings Sidebar */}
          <div className="w-56 border-r border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col shrink-0 p-3">
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
                        ? "bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-250"
                    }`}
                  >
                    <Icon
                      size={16}
                      className={isActive ? "text-purple-600 dark:text-purple-400" : "text-slate-400"}
                    />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Settings Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-white dark:bg-slate-900">
            <div className="max-w-2xl">
              {activeTab === "general" && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2 mb-3">
                      Group Profile
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-350">
                          Group Name
                        </label>
                        <input
                          type="text"
                          defaultValue="Bishop's Education Group"
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500/20 focus:border-purple-500 text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-350">
                          Contact Email
                        </label>
                        <input
                          type="email"
                          defaultValue="chairman@bishopgroup.edu"
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500/20 focus:border-purple-500 text-xs"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-350">
                          Default Academic Year
                        </label>
                        <select className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500/20 focus:border-purple-500 text-xs bg-white">
                          <option>2025 - 2026</option>
                          <option>2026 - 2027</option>
                          <option>2027 - 2028</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-350">
                          Timezone
                        </label>
                        <select className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500/20 focus:border-purple-500 text-xs bg-white">
                          <option>(UTC+05:30) Chennai, Kolkata, Mumbai, New Delhi</option>
                          <option>(UTC+00:00) Greenwich Mean Time</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2 mb-3">
                      Branding
                    </h2>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-md bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center">
                        <Building2 className="text-slate-400 w-6 h-6" />
                      </div>
                      <div>
                        <button className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-md hover:bg-slate-50 transition-colors text-xs font-semibold mb-1">
                          <Upload size={14} />
                          Upload Logo
                        </button>
                        <p className="text-[11px] text-slate-500">
                          Recommended size: 256x256px. PNG or JPG.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "campuses" && (
                <div className="space-y-5 animate-in fade-in duration-300">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2 mb-2">
                      Campus Selector
                    </h2>
                    <InstitutionTabBar
                      institutions={institutions}
                      selectedId={selectedInstId}
                      onSelect={setSelectedInstId}
                      loading={institutions.length === 0}
                      className="mb-1"
                    />
                  </div>

                  {activeInst && (
                    <div className="space-y-5">
                      <div>
                        <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2.5">
                          Institution Profile
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-350">
                              Campus Name
                            </label>
                            <input
                              type="text"
                              value={activeInst.name}
                              onChange={(e) => {
                                const val = e.target.value;
                                setInstitutions((prev) =>
                                  prev.map((i) => (i.id === activeInst.id ? { ...i, name: val } : i))
                                );
                              }}
                              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500/20 focus:border-purple-500 text-xs"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-350">
                              College Type
                            </label>
                            <select
                              value={activeInst.college_type ?? ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                setInstitutions((prev) =>
                                  prev.map((i) =>
                                    i.id === activeInst.id ? { ...i, college_type: val } : i
                                  )
                                );
                              }}
                              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500/20 focus:border-purple-500 text-xs bg-white"
                            >
                              <option value="Arts & Science">Arts &amp; Science</option>
                              <option value="Arts">Arts</option>
                              <option value="Health">Health</option>
                              <option value="Nursing">Nursing</option>
                              <option value="Engineering">Engineering</option>
                            </select>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-350">
                              Subdomain URL
                            </label>
                            <div className="flex items-stretch rounded-md">
                              <input
                                type="text"
                                readOnly
                                value={activeInst.subdomain ?? ""}
                                className="flex-1 px-2.5 py-1.5 bg-slate-50 border border-r-0 border-slate-200 rounded-l-md text-xs text-slate-500 cursor-not-allowed"
                              />
                              <span className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-r-md text-slate-450 text-xs flex items-center">
                                .aura.edu
                              </span>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-350">
                              Academic Mode
                            </label>
                            <select
                              value={calendarMode}
                              onChange={(e) => setCalendarMode(e.target.value)}
                              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500/20 focus:border-purple-500 text-xs bg-white"
                            >
                              <option value="Semester">Semester System (UG / PG)</option>
                              <option value="Trimester">Trimester System (Professional)</option>
                              <option value="Annual">Annual Exam System</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider mb-2.5">
                          Campuses Integrations
                        </h3>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between p-2.5 border border-slate-200 dark:border-slate-800 rounded-md bg-white dark:bg-slate-900 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors">
                            <div>
                              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                <Cpu size={14} className="text-purple-600 dark:text-purple-400" />
                                NFC Attendance Synchronizer
                              </p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                Enable smart attendance locks when student badges scan physical readers.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setNfcEnabled(!nfcEnabled)}
                              className={`relative inline-flex h-4.5 w-8 items-center rounded-full transition-colors focus:outline-none ${
                                nfcEnabled ? "bg-purple-600" : "bg-slate-200 dark:bg-slate-700"
                              }`}
                            >
                              <span
                                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition ${
                                  nfcEnabled ? "translate-x-4" : "translate-x-0.5"
                                }`}
                              />
                            </button>
                          </div>

                          <div className="flex items-center justify-between p-2.5 border border-slate-200 dark:border-slate-800 rounded-md bg-white dark:bg-slate-900 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors">
                            <div>
                              <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                <Workflow size={14} className="text-purple-600 dark:text-purple-400" />
                                Auto-Publish Timetables
                              </p>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                Instantly broadcast schedules and schedule updates to student mobile applications.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setAutoPublish(!autoPublish)}
                              className={`relative inline-flex h-4.5 w-8 items-center rounded-full transition-colors focus:outline-none ${
                                autoPublish ? "bg-purple-600" : "bg-slate-200 dark:bg-slate-700"
                              }`}
                            >
                              <span
                                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition ${
                                  autoPublish ? "translate-x-4" : "translate-x-0.5"
                                }`}
                              />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "notifications" && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2 mb-3">
                      Communication Gateways
                    </h2>
                    <p className="text-xs text-slate-500 mb-3">
                      Configure global SMS and Email gateways used across all your institutions.
                    </p>

                    <div className="space-y-4">
                      <div className="p-3 border border-slate-200 dark:border-slate-850 rounded-md bg-slate-50/50 dark:bg-slate-900/50">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 bg-blue-100 dark:bg-blue-950/30 rounded-md flex items-center justify-center">
                            <Smartphone className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-xs">
                              SMS Provider
                            </h3>
                            <p className="text-[11px] text-slate-500">Twilio / AWS SNS</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-355">
                              API Key
                            </label>
                            <input
                              type="password"
                              defaultValue="************************"
                              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500/20 focus:border-purple-500 text-xs"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-355">
                              Sender ID
                            </label>
                            <input
                              type="text"
                              defaultValue="BISHOP_GRP"
                              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500/20 focus:border-purple-500 text-xs"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="p-3 border border-slate-200 dark:border-slate-850 rounded-md bg-slate-50/50 dark:bg-slate-900/50">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 bg-orange-100 dark:bg-orange-950/30 rounded-md flex items-center justify-center">
                            <Mail className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-xs">
                              SMTP Settings
                            </h3>
                            <p className="text-[11px] text-slate-500">SendGrid / Postmark</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-355">
                              SMTP Host
                            </label>
                            <input
                              type="text"
                              defaultValue="smtp.sendgrid.net"
                              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500/20 focus:border-purple-500 text-xs"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-355">
                              SMTP Port
                            </label>
                            <input
                              type="text"
                              defaultValue="587"
                              className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500/20 focus:border-purple-500 text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2 mb-3">
                      Chairman Alerts
                    </h2>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-2.5 border border-slate-200 dark:border-slate-800 rounded-md bg-white dark:bg-slate-900 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors">
                        <div>
                          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                            Daily Digest Email
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            Receive a summary of attendance and activities across all colleges.
                          </p>
                        </div>
                        <div className="relative inline-flex h-4 w-7 items-center rounded-full bg-purple-600">
                          <span className="inline-block h-3 w-3 translate-x-3.5 transform rounded-full bg-white transition" />
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-2.5 border border-slate-200 dark:border-slate-800 rounded-md bg-white dark:bg-slate-900 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors">
                        <div>
                          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                            System Downtime Alerts
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                            Get instant SMS if any campus server goes offline.
                          </p>
                        </div>
                        <div className="relative inline-flex h-4 w-7 items-center rounded-full bg-purple-600">
                          <span className="inline-block h-3 w-3 translate-x-3.5 transform rounded-full bg-white transition" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "security" && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2 mb-3">
                      Global Security Policies
                    </h2>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-800 rounded-md bg-white dark:bg-slate-900 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors">
                        <div className="flex items-start gap-2.5">
                          <div className="w-7 h-7 bg-emerald-100 dark:bg-emerald-950/30 rounded-md flex items-center justify-center shrink-0">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                              Enforce Two-Factor Authentication (2FA)
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              Require all staff and admins to use 2FA when logging into the platform.
                            </p>
                          </div>
                        </div>
                        <div className="relative inline-flex h-4 w-7 items-center rounded-full bg-slate-200 dark:bg-slate-700">
                          <span className="inline-block h-3 w-3 translate-x-0.5 transform rounded-full bg-white transition shadow-sm" />
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-800 rounded-md bg-white dark:bg-slate-900 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors">
                        <div className="flex items-start gap-2.5">
                          <div className="w-7 h-7 bg-rose-100 dark:bg-rose-950/30 rounded-md flex items-center justify-center shrink-0">
                            <Lock className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                              Strict Password Policy
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              Require minimum 12 characters, including uppercase, numbers, and symbols.
                            </p>
                          </div>
                        </div>
                        <div className="relative inline-flex h-4 w-7 items-center rounded-full bg-purple-600">
                          <span className="inline-block h-3 w-3 translate-x-3.5 transform rounded-full bg-white transition shadow-sm" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2 mb-3">
                      Session Management
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-350">
                          Idle Session Timeout
                        </label>
                        <select className="w-full px-2.5 py-1.5 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500/20 focus:border-purple-500 text-xs bg-white">
                          <option>15 Minutes</option>
                          <option>30 Minutes</option>
                          <option>1 Hour</option>
                          <option>Never timeout</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-350">
                          Max Concurrent Sessions
                        </label>
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
                    <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-2 mb-3">
                      Current Subscription
                    </h2>
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
                          Unlimited institutions, up to 10,000 active students, and dedicated
                          priority support.
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
                    <div className="p-3.5 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 shadow-sm flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                          <CreditCard className="w-4 h-4 text-slate-600" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                            Visa ending in 4242
                          </p>
                          <p className="text-[11px] text-slate-500">Expires 12/2028</p>
                        </div>
                      </div>
                      <button className="text-xs text-purple-600 font-semibold hover:text-purple-700">
                        Edit
                      </button>
                    </div>

                    <div className="p-3.5 border border-slate-200 dark:border-slate-800 rounded-lg bg-white dark:bg-slate-900 shadow-sm flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center">
                          <Server className="w-4 h-4 text-slate-600" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                            Database Storage
                          </p>
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