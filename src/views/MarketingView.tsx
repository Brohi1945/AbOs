import React, { useState } from "react";
import { Megaphone, Plus, Send, Mail, MessageSquare, Smartphone, Eye, MousePointerClick } from "lucide-react";
import { displayFont } from "../theme";
import { Card, Badge, StatCard, Button, Modal, Field, inputCls, EmptyState } from "../components/ui";

const CHANNEL_META: Record<string, { icon: any; cls: string }> = {
  SMS: { icon: Smartphone, cls: "bg-amber-900/30 text-amber-400" },
  Email: { icon: Mail, cls: "bg-indigo-900/30 text-indigo-400" },
  WhatsApp: { icon: MessageSquare, cls: "bg-green-900/30 text-green-400" },
};

interface CampaignFormProps {
  onSave: (form: any) => void;
  onCancel: () => void;
}

function CampaignForm({ onSave, onCancel }: CampaignFormProps) {
  const [form, setForm] = useState({ name: "", channel: "WhatsApp", status: "Scheduled", sent: "0", opened: "0", clicked: "0" });
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div>
      <Field label="Campaign name">
        <input value={form.name} onChange={set("name")} className={inputCls} placeholder="e.g. Weekend Grocery Sale" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Channel">
          <select value={form.channel} onChange={set("channel")} className={inputCls}>
            {Object.keys(CHANNEL_META).map((c) => <option key={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Status">
          <select value={form.status} onChange={set("status")} className={inputCls}>
            <option>Scheduled</option>
            <option>Active</option>
            <option>Completed</option>
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Sent">
          <input value={form.sent} onChange={set("sent")} inputMode="numeric" className={inputCls} />
        </Field>
        <Field label="Opened">
          <input value={form.opened} onChange={set("opened")} inputMode="numeric" className={inputCls} />
        </Field>
        <Field label="Clicked">
          <input value={form.clicked} onChange={set("clicked")} inputMode="numeric" className={inputCls} />
        </Field>
      </div>
      <div className="flex gap-2 mt-2">
        <Button variant="secondary" className="flex-1" onClick={onCancel}>Cancel</Button>
        <Button className="flex-1" onClick={() => onSave(form)} disabled={!form.name}>Save campaign</Button>
      </div>
    </div>
  );
}

interface MarketingViewProps {
  campaigns: any[];
  onAdd: (form: any) => void;
}

export default function MarketingView({ campaigns, onAdd }: MarketingViewProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold text-fg" style={{ fontFamily: displayFont }}>Marketing campaigns</h2>
        <Button icon={Plus} onClick={() => setModalOpen(true)}>New campaign</Button>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <StatCard icon={Send} label="Total sent" value={campaigns.reduce((s, c) => s + c.sent, 0).toLocaleString()} tone="indigo" />
        <StatCard icon={Eye} label="Total opened" value={campaigns.reduce((s, c) => s + c.opened, 0).toLocaleString()} tone="green" />
        <StatCard icon={MousePointerClick} label="Total clicks" value={campaigns.reduce((s, c) => s + c.clicked, 0).toLocaleString()} tone="amber" />
      </div>

      {campaigns.length === 0 ? (
        <EmptyState icon={Megaphone} title="No campaigns yet" note="Create your first campaign to start reaching customers." />
      ) : (
      <div className="grid sm:grid-cols-2 gap-4">
        {campaigns.map((c) => {
          const meta = CHANNEL_META[c.channel];
          const openRate = c.sent ? Math.round((c.opened / c.sent) * 100) : 0;
          const clickRate = c.sent ? Math.round((c.clicked / c.sent) * 100) : 0;
          return (
            <Card key={c.id}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${meta.cls}`}>
                    <meta.icon size={16} />
                  </div>
                  <div>
                    <div className="font-semibold text-fg text-sm">{c.name}</div>
                    <div className="text-[11px] text-muted">{c.channel} campaign</div>
                  </div>
                </div>
                <Badge tone={c.status === "Active" ? "green" : c.status === "Scheduled" ? "amber" : "slate"}>{c.status}</Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="rounded-lg bg-app p-2.5 text-center">
                  <div className="text-sm font-bold text-fg">{c.sent.toLocaleString()}</div>
                  <div className="text-[10px] text-muted">Sent</div>
                </div>
                <div className="rounded-lg bg-app p-2.5 text-center">
                  <div className="text-sm font-bold text-fg">{openRate}%</div>
                  <div className="text-[10px] text-muted">Opened</div>
                </div>
                <div className="rounded-lg bg-app p-2.5 text-center">
                  <div className="text-sm font-bold text-fg">{clickRate}%</div>
                  <div className="text-[10px] text-muted">Clicked</div>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-app overflow-hidden">
                <div className="h-full bg-brand rounded-full" style={{ width: `${openRate}%` }} />
              </div>
            </Card>
          );
        })}
      </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New campaign">
        <CampaignForm
          onCancel={() => setModalOpen(false)}
          onSave={(form) => { onAdd(form); setModalOpen(false); }}
        />
      </Modal>
    </div>
  );
}
