import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { supabase } from "../lib/supabase";
import { printInvoice, shareInvoicePdf } from "../utils/invoicePdf";

const money = (value) => `₹${Number(value || 0).toFixed(2)}`;

export default function BillingScreen() {
  const [phone, setPhone] = useState("");
  const [client, setClient] = useState(null);
  const [clientStatus, setClientStatus] = useState("idle");
  const [showBilling, setShowBilling] = useState(false);

  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [searchProduct, setSearchProduct] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState("");
  const [billItems, setBillItems] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    const cleanedPhone = phone.trim();

    if (!cleanedPhone) {
      clearClientOnly();
      setClientStatus("idle");
      return;
    }

    if (client?.phone !== cleanedPhone) {
      clearClientOnly();
    }

    if (cleanedPhone.length < 4) {
      setClientStatus("idle");
      return;
    }

    setClientStatus("searching");

    const timer = setTimeout(async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("phone", cleanedPhone)
        .maybeSingle();

      if (phone.trim() !== cleanedPhone) {
        return;
      }

      if (error) {
        console.log(error);
        setClient(null);
        setShowBilling(false);
        setClientStatus("error");
        return;
      }

      if (!data) {
        setClient(null);
        setShowBilling(false);
        setClientStatus("not-found");
        return;
      }

      setClient(data);
      setClientStatus("found");
    }, 350);

    return () => clearTimeout(timer);
  }, [phone]);

  const fetchProducts = async () => {
    setProductsLoading(true);

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      console.log(error);
      Alert.alert("Products Error", "Unable to load products.");
      setProductsLoading(false);
      return;
    }

    setProducts(data || []);
    setProductsLoading(false);
  };

  const filteredProducts = useMemo(() => {
    const keyword = searchProduct.trim().toLowerCase();

    if (!keyword || selectedProduct) {
      return [];
    }

    return products
      .filter((item) =>
        item.product_name?.toLowerCase().includes(keyword)
      )
      .slice(0, 8);
  }, [products, searchProduct, selectedProduct]);

  const grandTotal = useMemo(
    () => billItems.reduce((sum, item) => sum + item.total, 0),
    [billItems]
  );

  const clearClientOnly = () => {
    setClient(null);
    setShowBilling(false);
  };

  const resetProductEntry = () => {
    setSearchProduct("");
    setSelectedProduct(null);
    setQuantity("");
  };

  const handleCancelBill = () => {
    setPhone("");
    setClient(null);
    setClientStatus("idle");
    setShowBilling(false);
    setBillItems([]);
    resetProductEntry();
  };

  const handleSelectProduct = (item) => {
    setSelectedProduct(item);
    setSearchProduct(item.product_name || "");
    setQuantity("1");
  };

  const handleAddProduct = () => {
    const numericQuantity = Number(quantity);

    if (!selectedProduct) {
      Alert.alert("Select Product", "Please select a product first.");
      return;
    }

    if (!numericQuantity || numericQuantity <= 0) {
      Alert.alert("Invalid Quantity", "Please enter a valid quantity.");
      return;
    }

    const price = Number(selectedProduct.selling_price || 0);
    const total = price * numericQuantity;

    const existingIndex = billItems.findIndex(
      (item) => item.product_id === selectedProduct.id
    );

    if (existingIndex >= 0) {
      const nextItems = [...billItems];
      const existingItem = nextItems[existingIndex];
      const nextQuantity = existingItem.quantity + numericQuantity;

      nextItems[existingIndex] = {
        ...existingItem,
        quantity: nextQuantity,
        total: existingItem.price * nextQuantity,
      };

      setBillItems(nextItems);
    } else {
      setBillItems((currentItems) => [
        ...currentItems,
        {
          id: `${selectedProduct.id}-${Date.now()}`,
          product_id: selectedProduct.id,
          product_name: selectedProduct.product_name,
          quantity: numericQuantity,
          price,
          total,
        },
      ]);
    }

    resetProductEntry();
  };

  const handleRemoveItem = (id) => {
    setBillItems((currentItems) =>
      currentItems.filter((item) => item.id !== id)
    );
  };

  const currentInvoice = () => ({
    id: null,
    created_at: new Date().toISOString(),
    client_name: client?.name || "",
    client_phone: client?.phone || phone,
    client_email: client?.email || "",
    client_address: client?.address || "",
    total_amount: grandTotal,
  });

  const validateInvoicePreview = () => {
    if (!client) {
      Alert.alert("Client Required", "Please select a client before printing.");
      return false;
    }

    if (billItems.length === 0) {
      Alert.alert("No Products Added", "Please add at least one product.");
      return false;
    }

    return true;
  };

  const handlePrintInvoice = async () => {
    if (!validateInvoicePreview()) {
      return;
    }

    try {
      await printInvoice({
        bill: currentInvoice(),
        items: billItems,
      });
    } catch (error) {
      console.log(error);
      Alert.alert("Print Failed", "Unable to print this invoice.");
    }
  };

  const handleDownloadInvoice = async () => {
    if (!validateInvoicePreview()) {
      return;
    }

    try {
      const result = await shareInvoicePdf({
        bill: currentInvoice(),
        items: billItems,
      });

      if (!result.shared) {
        Alert.alert("Invoice Ready", `PDF generated successfully.\n${result.uri}`);
      }
    } catch (error) {
      console.log(error);
      Alert.alert("Download Failed", "Unable to generate this invoice PDF.");
    }
  };

  const handleSaveBill = async () => {
    if (!client) {
      Alert.alert("Client Required", "Please select a client before saving.");
      return;
    }

    if (billItems.length === 0) {
      Alert.alert("No Products Added", "Please add at least one product.");
      return;
    }

    setSaving(true);

    const billPayload = {
      client_id: client.id,
      client_name: client.name || "",
      client_phone: client.phone || phone,
      client_email: client.email || "",
      client_address: client.address || "",
      total_amount: grandTotal,
    };

    const { data: bill, error: billError } = await supabase
      .from("bills")
      .insert([billPayload])
      .select()
      .single();

    if (billError) {
      console.log(billError);
      setSaving(false);
      Alert.alert("Save Failed", "Unable to save bill details.");
      return;
    }

    const billItemPayload = billItems.map((item) => ({
      bill_id: bill.id,
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      price: item.price,
      total: item.total,
    }));

    const { error: itemsError } = await supabase
      .from("bill_items")
      .insert(billItemPayload);

    setSaving(false);

    if (itemsError) {
      console.log(itemsError);
      Alert.alert(
        "Bill Saved",
        "Bill was created, but product items could not be saved."
      );
      return;
    }

    Alert.alert("Bill Saved", "Invoice saved successfully.");
    handleCancelBill();
    fetchProducts();
  };

  const clientHelperText = {
    idle: "Enter a phone number to find an existing client.",
    searching: "Searching client...",
    found: "Client matched. Ready to start billing.",
    "not-found": "No client found for this phone number.",
    error: "Unable to search client right now.",
  }[clientStatus];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Electrician Invoice</Text>
          <Text style={styles.heading}>Billing</Text>
        </View>

        {showBilling ? (
          <TouchableOpacity
            style={styles.cancelTopButton}
            onPress={handleCancelBill}
          >
            <Text style={styles.cancelTopText}>Cancel Bill</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Client Lookup</Text>
          {clientStatus === "searching" ? (
            <ActivityIndicator color="#1d4ed8" />
          ) : null}
        </View>

        <Text style={styles.label}>Phone Number</Text>
        <TextInput
          placeholder="Search by client phone"
          style={styles.input}
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />

        <Text
          style={[
            styles.helperText,
            clientStatus === "found" && styles.successText,
            clientStatus === "not-found" && styles.warningText,
            clientStatus === "error" && styles.errorText,
          ]}
        >
          {clientHelperText}
        </Text>
      </View>

      {client ? (
        <View style={styles.clientCard}>
          <View style={styles.clientHeader}>
            <View>
              <Text style={styles.clientLabel}>Selected Client</Text>
              <Text style={styles.clientName}>{client.name}</Text>
            </View>

            <View style={styles.statusPill}>
              <Text style={styles.statusPillText}>Matched</Text>
            </View>
          </View>

          <View style={styles.clientGrid}>
            <View style={styles.detailBox}>
              <Text style={styles.detailLabel}>Phone</Text>
              <Text style={styles.detailValue}>{client.phone}</Text>
            </View>

            <View style={styles.detailBox}>
              <Text style={styles.detailLabel}>Email</Text>
              <Text style={styles.detailValue}>{client.email || "N/A"}</Text>
            </View>
          </View>

          <View style={styles.addressBox}>
            <Text style={styles.detailLabel}>Address</Text>
            <Text style={styles.detailValue}>{client.address || "N/A"}</Text>
          </View>

          {!showBilling ? (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => setShowBilling(true)}
            >
              <Text style={styles.primaryButtonText}>Start Billing</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {showBilling ? (
        <View style={styles.invoiceCard}>
          <View style={styles.invoiceHeader}>
            <View>
              <Text style={styles.sectionTitle}>Invoice Items</Text>
              <Text style={styles.helperText}>
                Search, select quantity, and add products to this bill.
              </Text>
            </View>
          </View>

          <View style={styles.productPanel}>
            <Text style={styles.label}>Product</Text>
            <TextInput
              placeholder="Search product name"
              style={styles.input}
              value={searchProduct}
              onChangeText={(text) => {
                setSearchProduct(text);
                setSelectedProduct(null);
              }}
            />

            {productsLoading ? (
              <ActivityIndicator style={styles.loader} color="#1d4ed8" />
            ) : null}

            {filteredProducts.length > 0 ? (
              <View style={styles.productList}>
                {filteredProducts.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.productRow}
                    onPress={() => handleSelectProduct(item)}
                  >
                    <View style={styles.productInfo}>
                      <Text style={styles.productName}>
                        {item.product_name}
                      </Text>
                      <Text style={styles.productMeta}>
                        {item.category || "General"} • {item.unit || "Unit"}
                      </Text>
                    </View>
                    <Text style={styles.productPrice}>
                      {money(item.selling_price)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}

            {selectedProduct ? (
              <View style={styles.selectedProductCard}>
                <View>
                  <Text style={styles.selectedTitle}>
                    {selectedProduct.product_name}
                  </Text>
                  <Text style={styles.productMeta}>
                    Rate: {money(selectedProduct.selling_price)}
                  </Text>
                </View>
                <TouchableOpacity onPress={resetProductEntry}>
                  <Text style={styles.clearText}>Change</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <View style={styles.addRow}>
              <View style={styles.quantityWrap}>
                <Text style={styles.label}>Qty</Text>
                <TextInput
                  placeholder="0"
                  style={styles.input}
                  keyboardType="numeric"
                  value={quantity}
                  onChangeText={setQuantity}
                />
              </View>

              <TouchableOpacity
                style={styles.addButton}
                onPress={handleAddProduct}
              >
                <Text style={styles.addButtonText}>Add Product</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.itemsHeader}>
            <Text style={styles.billTitle}>Bill Items</Text>
            <Text style={styles.itemCount}>{billItems.length} items</Text>
          </View>

          {billItems.length === 0 ? (
            <View style={styles.emptyItems}>
              <Text style={styles.emptyTitle}>No products added yet</Text>
              <Text style={styles.helperText}>
                Added products will appear here with quantity and total amount.
              </Text>
            </View>
          ) : (
            billItems.map((item) => (
              <View key={item.id} style={styles.billItemCard}>
                <View style={styles.itemMain}>
                  <Text style={styles.itemName}>{item.product_name}</Text>
                  <Text style={styles.itemMeta}>
                    Qty {item.quantity} × {money(item.price)}
                  </Text>
                </View>

                <View style={styles.itemAmountWrap}>
                  <Text style={styles.itemTotal}>{money(item.total)}</Text>
                  <TouchableOpacity onPress={() => handleRemoveItem(item.id)}>
                    <Text style={styles.removeText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}

          <View style={styles.totalContainer}>
            <View>
              <Text style={styles.totalLabel}>Grand Total</Text>
              <Text style={styles.totalSubText}>
                Includes all products in this bill
              </Text>
            </View>
            <Text style={styles.totalAmount}>{money(grandTotal)}</Text>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handlePrintInvoice}
            >
              <Text style={styles.secondaryButtonText}>Print</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.disabledButton]}
              onPress={handleSaveBill}
              disabled={saving}
            >
              <Text style={styles.saveButtonText}>
                {saving ? "Saving..." : "Save Bill"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleDownloadInvoice}
            >
              <Text style={styles.secondaryButtonText}>Download</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.cancelBillButton}
            onPress={handleCancelBill}
          >
            <Text style={styles.cancelBillText}>Cancel Bill</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f7fb",
  },
  content: {
    padding: 18,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  eyebrow: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  heading: {
    color: "#0f172a",
    fontSize: 32,
    fontWeight: "800",
  },
  card: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 14,
    padding: 16,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sectionTitle: {
    color: "#0f172a",
    fontSize: 20,
    fontWeight: "800",
  },
  label: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#ffffff",
    borderColor: "#cbd5e1",
    borderRadius: 14,
    borderWidth: 1,
    color: "#0f172a",
    fontSize: 16,
    padding: 14,
  },
  helperText: {
    color: "#64748b",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
  successText: {
    color: "#15803d",
    fontWeight: "700",
  },
  warningText: {
    color: "#b45309",
    fontWeight: "700",
  },
  errorText: {
    color: "#b91c1c",
    fontWeight: "700",
  },
  clientCard: {
    backgroundColor: "#ffffff",
    borderColor: "#bfdbfe",
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 14,
    padding: 18,
  },
  clientHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  clientLabel: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  clientName: {
    color: "#0f172a",
    fontSize: 24,
    fontWeight: "800",
    marginTop: 3,
  },
  statusPill: {
    backgroundColor: "#dcfce7",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusPillText: {
    color: "#166534",
    fontSize: 12,
    fontWeight: "800",
  },
  clientGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  detailBox: {
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    flex: 1,
    padding: 12,
  },
  addressBox: {
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    marginBottom: 16,
    padding: 12,
  },
  detailLabel: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 4,
  },
  detailValue: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "700",
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#1d4ed8",
    borderRadius: 14,
    padding: 15,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
  },
  cancelTopButton: {
    backgroundColor: "#fee2e2",
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  cancelTopText: {
    color: "#b91c1c",
    fontWeight: "800",
  },
  invoiceCard: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
  },
  invoiceHeader: {
    marginBottom: 14,
  },
  productPanel: {
    backgroundColor: "#f8fafc",
    borderRadius: 18,
    marginBottom: 18,
    padding: 14,
  },
  loader: {
    marginTop: 12,
  },
  productList: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 10,
    overflow: "hidden",
  },
  productRow: {
    alignItems: "center",
    borderBottomColor: "#f1f5f9",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 13,
  },
  productInfo: {
    flex: 1,
    paddingRight: 12,
  },
  productName: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "800",
  },
  productMeta: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 3,
  },
  productPrice: {
    color: "#1d4ed8",
    fontSize: 15,
    fontWeight: "900",
  },
  selectedProductCard: {
    alignItems: "center",
    backgroundColor: "#eff6ff",
    borderColor: "#bfdbfe",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    padding: 13,
  },
  selectedTitle: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "900",
  },
  clearText: {
    color: "#1d4ed8",
    fontWeight: "800",
  },
  addRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 12,
    marginTop: 14,
  },
  quantityWrap: {
    flex: 1,
  },
  addButton: {
    alignItems: "center",
    backgroundColor: "#0f172a",
    borderRadius: 14,
    justifyContent: "center",
    minHeight: 50,
    paddingHorizontal: 16,
  },
  addButtonText: {
    color: "#ffffff",
    fontWeight: "900",
  },
  itemsHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  billTitle: {
    color: "#0f172a",
    fontSize: 20,
    fontWeight: "900",
  },
  itemCount: {
    color: "#64748b",
    fontWeight: "800",
  },
  emptyItems: {
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    padding: 20,
  },
  emptyTitle: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "900",
  },
  billItemCard: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    padding: 14,
  },
  itemMain: {
    flex: 1,
    paddingRight: 10,
  },
  itemName: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "900",
  },
  itemMeta: {
    color: "#64748b",
    fontSize: 13,
    marginTop: 4,
  },
  itemAmountWrap: {
    alignItems: "flex-end",
  },
  itemTotal: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "900",
  },
  removeText: {
    color: "#dc2626",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 6,
  },
  totalContainer: {
    alignItems: "center",
    backgroundColor: "#0f172a",
    borderRadius: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    padding: 18,
  },
  totalLabel: {
    color: "#e2e8f0",
    fontSize: 14,
    fontWeight: "800",
  },
  totalSubText: {
    color: "#94a3b8",
    fontSize: 12,
    marginTop: 4,
  },
  totalAmount: {
    color: "#ffffff",
    fontSize: 26,
    fontWeight: "900",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "#e0f2fe",
    borderRadius: 14,
    flex: 1,
    padding: 14,
  },
  secondaryButtonText: {
    color: "#075985",
    fontWeight: "900",
  },
  saveButton: {
    alignItems: "center",
    backgroundColor: "#16a34a",
    borderRadius: 14,
    flex: 1.2,
    padding: 14,
  },
  saveButtonText: {
    color: "#ffffff",
    fontWeight: "900",
  },
  disabledButton: {
    opacity: 0.65,
  },
  cancelBillButton: {
    alignItems: "center",
    backgroundColor: "#fee2e2",
    borderRadius: 14,
    marginTop: 12,
    padding: 14,
  },
  cancelBillText: {
    color: "#b91c1c",
    fontWeight: "900",
  },
});
