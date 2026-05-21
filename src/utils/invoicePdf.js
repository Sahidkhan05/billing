import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

const currency = (value) => `SAR ${Number(value || 0).toFixed(2)}`;

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

const documentNumber = (bill, options = {}) => {
  const prefix = options.numberPrefix || "INV";
  const draftNumber = options.draftNumber || `DRAFT-${prefix}`;

  return bill?.id ? `${prefix}-${bill.id}` : draftNumber;
};

const documentConfig = (options = {}) => ({
  title: options.title || "Invoice",
  subtitle: options.subtitle || "Electrical products and services billing",
  recipientLabel: options.recipientLabel || "Bill To",
  numberPrefix: options.numberPrefix || "INV",
  draftNumber: options.draftNumber || "DRAFT-INVOICE",
  footer:
    options.footer ||
    "Thank you for your business. This invoice was generated from the billing system and includes the saved product line items above.",
  notesLabel: options.notesLabel || "Notes",
  totalLabel: options.totalLabel || "Total",
  status: options.status,
  notes: options.notes,
});

export const buildInvoiceHtml = ({ bill, items, documentOptions }) => {
  const config = documentConfig(documentOptions);
  const safeItems = items || [];
  const subtotal = safeItems.reduce(
    (sum, item) => sum + Number(item.total || 0),
    0
  );
  
  const displaySubtotal = subtotal;
  const displayVat = subtotal * 0.15;
  const displayGrandTotal = bill?.total_amount ? Number(bill.total_amount) : (subtotal + displayVat);

  const status = config.status ?? bill?.status;

  const isQuotation = config.title?.toLowerCase().includes("quotation");
  const titleEn = isQuotation ? "Quotation" : "Tax Invoice";
  const titleAr = isQuotation ? "عرض سعر" : "فاتورة ضريبية";
  const documentNoLabel = isQuotation ? "Quotation No" : "Invoice No";

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
    <html lang="en" dir="ltr">
      <head>
        <meta charset="utf-8" />
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700&display=swap');
          * { box-sizing: border-box; }
          body {
            background-color: #ffffff;
            color: #1e293b;
            font-family: 'Helvetica Neue', Helvetica, Arial, 'Tajawal', sans-serif;
            margin: 0;
            padding: 40px;
            font-size: 14px;
            line-height: 1.6;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background-color: #ffffff;
            border: 1px solid rgba(11,61,145,0.08);
            border-left: 6px solid #0b3d91;
            border-radius: 12px;
            padding: 20px 24px;
            margin-bottom: 18px;
          }
          .company-info h1 {
            font-size: 22px;
            margin: 0 0 6px 0;
            color: #0b3d91;
          }
          .company-info p {
            margin: 4px 0;
            color: #475569;
            font-size: 13px;
          }
          .qr-invoice-info {
            text-align: right;
            display: flex;
            align-items: flex-start;
            gap: 20px;
          }
          .invoice-meta {
            text-align: right;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
          .invoice-meta p {
            margin: 4px 0;
            font-size: 14px;
            color: #153243;
          }
          .invoice-meta strong {
            color: #16a34a;
          }
          .qr-box {
            width: 96px;
            height: 96px;
            background-color: #ffffff;
            border: 1px solid rgba(11,61,145,0.08);
            border-radius: 10px;
            padding: 6px;
          }
          .qr-box img {
            width: 100%;
            height: 100%;
            object-fit: contain;
          }
          .title-block {
            text-align: center;
            width: 100%;
            padding: 6px 12px;
          }
          .title-en {
            font-size: 22px;
            font-weight: 800;
            margin: 0;
            color: #0b3d91;
            text-transform: uppercase;
            letter-spacing: 2px;
          }
          .title-ar {
            font-size: 18px;
            font-weight: 700;
            margin: 4px 0 0 0;
            color: #16a34a;
            font-family: 'Tajawal', sans-serif;
          }
          .customer-section {
            background-color: #ffffff;
            border-left: 4px solid #0b3d91;
            box-shadow: 0 1px 3px rgba(0,0,0,0.06);
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 35px;
          }
          .customer-section h3 {
            margin: 0 0 15px 0;
            font-size: 16px;
            color: #0b3d91;
            text-transform: uppercase;
            letter-spacing: 1px;
            border-bottom: 1px solid #eef2ff;
            padding-bottom: 8px;
          }
          .customer-section p {
            margin: 6px 0;
            color: #334155;
            font-size: 14px;
          }
          table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            margin-bottom: 28px;
            border: 1px solid rgba(11,61,145,0.08);
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 6px 18px rgba(11,61,145,0.03);
          }
          th {
            background: linear-gradient(90deg,#0b3d91 0%,#0b3d91 100%);
            color: #ffffff;
            font-weight: 700;
            text-align: left;
            padding: 14px 16px;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.6px;
            border-right: 1px solid rgba(255,255,255,0.06);
          }
          th.center, td.center { text-align: center; }
          th.right, td.right { text-align: right; }
          td {
            padding: 14px 16px;
            border-bottom: 1px solid rgba(11,61,145,0.04);
            color: #12324a;
            background-color: #ffffff;
          }
          tr:last-child td {
            border-bottom: none;
          }
          tr:nth-child(even) td {
            background-color: #fbfdff;
          }
          .totals-section {
            width: 48%;
            margin-left: auto;
            background-color: #ffffff;
            border: 1px solid rgba(11,61,145,0.06);
            border-radius: 10px;
            padding: 14px 18px;
          }
          .totals-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 4px;
            color: #12324a;
            font-size: 14px;
          }
          .totals-row:not(:last-child) {
            border-bottom: 1px dashed rgba(11,61,145,0.06);
          }
          .grand-total {
            font-size: 18px;
            font-weight: 900;
            color: #ffffff;
            background: linear-gradient(90deg,#16a34a 0%, #0b3d91 100%);
            padding: 12px 14px;
            border-radius: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 10px;
          }
          .footer {
            text-align: center;
            margin-top: 60px;
            padding-top: 25px;
            border-top: 2px solid #e2e8f0;
            color: #64748b;
            font-size: 14px;
          }
          .footer-thankyou {
            font-weight: bold;
            color: #0b3d91;
            font-size: 16px;
            margin-bottom: 5px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-info">
            <h1>Abdul Rahman Al Otaibi For General Contracting</h1>
            <p><strong>Email:</strong> <a href="mailto:alotaibi147@gmail.com" style="color: #475569; text-decoration: none;">alotaibi147@gmail.com</a></p>
            <p><strong>Address:</strong> Zahra Street, Abdullah Fouad, Ash Shifa,<br/>Dammam 32236, Saudi Arabia</p>
            <p><strong>CR No:</strong> 205020030</p>
          </div>
          <div class="title-block">
            <p class="title-en">${titleEn}</p>
            <p class="title-ar">${titleAr}</p>
          </div>
          <div class="qr-invoice-info">
            <div class="invoice-meta">
              <p><strong>${documentNoLabel}:</strong> ${escapeHtml(documentNumber(bill, config))}</p>
              <p><strong>Date:</strong> ${formatDate(bill?.created_at)}</p>
              ${status ? `<p><strong>Status:</strong> ${escapeHtml(status)}</p>` : ""}
            </div>
            <div class="qr-box">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=Sample%20QR%20Code" alt="Sample QR Code" />
            </div>
          </div>
        </div>


        <div class="customer-section">
          <h3>Bill To</h3>
          <p><strong>Name:</strong> ${escapeHtml(bill?.client_name || "Customer")}</p>
          <p><strong>Phone:</strong> ${escapeHtml(bill?.client_phone || "Not provided")}</p>
          <p><strong>Address:</strong> ${escapeHtml(bill?.client_address || "Not provided")}</p>
        </div>

        <table>
          <thead>
            <tr>
              <th class="center">Item No</th>
              <th>Product Name</th>
              <th class="center">Qty</th>
              <th class="right">Unit Price</th>
              <th class="right">Total</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
        </table>

        <div class="totals-section">
          <div class="totals-row">
            <span>Subtotal</span>
            <span>${currency(displaySubtotal)}</span>
          </div>
          <div class="totals-row grand-total">
            <span>Grand Total</span>
            <span>${currency(displaySubtotal)}</span>
          </div>
        </div>

        <div class="footer">
          <div class="footer-thankyou">Thank You For Your Business</div>
        </div>
      </body>
    </html>
  `;
};

export const printInvoice = async ({ bill, items, documentOptions }) => {
  await Print.printAsync({
    html: buildInvoiceHtml({ bill, items, documentOptions }),
  });
};

export const createInvoicePdf = async ({ bill, items, documentOptions }) => {
  const { uri } = await Print.printToFileAsync({
    html: buildInvoiceHtml({ bill, items, documentOptions }),
    base64: false,
  });

  return uri;
};

export const shareInvoicePdf = async ({ bill, items, documentOptions }) => {
  const config = documentConfig(documentOptions);
  const uri = await createInvoicePdf({ bill, items, documentOptions });
  const canShare = await Sharing.isAvailableAsync();

  if (!canShare) {
    return { uri, shared: false };
  }

  await Sharing.shareAsync(uri, {
    dialogTitle: `Download ${documentNumber(bill, config)}`,
    mimeType: "application/pdf",
    UTI: "com.adobe.pdf",
  });

  return { uri, shared: true };
};
