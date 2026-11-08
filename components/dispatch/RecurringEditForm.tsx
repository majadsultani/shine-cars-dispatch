"use client";

const ALL_DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

export interface EditFields {
  name: string; phone: string; pickup: string; dropoff: string;
  time: string; vehicle: string; fare: string;
  days: string[]; frequency: string; startDate: string; endDate: string; isActive: boolean;
}

const inputCls = "w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-navy outline-none focus:border-crimson/50";
const labelCls = "block text-navy/50 text-xs font-medium mb-1";

export default function RecurringEditForm({
  fields,
  onChange,
}: {
  fields: EditFields;
  onChange: (patch: Partial<EditFields>) => void;
}) {
  const toggleDay = (day: string) => {
    const next = fields.days.includes(day)
      ? fields.days.filter((d) => d !== day)
      : [...fields.days, day];
    onChange({ days: next });
  };

  return (
    <div className="space-y-3">
      {/* Name + Phone */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Passenger Name</label>
          <input className={inputCls} value={fields.name} onChange={(e) => onChange({ name: e.target.value })} />
        </div>
        <div>
          <label className={labelCls}>Phone</label>
          <input className={inputCls} value={fields.phone} onChange={(e) => onChange({ phone: e.target.value })} />
        </div>
      </div>

      {/* Pickup + Dropoff */}
      <div>
        <label className={labelCls}>Pickup Address</label>
        <input className={inputCls} value={fields.pickup} onChange={(e) => onChange({ pickup: e.target.value })} />
      </div>
      <div>
        <label className={labelCls}>Drop-off Address</label>
        <input className={inputCls} value={fields.dropoff} onChange={(e) => onChange({ dropoff: e.target.value })} />
      </div>

      {/* Time + Vehicle + Fare */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className={labelCls}>Time</label>
          <input type="time" className={inputCls} value={fields.time} onChange={(e) => onChange({ time: e.target.value })} />
        </div>
        <div>
          <label className={labelCls}>Vehicle</label>
          <select className={inputCls} value={fields.vehicle} onChange={(e) => onChange({ vehicle: e.target.value })}>
            <option value="car">Car</option>
            <option value="mpv">MPV</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Fare (£)</label>
          <input type="number" min="0" step="0.01" className={inputCls} value={fields.fare}
            onChange={(e) => onChange({ fare: e.target.value })} />
        </div>
      </div>

      {/* Frequency + Active */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Frequency</label>
          <select className={inputCls} value={fields.frequency} onChange={(e) => onChange({ frequency: e.target.value })}>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
        <div className="flex flex-col justify-end">
          <label className={labelCls}>Status</label>
          <button type="button"
            onClick={() => onChange({ isActive: !fields.isActive })}
            className={`w-full py-2.5 rounded-xl text-sm font-semibold border transition-colors cursor-pointer ${fields.isActive ? "bg-green-50 text-green-600 border-green-200 hover:bg-green-100" : "bg-red-50 text-red-500 border-red-200 hover:bg-red-100"}`}>
            {fields.isActive ? "Active" : "Inactive"}
          </button>
        </div>
      </div>

      {/* Days */}
      <div>
        <label className={labelCls}>Days</label>
        <div className="flex flex-wrap gap-1.5">
          {ALL_DAYS.map((d) => (
            <button key={d} type="button" onClick={() => toggleDay(d)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${fields.days.includes(d) ? "bg-crimson/10 text-crimson border border-crimson/30" : "bg-gray-100 text-navy/40 border border-transparent hover:bg-gray-200"}`}>
              {d.slice(0, 3).toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Start + End dates */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Start Date</label>
          <input type="date" className={inputCls} value={fields.startDate}
            onChange={(e) => onChange({ startDate: e.target.value })} />
        </div>
        <div>
          <label className={labelCls}>End Date</label>
          <input type="date" className={inputCls} value={fields.endDate}
            onChange={(e) => onChange({ endDate: e.target.value })} />
        </div>
      </div>
    </div>
  );
}
