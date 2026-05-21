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
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 30px;
          }
          .company-info h1 {
            font-size: 22px;
            margin: 0 0 10px 0;
            color: #0f766e;
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
            color: #334155;
          }
          .invoice-meta strong {
            color: #0f766e;
          }
          .qr-box {
            width: 90px;
            height: 90px;
            background-color: #ffffff;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 5px;
          }
          .qr-box img {
            width: 100%;
            height: 100%;
            object-fit: contain;
          }
          .title-container {
            text-align: center;
            margin-bottom: 30px;
            padding: 10px;
            border-bottom: 2px solid #0f766e;
            display: inline-block;
            width: 100%;
          }
          .title-en {
            font-size: 26px;
            font-weight: 800;
            margin: 0;
            color: #0f766e;
            text-transform: uppercase;
            letter-spacing: 2px;
          }
          .title-ar {
            font-size: 22px;
            font-weight: 700;
            margin: 5px 0 0 0;
            color: #0f766e;
            font-family: 'Tajawal', sans-serif;
          }
          .customer-section {
            background-color: #ffffff;
            border-left: 4px solid #0f766e;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 35px;
          }
          .customer-section h3 {
            margin: 0 0 15px 0;
            font-size: 16px;
            color: #0f766e;
            text-transform: uppercase;
            letter-spacing: 1px;
            border-bottom: 1px solid #e2e8f0;
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
            margin-bottom: 35px;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            overflow: hidden;
          }
          th {
            background-color: #0f766e;
            color: #ffffff;
            font-weight: 600;
            text-align: left;
            padding: 14px;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          th.center, td.center { text-align: center; }
          th.right, td.right { text-align: right; }
          td {
            padding: 14px;
            border-bottom: 1px solid #e2e8f0;
            color: #475569;
            background-color: #ffffff;
          }
          tr:last-child td {
            border-bottom: none;
          }
          tr:nth-child(even) td {
            background-color: #f8fafc;
          }
          .totals-section {
            width: 50%;
            margin-left: auto;
            background-color: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 20px;
          }
          .totals-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            color: #475569;
            font-size: 14px;
          }
          .totals-row:not(:last-child) {
            border-bottom: 1px dashed #cbd5e1;
          }
          .grand-total {
            font-size: 18px;
            font-weight: 800;
            color: #0f766e;
            border-bottom: none;
            padding-top: 15px;
            margin-top: 5px;
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
            color: #0f766e;
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
          <div class="qr-invoice-info">
            <div class="invoice-meta">
              <p><strong>${documentNoLabel}:</strong> ${escapeHtml(documentNumber(bill, config))}</p>
              <p><strong>Date:</strong> ${formatDate(bill?.created_at)}</p>
              ${status ? `<p><strong>Status:</strong> ${escapeHtml(status)}</p>` : ""}
            </div>
            <div class="qr-box">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent('Doc No: ' + documentNumber(bill, config))}" alt="QR Code" />
            </div>
          </div>
        </div>

        <div class="title-container">
          <p class="title-en">${titleEn}</p>
          <p class="title-ar">${titleAr}</p>
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
            <span>Subtotal (Excl. VAT)</span>
            <span>${currency(displaySubtotal)}</span>
          </div>
          <div class="totals-row">
            <span>VAT (15%)</span>
            <span>${currency(displayVat)}</span>
          </div>
          <div class="totals-row grand-total">
            <span>Grand Total</span>
            <span>${currency(displayGrandTotal)}</span>
          </div>
        </div>

        <div class="footer">
          <div class="footer-thankyou">Thank You For Your Business</div>
          <p>This is a computer generated document and requires no signature.</p>
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
