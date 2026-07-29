export interface InvoiceData {
  invoiceNumber: string;
  customerName: string;
  wineName: string;
  wineryName: string;
  storeName: string;
  storeAddress: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  discountPct: number;
  discountAmount: number;
  total: number;
  deposit: number;
  balance: number;
  pickupDate?: string | null;
  orderType: 'pickup' | 'delivery';
  deliveryFee: number;
  deliveryAddress?: string | null;
}

const m = (n: number) => '$' + Number(n).toFixed(2);

export function renderInvoiceHtml(d: InvoiceData): string {
  const discountRow = d.discountPct > 0
    ? `<tr><td>Descuento primera reserva (${d.discountPct}%)</td><td style="text-align:right;color:#2E8B57">-${m(d.discountAmount)}</td></tr>`
    : '';
  const pickup = d.pickupDate ? `<p style="margin:4px 0;color:#8B7F79">Retiro estimado: ${d.pickupDate}</p>` : '';
  const isDelivery = d.orderType === 'delivery';
  const entrega = isDelivery
    ? `<div style="color:#8B7F79;font-size:13px;margin-top:6px"><b>Delivery</b> a ${d.deliveryAddress ?? ''}</div>`
    : `<div style="color:#8B7F79;font-size:13px;margin-top:6px">Retirar en <b>${d.storeName}</b> — ${d.storeAddress}</div>`;
  const envioRow = isDelivery
    ? `<tr><td>Envío</td><td style="text-align:right">${m(d.deliveryFee)}</td></tr>`
    : '';
  const saldoLabel = isDelivery ? 'Saldo a pagar al recibir (80%)' : 'Saldo a pagar al retirar (80%)';
  return `<!DOCTYPE html><html lang="es"><body style="margin:0;background:#F3ECDD;font-family:Arial,Helvetica,sans-serif;color:#2A2024">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-top:4px solid #C2912B">
    <div style="background:#641E2E;color:#fff;padding:22px 28px">
      <div style="font-size:22px;font-weight:bold;font-family:Georgia,serif">CavaLocal</div>
      <div style="color:#E9C877;font-size:12px;letter-spacing:2px">FACTURA DE RESERVA</div>
    </div>
    <div style="padding:24px 28px">
      <p style="margin:0 0 2px">Hola <b>${d.customerName}</b>, tu reserva quedó confirmada.</p>
      <p style="margin:0 0 16px;color:#8B7F79">Factura <b>${d.invoiceNumber}</b></p>
      <div style="border:1px solid #E7DCC6;border-radius:10px;padding:14px 16px;margin-bottom:16px">
        <div style="font-weight:bold">${d.wineName} <span style="color:#8B7F79">× ${d.quantity}</span></div>
        <div style="color:#8B7F79;font-size:13px">${d.wineryName}</div>
        ${entrega}
        ${pickup}
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr><td style="padding:4px 0">Subtotal (${d.quantity} × ${m(d.unitPrice)})</td><td style="text-align:right">${m(d.subtotal)}</td></tr>
        ${discountRow}
        ${envioRow}
        <tr><td style="padding:6px 0;border-top:1px solid #E7DCC6;font-weight:bold">Total</td><td style="text-align:right;border-top:1px solid #E7DCC6;font-weight:bold">${m(d.total)}</td></tr>
        <tr><td style="padding:6px 0;color:#641E2E;font-weight:bold">Seña pagada ahora (20%)</td><td style="text-align:right;color:#641E2E;font-weight:bold">${m(d.deposit)}</td></tr>
        <tr><td style="padding:2px 0;color:#8B7F79">${saldoLabel}</td><td style="text-align:right;color:#8B7F79">${m(d.balance)}</td></tr>
      </table>
      <p style="margin:18px 0 0;font-size:12px;color:#B4A89F">Pago de prueba — no se realizó un cobro real. Bebé con moderación · Solo para mayores de 18 años.</p>
    </div>
  </div></body></html>`;
}
