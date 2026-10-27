import React, { useEffect, useState } from "react";
import {
  Bell,
  Plus,
  Send,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
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
import { FlairButton } from "../ui/FlairButton.js";
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
    <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-xs p-6 sm:p-8 space-y-6 transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 font-serif font-bold text-neutral-900 dark:text-white text-lg">
            <Radio className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Alerts & Discord Notification Dispatcher
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Dispatch color-coded alerts to your Discord channels when monitors go down, recover, or when certificates expire.
          </p>
        </div>

        <FlairButton
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-neutral-900 dark:border-white text-xs font-medium transition-all shadow-xs self-start sm:self-auto active:scale-[0.99]"
        >
          <Plus className="w-3.5 h-3.5" />
          {showAddForm ? "Cancel" : "Add Discord Webhook"}
        </FlairButton>
      </div>

      {/* Add Webhook Form */}
      {showAddForm && (
        <form
          onSubmit={handleCreateContact}
          className="p-5 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/80 rounded-2xl space-y-4 text-xs transition-colors"
        >
          <div className="font-semibold text-neutral-900 dark:text-white text-sm">New Discord Destination</div>

          {formError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-400 rounded-xl text-xs">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">Destination Name</label>
              <input
                type="text"
                required
                placeholder="e.g. #devops-alerts"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-10 px-3.5 rounded-full border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100"
              />
            </div>

            <div>
              <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">Cooldown Window</label>
              <select
                value={cooldownMinutes}
                onChange={(e) => setCooldownMinutes(Number(e.target.value))}
                className="w-full h-10 px-3.5 rounded-full border border-neutral-300 dark:border-neutral-600 text-neutral-900 dark:text-white focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100 bg-white dark:bg-neutral-800"
              >
                <option value={5}>5 minutes between duplicate alerts</option>
                <option value={15}>15 minutes (recommended)</option>
                <option value={30}>30 minutes</option>
                <option value={60}>60 minutes</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">Discord Webhook URL</label>
            <input
              type="url"
              required
              placeholder="https://discord.com/api/webhooks/123456789/AbCdEfG..."
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className="w-full h-10 px-3.5 rounded-full border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white font-mono text-[11px] focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100"
            />
            <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-1">
              In Discord: Server Settings &rarr; Integrations &rarr; Webhooks &rarr; New Webhook &rarr; Copy Webhook URL.
            </p>
          </div>

          <div className="pt-2">
            <span className="block font-medium text-neutral-700 dark:text-neutral-300 mb-2">Notification Triggers</span>
            <div className="flex flex-wrap gap-4 text-neutral-700 dark:text-neutral-300">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyOnDown}
                  onChange={(e) => setNotifyOnDown(e.target.checked)}
                  className="rounded border-neutral-300 dark:border-neutral-600 text-neutral-900 focus:ring-neutral-900"
                />
                🔴 Outage (Down)
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyOnRecovery}
                  onChange={(e) => setNotifyOnRecovery(e.target.checked)}
                  className="rounded border-neutral-300 dark:border-neutral-600 text-neutral-900 focus:ring-neutral-900"
                />
                🟢 Recovery (Back Up)
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyOnSslExpiry}
                  onChange={(e) => setNotifyOnSslExpiry(e.target.checked)}
                  className="rounded border-neutral-300 dark:border-neutral-600 text-neutral-900 focus:ring-neutral-900"
                />
                ⚠️ SSL Expiry Warning (&le; 30d)
              </label>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-neutral-900 dark:bg-white hover:bg-black dark:hover:bg-neutral-200 text-white dark:text-neutral-900 rounded-full font-medium shadow-xs disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Discord Webhook"}
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800"
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
        <div className="p-6 text-center border border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl space-y-2">
          <Bell className="w-8 h-8 text-neutral-300 dark:text-neutral-600 mx-auto" />
          <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400">No Discord alert webhooks configured yet.</p>
          <p className="text-[11px] text-neutral-400 dark:text-neutral-500 max-w-sm mx-auto">
            Add a Discord webhook destination to receive immediate real-time downtime and recovery notifications.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className={`p-4 border rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                contact.isActive
                  ? "bg-white dark:bg-neutral-800/50 border-neutral-200 dark:border-neutral-700/80"
                  : "bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 opacity-60"
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-neutral-900 dark:text-white">{contact.name}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                      contact.isActive
                        ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80"
                        : "bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300"
                    }`}
                  >
                    {contact.isActive ? "Active" : "Disabled"}
                  </span>
                  <span className="text-[11px] text-neutral-400 dark:text-neutral-500 font-mono flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {contact.cooldownMinutes}m cooldown
                  </span>
                </div>
                <div className="text-[11px] font-mono text-neutral-400 dark:text-neutral-500 select-all">
                  {contact.maskedWebhookUrl}
                </div>
                <div className="flex items-center gap-2 text-[10px] text-neutral-500 dark:text-neutral-400 pt-0.5">
                  {contact.notifyOnDown && <span className="bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-md">🔴 Down</span>}
                  {contact.notifyOnRecovery && <span className="bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-md">🟢 Recovery</span>}
                  {contact.notifyOnSslExpiry && <span className="bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-md">⚠️ SSL Expiry</span>}
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  onClick={() => handleTestNotification(contact.id)}
                  disabled={testingId === contact.id}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 rounded-full text-xs font-medium transition-colors disabled:opacity-50"
                  title="Send a sample notification to verify webhook connection"
                >
                  <Send className={`w-3 h-3 ${testingId === contact.id ? "animate-spin" : ""}`} />
                  {testingId === contact.id ? "Testing..." : "Test Alert"}
                </button>

                <button
                  onClick={() => handleToggleActive(contact)}
                  className="px-3 py-1.5 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 rounded-full text-xs hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                >
                  {contact.isActive ? "Disable" : "Enable"}
                </button>

                <button
                  onClick={() => handleDelete(contact.id)}
                  className="p-1.5 text-neutral-400 dark:text-neutral-500 hover:text-rose-600 dark:hover:text-rose-400 rounded-full hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                  title="Delete webhook"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {testResult && testResult.id === contact.id && (
                <div
                  className={`w-full mt-2 p-2.5 rounded-xl text-xs flex items-center gap-1.5 ${
                    testResult.success
                      ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                      : "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
                  }`}
                >
                  {testResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />}
                  {testResult.message}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Alert Dispatch Logs Table */}
      <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="font-semibold text-xs text-neutral-900 dark:text-white uppercase tracking-wider">
            Recent Alert Dispatch History
          </div>
          <span className="text-[11px] text-neutral-400 dark:text-neutral-500">Recorded delivery audit trail</span>
        </div>

        {logs.length === 0 ? (
          <p className="text-xs text-neutral-400 dark:text-neutral-500 italic">No alert delivery records yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-400 dark:text-neutral-500 text-[11px]">
                  <th className="pb-2 font-medium">Timestamp</th>
                  <th className="pb-2 font-medium">Event</th>
                  <th className="pb-2 font-medium">Monitor</th>
                  <th className="pb-2 font-medium">Destination</th>
                  <th className="pb-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40 transition-colors">
                    <td className="py-2.5 text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
                      {new Date(log.sentAt).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-2.5">
                      {log.eventType === "down" && (
                        <span className="inline-flex items-center gap-1 text-rose-700 dark:text-rose-400 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-600" /> Outage
                        </span>
                      )}
                      {log.eventType === "recovery" && (
                        <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" /> Recovery
                        </span>
                      )}
                      {log.eventType === "ssl_expiry" && (
                        <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-600" /> SSL Warning
                        </span>
                      )}
                      {log.eventType === "test" && (
                        <span className="inline-flex items-center gap-1 text-indigo-700 dark:text-indigo-400 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" /> Test Alert
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 font-medium text-neutral-900 dark:text-white">{log.monitorName}</td>
                    <td className="py-2.5 text-neutral-600 dark:text-neutral-300">{log.contactName || "Discord Webhook"}</td>
                    <td className="py-2.5">
                      {log.deliveryStatus === "success" ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-mono text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Delivered ({log.statusCode || 204})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-mono text-[11px]" title={log.errorMessage || undefined}>
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
