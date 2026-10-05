const styles: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-blue-100 text-blue-700",
  assigned: "bg-indigo-100 text-indigo-700",
  accepted: "bg-cyan-100 text-cyan-700",
  arrived: "bg-teal-100 text-teal-700",
  "in-progress": "bg-purple-100 text-purple-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  "open-bid": "bg-orange-100 text-orange-700",
};

export default function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${
      styles[status] || "bg-gray-100 text-gray-700"
    }`}>
      {status}
    </span>
  );
}
