"use client";

import { useState } from "react";
import { X, Building2, User, Mail, Phone } from "lucide-react";
import { motion } from "framer-motion";

interface CreatedCompany {
  id: string;
  name: string;
  companyName: string;
  phone: string;
}

interface Props {
  onClose: () => void;
  onCreated: (company: CreatedCompany) => void;
}

export default function AddCompanyModal({ onClose, onCreated }: Props) {
  const [companyName, setCompanyName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fieldCls =
    "w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-crimson/50 transition-colors";

  const handleSubmit = async () => {
    if (!companyName.trim() || !email.trim() || !phone.trim()) {
      setError("Company name, email, and phone are required");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/customers/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() || companyName.trim(), email: email.trim(), phone: phone.trim(), companyName: companyName.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create company");
        return;
      }

      onCreated({
        id: data.customer.id,
        name: data.customer.name,
        companyName: data.customer.companyName,
        phone: data.customer.phone,
      });
      onClose();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.15 }}
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-crimson/10 rounded-lg">
              <Building2 className="w-4 h-4 text-crimson" />
            </div>
            <h2 className="text-lg font-bold text-navy">New Company</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg cursor-pointer transition-colors"
          >
            <X className="w-5 h-5 text-navy/40" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Company Name */}
          <div>
            <label className="text-xs text-navy/60 font-medium block mb-1">
              Company Name <span className="text-crimson">*</span>
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy/30" />
              <input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className={`${fieldCls} pl-9`}
                placeholder="e.g. Acme Ltd"
                autoFocus
              />
            </div>
          </div>

          {/* Contact Name */}
          <div>
            <label className="text-xs text-navy/60 font-medium block mb-1">Contact Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy/30" />
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`${fieldCls} pl-9`}
                placeholder="Contact person"
              />
            </div>
          </div>

          {/* Email + Phone grid on sm+ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-navy/60 font-medium block mb-1">
                Email <span className="text-crimson">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy/30" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`${fieldCls} pl-9`}
                  placeholder="email@company.com"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-navy/60 font-medium block mb-1">
                Phone <span className="text-crimson">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-navy/30" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={`${fieldCls} pl-9`}
                  placeholder="+44 7700 000000"
                />
              </div>
            </div>
          </div>

          {error && (
            <p className="text-crimson text-xs bg-crimson/5 border border-crimson/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-100">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-navy/60 text-sm font-medium hover:bg-gray-50 cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-crimson to-crimson text-white font-bold text-sm cursor-pointer disabled:opacity-60 hover:opacity-90 transition-opacity"
            >
              {saving ? "Creating..." : "Create Company"}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
