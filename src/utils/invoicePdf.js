import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

const currency = (value) => `₹${Number(value || 0).toFixed(2)}`;

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const formatDate = (value) => {
  const date = value ? new Date(value) : new Date();

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const invoiceNumber = (bill) => (bill?.id ? `INV-${bill.id}` : "DRAFT-INVOICE");

export const buildInvoiceHtml = ({ bill, items }) => {
  const safeItems = items || [];
  const subtotal = safeItems.reduce(
    (sum, item) => sum + Number(item.total || 0),
    0
  );
  const total = Number(bill?.total_amount ?? subtotal);

  const itemRows = safeItems
    .map(
      (item, index) => `
        <tr>
          <td class="center">${index + 1}</td>
          <td>
            <strong>${escapeHtml(item.product_name || "Product")}</strong>
          </td>
          <td class="center">${escapeHtml(item.quantity || 0)}</td>
          <td class="right">${currency(item.price)}</td>
          <td class="right">${currency(item.total)}</td>
        </tr>
      `
    )
    .join("");

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          * { box-sizing: border-box; }
          body {
            color: #0f172a;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            margin: 0;
            padding: 32px;
          }
          .invoice {
            border: 1px solid #e2e8f0;
            border-radius: 18px;
            overflow: hidden;
          }
          .header {
            background: #0f172a;
            color: #ffffff;
            display: flex;
            justify-content: space-between;
            padding: 28px;
          }
          .brand {
            font-size: 26px;
            font-weight: 800;
            letter-spacing: 0;
          }
          .subtitle {
            color: #cbd5e1;
            font-size: 13px;
            margin-top: 8px;
          }
          .invoice-id {
            font-size: 22px;
            font-weight: 800;
            text-align: right;
          }
          .date {
            color: #cbd5e1;
            font-size: 13px;
            margin-top: 8px;
            text-align: right;
          }
          .content { padding: 28px; }
          .meta-grid {
            display: grid;
            gap: 16px;
            grid-template-columns: 1fr 1fr;
            margin-bottom: 24px;
          }
          .panel {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 14px;
            padding: 16px;
          }
          .label {
            color: #64748b;
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
          }
          .value {
            font-size: 15px;
            font-weight: 700;
            line-height: 1.5;
            margin-top: 8px;
          }
          table {
            border-collapse: collapse;
            margin-top: 10px;
            width: 100%;
          }
          th {
            background: #eef2ff;
            color: #334155;
            font-size: 12px;
            padding: 12px;
            text-align: left;
            text-transform: uppercase;
          }
          td {
            border-bottom: 1px solid #e2e8f0;
            font-size: 13px;
            padding: 13px 12px;
          }
          .center { text-align: center; }
          .right { text-align: right; }
          .totals {
            display: flex;
            justify-content: flex-end;
            margin-top: 22px;
          }
          .total-card {
            background: #0f172a;
            border-radius: 14px;
            color: #ffffff;
            min-width: 260px;
            padding: 18px;
          }
          .total-row {
            display: flex;
            font-size: 14px;
            justify-content: space-between;
            margin-bottom: 10px;
          }
          .grand {
            border-top: 1px solid #334155;
            font-size: 22px;
            font-weight: 800;
            margin-bottom: 0;
            padding-top: 12px;
          }
          .footer {
            color: #64748b;
            font-size: 12px;
            line-height: 1.6;
            margin-top: 30px;
          }
        </style>
      </head>
      <body>
        <section class="invoice">
          <div class="header">
            <div>
              <div class="brand">Invoice</div>
              <div class="subtitle">Electrical products and services billing</div>
            </div>
            <div>
              <div class="invoice-id">${escapeHtml(invoiceNumber(bill))}</div>
              <div class="date">${formatDate(bill?.created_at)}</div>
            </div>
          </div>

          <div class="content">
            <div class="meta-grid">
              <div class="panel">
                <div class="label">Bill To</div>
                <div class="value">
                  ${escapeHtml(bill?.client_name || "Customer")}<br />
                  ${escapeHtml(bill?.client_phone || "No phone")}<br />
                  ${escapeHtml(bill?.client_email || "")}
                </div>
              </div>
              <div class="panel">
                <div class="label">Address</div>
                <div class="value">${escapeHtml(
                  bill?.client_address || "Not provided"
                )}</div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th class="center">#</th>
                  <th>Product</th>
                  <th class="center">Qty</th>
                  <th class="right">Rate</th>
                  <th class="right">Amount</th>
                </tr>
              </thead>
              <tbody>${itemRows}</tbody>
            </table>

            <div class="totals">
              <div class="total-card">
                <div class="total-row">
                  <span>Subtotal</span>
                  <strong>${currency(subtotal)}</strong>
                </div>
                <div class="total-row grand">
                  <span>Total</span>
                  <span>${currency(total)}</span>
                </div>
              </div>
            </div>

            <div class="footer">
              Thank you for your business. This invoice was generated from the
              billing system and includes the saved product line items above.
            </div>
          </div>
        </section>
      </body>
    </html>
  `;
};

export const printInvoice = async ({ bill, items }) => {
  await Print.printAsync({
    html: buildInvoiceHtml({ bill, items }),
  });
};

export const createInvoicePdf = async ({ bill, items }) => {
  const { uri } = await Print.printToFileAsync({
    html: buildInvoiceHtml({ bill, items }),
    base64: false,
  });

  return uri;
};

export const shareInvoicePdf = async ({ bill, items }) => {
  const uri = await createInvoicePdf({ bill, items });
  const canShare = await Sharing.isAvailableAsync();

  if (!canShare) {
    return { uri, shared: false };
  }

  await Sharing.shareAsync(uri, {
    dialogTitle: `Download ${invoiceNumber(bill)}`,
    mimeType: "application/pdf",
    UTI: "com.adobe.pdf",
  });

  return { uri, shared: true };
};
