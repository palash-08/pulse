import React, { useEffect, useState } from "react";
import {
  Bell,
  Plus,
  Send,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ExternalLink,
  ShieldAlert,
  Radio,
} from "lucide-react";
import {
  listAlertContacts,
  createAlertContact,
  updateAlertContact,
  deleteAlertContact,
  testAlertContact,
  listAlertLogs,
} from "../../api/alerts.js";
import { AlertContact, AlertLog } from "../../api/types.js";
import { Spinner } from "../ui/Spinner.js";

export function DiscordAlertsSection() {
  const [contacts, setContacts] = useState<AlertContact[]>([]);
  const [logs, setLogs] = useState<AlertLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [testingId, setTestingId] = useState<number | null>(null);
  const [testResult, setTestResult] = useState<{ id: number; success: boolean; message: string } | null>(null);

  // New Contact Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [cooldownMinutes, setCooldownMinutes] = useState(15);
  const [notifyOnDown, setNotifyOnDown] = useState(true);
  const [notifyOnRecovery, setNotifyOnRecovery] = useState(true);
  const [notifyOnSslExpiry, setNotifyOnSslExpiry] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [contactsRes, logsRes] = await Promise.all([
        listAlertContacts(),
        listAlertLogs({ pageSize: 10 }),
      ]);
      setContacts(contactsRes.contacts);
      setLogs(logsRes.items);
    } catch (err: any) {
      console.error("Failed to load alerts data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      await createAlertContact({
        name,
        webhookUrl,
        cooldownMinutes,
        notifyOnDown,
        notifyOnRecovery,
        notifyOnSslExpiry,
      });
      setName("");
      setWebhookUrl("");
      setShowAddForm(false);
      await loadData();
    } catch (err: any) {
      setFormError(err.message || "Failed to save Discord webhook destination.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (contact: AlertContact) => {
    try {
      await updateAlertContact(contact.id, { isActive: !contact.isActive });
      setContacts((prev) =>
        prev.map((c) => (c.id === contact.id ? { ...c, isActive: !c.isActive } : c))
      );
    } catch (err: any) {
      alert(`Failed to update status: ${err.message}`);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to remove this Discord webhook destination?")) return;
    try {
      await deleteAlertContact(id);
      setContacts((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) {
      alert(`Failed to delete: ${err.message}`);
    }
  };

  const handleTestNotification = async (id: number) => {
    try {
      setTestingId(id);
      setTestResult(null);
      const res = await testAlertContact(id);
      if (res.success) {
        setTestResult({
          id,
          success: true,
          message: "Test alert dispatched! Check your Discord channel.",
        });
      } else {
        setTestResult({
          id,
          success: false,
          message: res.error || `Discord returned HTTP ${res.statusCode}`,
        });
      }
      const logsRes = await listAlertLogs({ pageSize: 10 });
      setLogs(logsRes.items);
    } catch (err: any) {
      setTestResult({
        id,
        success: false,
        message: err.message || "Failed to send test alert",
      });
    } finally {
      setTestingId(null);
      setTimeout(() => setTestResult(null), 6000);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-neutral-200 shadow-xs p-6 sm:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-serif font-bold text-neutral-900 text-lg">
            <Radio className="w-5 h-5 text-indigo-600" />
            Alerts & Discord Notification Dispatcher
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Dispatch color-coded alerts to your Discord channels when monitors go down, recover, or when certificates expire.
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-neutral-900 text-white rounded-full text-xs font-medium hover:bg-black transition-all shadow-xs self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          {showAddForm ? "Cancel" : "Add Discord Webhook"}
        </button>
      </div>

      {/* Add Webhook Form */}
      {showAddForm && (
        <form
          onSubmit={handleCreateContact}
          className="p-5 bg-neutral-50 border border-neutral-200 rounded-2xl space-y-4 text-xs"
        >
          <div className="font-semibold text-neutral-900 text-sm">New Discord Destination</div>

          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-neutral-700 mb-1">Destination Name</label>
              <input
                type="text"
                required
                placeholder="e.g. #devops-alerts"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-10 px-3.5 rounded-full border border-neutral-300 text-neutral-900 focus:outline-none focus:border-neutral-900"
              />
            </div>

            <div>
              <label className="block font-medium text-neutral-700 mb-1">Cooldown Window</label>
              <select
                value={cooldownMinutes}
                onChange={(e) => setCooldownMinutes(Number(e.target.value))}
                className="w-full h-10 px-3.5 rounded-full border border-neutral-300 text-neutral-900 focus:outline-none focus:border-neutral-900 bg-white"
              >
                <option value={5}>5 minutes between duplicate alerts</option>
                <option value={15}>15 minutes (recommended)</option>
                <option value={30}>30 minutes</option>
                <option value={60}>60 minutes</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-medium text-neutral-700 mb-1">Discord Webhook URL</label>
            <input
              type="url"
              required
              placeholder="https://discord.com/api/webhooks/123456789/AbCdEfG..."
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="w-full h-10 px-3.5 rounded-full border border-neutral-300 text-neutral-900 font-mono text-[11px] focus:outline-none focus:border-neutral-900"
            />
            <p className="text-[11px] text-neutral-400 mt-1">
              In Discord: Server Settings &rarr; Integrations &rarr; Webhooks &rarr; New Webhook &rarr; Copy Webhook URL.
            </p>
          </div>

          <div className="pt-2">
            <span className="block font-medium text-neutral-700 mb-2">Notification Triggers</span>
            <div className="flex flex-wrap gap-4 text-neutral-700">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyOnDown}
                  onChange={(e) => setNotifyOnDown(e.target.checked)}
                  className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                />
                🔴 Outage (Down)
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyOnRecovery}
                  onChange={(e) => setNotifyOnRecovery(e.target.checked)}
                  className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                />
                🟢 Recovery (Back Up)
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyOnSslExpiry}
                  onChange={(e) => setNotifyOnSslExpiry(e.target.checked)}
                  className="rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                />
                ⚠️ SSL Expiry Warning (&le; 30d)
              </label>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-neutral-900 hover:bg-black text-white rounded-full font-medium shadow-xs disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Discord Webhook"}
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 border border-neutral-300 text-neutral-600 rounded-full hover:bg-neutral-100"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Webhook Destinations List */}
      {loading ? (
        <div className="py-8 flex justify-center">
          <Spinner size="md" />
        </div>
      ) : contacts.length === 0 ? (
        <div className="p-6 text-center border border-dashed border-neutral-200 rounded-2xl space-y-2">
          <Bell className="w-8 h-8 text-neutral-300 mx-auto" />
          <p className="text-xs font-medium text-neutral-600">No Discord alert webhooks configured yet.</p>
          <p className="text-[11px] text-neutral-400 max-w-sm mx-auto">
            Add a Discord webhook destination to receive immediate real-time downtime and recovery notifications.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className={`p-4 border rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                contact.isActive ? "bg-white border-neutral-200" : "bg-neutral-50 border-neutral-200 opacity-60"
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-neutral-900">{contact.name}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                      contact.isActive ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-neutral-200 text-neutral-600"
                    }`}
                  >
                    {contact.isActive ? "Active" : "Disabled"}
                  </span>
                  <span className="text-[11px] text-neutral-400 font-mono flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {contact.cooldownMinutes}m cooldown
                  </span>
                </div>
                <div className="text-[11px] font-mono text-neutral-400 select-all">
                  {contact.maskedWebhookUrl}
                </div>
                <div className="flex items-center gap-2 text-[10px] text-neutral-500 pt-0.5">
                  {contact.notifyOnDown && <span className="bg-neutral-100 px-2 py-0.5 rounded-md">🔴 Down</span>}
                  {contact.notifyOnRecovery && <span className="bg-neutral-100 px-2 py-0.5 rounded-md">🟢 Recovery</span>}
                  {contact.notifyOnSslExpiry && <span className="bg-neutral-100 px-2 py-0.5 rounded-md">⚠️ SSL Expiry</span>}
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  onClick={() => handleTestNotification(contact.id)}
                  disabled={testingId === contact.id}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-full text-xs font-medium transition-colors disabled:opacity-50"
                  title="Send a sample notification to verify webhook connection"
                >
                  <Send className={`w-3 h-3 ${testingId === contact.id ? "animate-spin" : ""}`} />
                  {testingId === contact.id ? "Testing..." : "Test Alert"}
                </button>

                <button
                  onClick={() => handleToggleActive(contact)}
                  className="px-3 py-1.5 border border-neutral-200 text-neutral-600 rounded-full text-xs hover:bg-neutral-50 transition-colors"
                >
                  {contact.isActive ? "Disable" : "Enable"}
                </button>

                <button
                  onClick={() => handleDelete(contact.id)}
                  className="p-1.5 text-neutral-400 hover:text-rose-600 rounded-full hover:bg-rose-50 transition-colors"
                  title="Delete webhook"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {testResult && testResult.id === contact.id && (
                <div
                  className={`w-full mt-2 p-2.5 rounded-xl text-xs flex items-center gap-1.5 ${
                    testResult.success
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-rose-50 text-rose-800 border border-rose-200"
                  }`}
                >
                  {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-rose-600" />}
                  {testResult.message}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Alert Dispatch Logs Table */}
      <div className="pt-4 border-t border-neutral-200 space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-semibold text-xs text-neutral-900 uppercase tracking-wider">
            Recent Alert Dispatch History
          </div>
          <span className="text-[11px] text-neutral-400">Recorded delivery audit trail</span>
        </div>

        {logs.length === 0 ? (
          <p className="text-xs text-neutral-400 italic">No alert delivery records yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-neutral-200 text-neutral-400 text-[11px]">
                  <th className="pb-2 font-medium">Timestamp</th>
                  <th className="pb-2 font-medium">Event</th>
                  <th className="pb-2 font-medium">Monitor</th>
                  <th className="pb-2 font-medium">Destination</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-neutral-50/50">
                    <td className="py-2.5 text-neutral-500 whitespace-nowrap">
                      {new Date(log.sentAt).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-2.5">
                      {log.eventType === "down" && (
                        <span className="inline-flex items-center gap-1 text-rose-700 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-600" /> Outage
                        </span>
                      )}
                      {log.eventType === "recovery" && (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" /> Recovery
                        </span>
                      )}
                      {log.eventType === "ssl_expiry" && (
                        <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-600" /> SSL Warning
                        </span>
                      )}
                      {log.eventType === "test" && (
                        <span className="inline-flex items-center gap-1 text-indigo-700 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" /> Test Alert
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 font-medium text-neutral-900">{log.monitorName}</td>
                    <td className="py-2.5 text-neutral-600">{log.contactName || "Discord Webhook"}</td>
                    <td className="py-2.5">
                      {log.deliveryStatus === "success" ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-mono text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Delivered ({log.statusCode || 204})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-600 font-mono text-[11px]" title={log.errorMessage || undefined}>
                          <XCircle className="w-3.5 h-3.5" /> Failed
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
