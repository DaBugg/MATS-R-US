export function purchaseStatus(order, lines) {
  if (order.status !== "ordered") return order.status;
  const items = lines.filter(l => l.purchase_order_id === order.id);
  if (items.length && items.every(l => Number(l.received) >= Number(l.quantity))) return "received";
  if (items.some(l => Number(l.received) > 0)) return "partially received";
  return "ordered";
}
export function outstandingByMaterial(orders, lines) {
  const active = new Set(orders.filter(o => o.status === "ordered").map(o => o.id));
  const totals = new Map();
  for (const l of lines) if (active.has(l.purchase_order_id)) {
    const key = `${l.material_id}:${l.unit}`;
    totals.set(key,(totals.get(key)||0)+Math.max(0,Number(l.quantity)-Number(l.received)));
  }
  return totals;
}
