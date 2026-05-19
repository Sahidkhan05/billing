import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
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
const quotationDocumentOptions = {
  title: "Quotation",
  subtitle: "Professional estimate for electrical products and services",
  recipientLabel: "Prepared For",
  numberPrefix: "QT",
  draftNumber: "DRAFT-QUOTE",
  totalLabel: "Quote Total",
  footer:
    "This quotation is an estimate based on the listed products and quantities. Final billing may vary if scope, products, or quantities change.",
};

const formatDate = (value) => {
  if (!value) {
    return "Date unavailable";
  }

  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function QuotationsScreen() {
  const [quotations, setQuotations] = useState([]);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [editQuotation, setEditQuotation] = useState(null);

  const [clientSearch, setClientSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState(null);
  const [productSearch, setProductSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantity, setQuantity] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("Draft");
  const [quoteItems, setQuoteItems] = useState([]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    await Promise.all([fetchQuotations(), fetchClients(), fetchProducts()]);
    setLoading(false);
  };

  const fetchQuotations = async () => {
    const { data, error } = await supabase
      .from("quotations")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      console.log(error);
      setQuotations([]);
      return;
    }

    setQuotations(data || []);
  };

  const fetchClients = async () => {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      console.log(error);
      setClients([]);
      return;
    }

    setClients(data || []);
  };

  const fetchProducts = async () => {
    setProductsLoading(true);

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      console.log(error);
      Alert.alert("Products Error", "Unable to load products.");
      setProducts([]);
      setProductsLoading(false);
      return;
    }

    setProducts(data || []);
    setProductsLoading(false);
  };

  const filteredQuotations = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return quotations;
    }

    return quotations.filter((item) => {
      const id = String(item.id || "").toLowerCase();
      const name = String(item.client_name || "").toLowerCase();
      const phone = String(item.client_phone || "").toLowerCase();
      const itemStatus = String(item.status || "").toLowerCase();

      return (
        id.includes(keyword) ||
        name.includes(keyword) ||
        phone.includes(keyword) ||
        itemStatus.includes(keyword)
      );
    });
  }, [quotations, search]);

  const filteredClients = useMemo(() => {
    const keyword = clientSearch.trim().toLowerCase();

    if (!keyword || selectedClient) {
      return [];
    }

    return clients
      .filter(
        (item) =>
          item.name?.toLowerCase().includes(keyword) ||
          item.phone?.includes(keyword)
      )
      .slice(0, 6);
  }, [clientSearch, clients, selectedClient]);

  const filteredProducts = useMemo(() => {
    const keyword = productSearch.trim().toLowerCase();

    if (selectedProduct) {
      return [];
    }

    if (!keyword) {
      return products;
    }

    return products.filter((item) => {
      const name = String(item.product_name || "").toLowerCase();
      const category = String(item.category || "").toLowerCase();
      const unit = String(item.unit || "").toLowerCase();
      const description = String(item.description || "").toLowerCase();

      return (
        name.includes(keyword) ||
        category.includes(keyword) ||
        unit.includes(keyword) ||
        description.includes(keyword)
      );
    });
  }, [productSearch, products, selectedProduct]);

  const totalAmount = useMemo(
    () => quoteItems.reduce((sum, item) => sum + item.total, 0),
    [quoteItems]
  );

  const resetForm = () => {
    setEditQuotation(null);
    setClientSearch("");
    setSelectedClient(null);
    setProductSearch("");
    setSelectedProduct(null);
    setQuantity("");
    setNotes("");
    setStatus("Draft");
    setQuoteItems([]);
    setSaving(false);
    setModalVisible(false);
  };

  const openCreateForm = () => {
    resetForm();
    fetchProducts();
    setModalVisible(true);
  };

  const handleSelectClient = (client) => {
    setSelectedClient(client);
    setClientSearch(`${client.name} • ${client.phone}`);
  };

  const handleSelectProduct = (product) => {
    setSelectedProduct(product);
    setProductSearch(product.product_name || "");
    setQuantity("1");
  };

  const resetProductEntry = () => {
    setSelectedProduct(null);
    setProductSearch("");
    setQuantity("");
  };

  const handleAddProduct = () => {
    const numericQuantity = Number(quantity);

    if (!selectedProduct) {
      Alert.alert("Select Product", "Please select a product.");
      return;
    }

    if (!numericQuantity || numericQuantity <= 0) {
      Alert.alert("Invalid Quantity", "Please enter a valid quantity.");
      return;
    }

    const price = Number(selectedProduct.selling_price || 0);
    const existingIndex = quoteItems.findIndex(
      (item) => item.product_id === selectedProduct.id
    );

    if (existingIndex >= 0) {
      const nextItems = [...quoteItems];
      const existingItem = nextItems[existingIndex];
      const nextQuantity = existingItem.quantity + numericQuantity;

      nextItems[existingIndex] = {
        ...existingItem,
        quantity: nextQuantity,
        total: existingItem.price * nextQuantity,
      };

      setQuoteItems(nextItems);
    } else {
      setQuoteItems((currentItems) => [
        ...currentItems,
        {
          id: `${selectedProduct.id}-${Date.now()}`,
          product_id: selectedProduct.id,
          product_name: selectedProduct.product_name,
          quantity: numericQuantity,
          price,
          total: price * numericQuantity,
        },
      ]);
    }

    resetProductEntry();
  };

  const handleRemoveItem = (id) => {
    setQuoteItems((currentItems) =>
      currentItems.filter((item) => item.id !== id)
    );
  };

  const currentQuotation = () => ({
    id: editQuotation?.id || null,
    created_at: editQuotation?.created_at || new Date().toISOString(),
    client_name: selectedClient?.name || "",
    client_phone: selectedClient?.phone || "",
    client_email: selectedClient?.email || "",
    client_address: selectedClient?.address || "",
    notes,
    status,
    total_amount: totalAmount,
  });

  const validateQuotationPreview = () => {
    if (!selectedClient) {
      Alert.alert("Client Required", "Please select a client first.");
      return false;
    }

    if (quoteItems.length === 0) {
      Alert.alert("Products Required", "Please add at least one product.");
      return false;
    }

    return true;
  };

  const loadQuotationItems = async (quotation) => {
    const { data, error } = await supabase
      .from("quotation_items")
      .select("*")
      .eq("quotation_id", quotation.id)
      .order("id", { ascending: true });

    if (error) {
      console.log(error);
      throw error;
    }

    return data || [];
  };

  const printQuotation = async ({ quotation, items }) => {
    await printInvoice({
      bill: quotation,
      items,
      documentOptions: {
        ...quotationDocumentOptions,
        status: quotation.status,
        notes: quotation.notes,
      },
    });
  };

  const downloadQuotation = async ({ quotation, items }) => {
    const result = await shareInvoicePdf({
      bill: quotation,
      items,
      documentOptions: {
        ...quotationDocumentOptions,
        status: quotation.status,
        notes: quotation.notes,
      },
    });

    if (!result.shared) {
      Alert.alert("Quotation Ready", `PDF generated successfully.\n${result.uri}`);
    }
  };

  const handlePrintPreview = async () => {
    if (!validateQuotationPreview()) {
      return;
    }

    try {
      await printQuotation({
        quotation: currentQuotation(),
        items: quoteItems,
      });
    } catch (error) {
      console.log(error);
      Alert.alert("Print Failed", "Unable to print this quotation.");
    }
  };

  const handleDownloadPreview = async () => {
    if (!validateQuotationPreview()) {
      return;
    }

    try {
      await downloadQuotation({
        quotation: currentQuotation(),
        items: quoteItems,
      });
    } catch (error) {
      console.log(error);
      Alert.alert("Download Failed", "Unable to generate this quotation PDF.");
    }
  };

  const handlePrintQuotation = async (quotation) => {
    try {
      const items = await loadQuotationItems(quotation);
      await printQuotation({ quotation, items });
    } catch (error) {
      console.log(error);
      Alert.alert("Print Failed", "Unable to print this quotation.");
    }
  };

  const handleDownloadQuotation = async (quotation) => {
    try {
      const items = await loadQuotationItems(quotation);
      await downloadQuotation({ quotation, items });
    } catch (error) {
      console.log(error);
      Alert.alert("Download Failed", "Unable to generate this quotation PDF.");
    }
  };

  const handleSaveQuotation = async () => {
    if (!selectedClient) {
      Alert.alert("Client Required", "Please select a client.");
      return;
    }

    if (quoteItems.length === 0) {
      Alert.alert("Products Required", "Please add at least one product.");
      return;
    }

    setSaving(true);

    const quotationPayload = {
      client_id: selectedClient.id,
      client_name: selectedClient.name || "",
      client_phone: selectedClient.phone || "",
      client_email: selectedClient.email || "",
      client_address: selectedClient.address || "",
      notes,
      status,
      total_amount: totalAmount,
    };

    let quotationId = editQuotation?.id;

    if (editQuotation) {
      const { error } = await supabase
        .from("quotations")
        .update(quotationPayload)
        .eq("id", editQuotation.id);

      if (error) {
        console.log(error);
        setSaving(false);
        Alert.alert("Save Failed", "Unable to update quotation.");
        return;
      }

      const { error: deleteItemsError } = await supabase
        .from("quotation_items")
        .delete()
        .eq("quotation_id", editQuotation.id);

      if (deleteItemsError) {
        console.log(deleteItemsError);
        setSaving(false);
        Alert.alert("Save Failed", "Unable to refresh quotation items.");
        return;
      }
    } else {
      const { data, error } = await supabase
        .from("quotations")
        .insert([quotationPayload])
        .select()
        .single();

      if (error) {
        console.log(error);
        setSaving(false);
        Alert.alert("Save Failed", "Unable to create quotation.");
        return;
      }

      quotationId = data.id;
    }

    const itemPayload = quoteItems.map((item) => ({
      quotation_id: quotationId,
      product_id: item.product_id,
      product_name: item.product_name,
      quantity: item.quantity,
      price: item.price,
      total: item.total,
    }));

    const { error: itemError } = await supabase
      .from("quotation_items")
      .insert(itemPayload);

    setSaving(false);

    if (itemError) {
      console.log(itemError);
      Alert.alert(
        "Quotation Saved",
        "Quotation was saved, but product items could not be saved."
      );
      return;
    }

    Alert.alert(
      editQuotation ? "Quotation Updated" : "Quotation Created",
      "Quotation saved successfully."
    );
    resetForm();
    fetchQuotations();
  };

  const handleEditQuotation = async (quotation) => {
    setEditQuotation(quotation);
    setSelectedClient({
      id: quotation.client_id,
      name: quotation.client_name,
      phone: quotation.client_phone,
      email: quotation.client_email,
      address: quotation.client_address,
    });
    setClientSearch(`${quotation.client_name} • ${quotation.client_phone}`);
    setNotes(quotation.notes || "");
    setStatus(quotation.status || "Draft");
    setQuoteItems([]);
    fetchProducts();
    setModalVisible(true);

    const { data, error } = await supabase
      .from("quotation_items")
      .select("*")
      .eq("quotation_id", quotation.id)
      .order("id", { ascending: true });

    if (error) {
      console.log(error);
      Alert.alert("Load Failed", "Unable to load quotation items.");
      return;
    }

    setQuoteItems(
      (data || []).map((item) => ({
        id: item.id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: Number(item.quantity || 0),
        price: Number(item.price || 0),
        total: Number(item.total || 0),
      }))
    );
  };

  const handleDeleteQuotation = (quotation) => {
    Alert.alert(
      "Delete Quotation",
      `Delete quotation #${quotation.id}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const { error: itemError } = await supabase
              .from("quotation_items")
              .delete()
              .eq("quotation_id", quotation.id);

            if (itemError) {
              console.log(itemError);
              Alert.alert("Delete Failed", "Unable to delete quotation items.");
              return;
            }

            const { error } = await supabase
              .from("quotations")
              .delete()
              .eq("id", quotation.id);

            if (error) {
              console.log(error);
              Alert.alert("Delete Failed", "Unable to delete quotation.");
              return;
            }

            fetchQuotations();
          },
        },
      ]
    );
  };

  const renderQuotation = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.quoteIcon}>
          <Ionicons name="document-text-outline" size={23} color="#1d4ed8" />
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.clientName}>{item.client_name || "Client"}</Text>
          <Text style={styles.metaText}>
            Quote #{item.id} • {formatDate(item.created_at)}
          </Text>
        </View>

        <View style={styles.statusPill}>
          <Text style={styles.statusText}>{item.status || "Draft"}</Text>
        </View>
      </View>

      <View style={styles.detailRow}>
        <View style={styles.detailBox}>
          <Text style={styles.detailLabel}>Phone</Text>
          <Text style={styles.detailValue}>{item.client_phone || "N/A"}</Text>
        </View>

        <View style={styles.detailBox}>
          <Text style={styles.detailLabel}>Total Amount</Text>
          <Text style={styles.amount}>{money(item.total_amount)}</Text>
        </View>
      </View>

      {item.notes ? <Text style={styles.notes}>{item.notes}</Text> : null}

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => handleEditQuotation(item)}
        >
          <Ionicons name="create-outline" size={16} color="#075985" />
          <Text style={styles.editText}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.printButton}
          onPress={() => handlePrintQuotation(item)}
        >
          <Ionicons name="print-outline" size={16} color="#075985" />
          <Text style={styles.printText}>Print</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.downloadButton}
          onPress={() => handleDownloadQuotation(item)}
        >
          <Ionicons name="download-outline" size={16} color="#166534" />
          <Text style={styles.downloadText}>PDF</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteQuotation(item)}
        >
          <Ionicons name="trash-outline" size={16} color="#b91c1c" />
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredQuotations}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderQuotation}
        refreshing={loading}
        onRefresh={fetchInitialData}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            <View style={styles.hero}>
              <View style={styles.heroIcon}>
                <Ionicons name="document-text-outline" size={28} color="#ffffff" />
              </View>
              <Text style={styles.eyebrow}>Sales Estimate</Text>
              <Text style={styles.heading}>Quotations</Text>
              <Text style={styles.subtitle}>
                Create professional estimates, add products, track totals, and
                manage client quotation records.
              </Text>

              <TouchableOpacity style={styles.createButton} onPress={openCreateForm}>
                <Ionicons name="add-circle-outline" size={20} color="#ffffff" />
                <Text style={styles.createButtonText}>Create Quotation</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.searchCard}>
              <View style={styles.searchBox}>
                <Ionicons name="search-outline" size={20} color="#64748b" />
                <TextInput
                  placeholder="Search quotation id, client, phone, or status"
                  style={styles.searchInput}
                  value={search}
                  onChangeText={setSearch}
                />
                {search ? (
                  <TouchableOpacity onPress={() => setSearch("")}>
                    <Ionicons name="close-circle" size={20} color="#94a3b8" />
                  </TouchableOpacity>
                ) : null}
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryText}>
                  {filteredQuotations.length} quotations found
                </Text>
                <Text style={styles.summaryText}>{quotations.length} total</Text>
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyCard}>
              <ActivityIndicator color="#1d4ed8" />
              <Text style={styles.emptyTitle}>Loading quotations...</Text>
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Ionicons name="document-text-outline" size={34} color="#94a3b8" />
              <Text style={styles.emptyTitle}>No quotations found</Text>
              <Text style={styles.emptyText}>
                Create a quotation to start tracking estimates.
              </Text>
            </View>
          )
        }
      />

      <Modal visible={modalVisible} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalEyebrow}>
                {editQuotation ? "Update Estimate" : "New Estimate"}
              </Text>
              <Text style={styles.modalHeading}>
                {editQuotation ? "Edit Quotation" : "Create Quotation"}
              </Text>
            </View>

            <TouchableOpacity style={styles.closeButton} onPress={resetForm}>
              <Ionicons name="close" size={22} color="#0f172a" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.formScroll}
            contentContainerStyle={styles.formContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.sectionTitle}>Client</Text>
            <TextInput
              placeholder="Search client by name or phone"
              style={styles.input}
              value={clientSearch}
              onChangeText={(text) => {
                setClientSearch(text);
                setSelectedClient(null);
              }}
            />

            {filteredClients.length > 0 ? (
              <View style={styles.suggestionList}>
                {filteredClients.map((client) => (
                  <TouchableOpacity
                    key={client.id}
                    style={styles.suggestionRow}
                    onPress={() => handleSelectClient(client)}
                  >
                    <View>
                      <Text style={styles.suggestionTitle}>{client.name}</Text>
                      <Text style={styles.suggestionMeta}>{client.phone}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}

            {selectedClient ? (
              <View style={styles.selectedCard}>
                <Text style={styles.selectedTitle}>{selectedClient.name}</Text>
                <Text style={styles.selectedMeta}>
                  {selectedClient.phone || "No phone"} •{" "}
                  {selectedClient.address || "No address"}
                </Text>
              </View>
            ) : null}

            <Text style={styles.sectionTitle}>Products</Text>
            <TextInput
              placeholder="Search product"
              style={styles.input}
              value={productSearch}
              onChangeText={(text) => {
                setProductSearch(text);
                setSelectedProduct(null);
              }}
            />

            {productsLoading ? (
              <View style={styles.loadingProductsRow}>
                <ActivityIndicator size="small" color="#2563eb" />
                <Text style={styles.loadingProductsText}>Loading products...</Text>
              </View>
            ) : null}

            {!productsLoading && filteredProducts.length > 0 ? (
              <View style={styles.suggestionList}>
                {filteredProducts.map((product) => (
                  <TouchableOpacity
                    key={product.id}
                    style={styles.suggestionRow}
                    onPress={() => handleSelectProduct(product)}
                  >
                    <View>
                      <Text style={styles.suggestionTitle}>
                        {product.product_name}
                      </Text>
                      <Text style={styles.suggestionMeta}>
                        {product.category || "General"} •{" "}
                        {money(product.selling_price)}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}

            {selectedProduct ? (
              <View style={styles.selectedCard}>
                <Text style={styles.selectedTitle}>
                  {selectedProduct.product_name}
                </Text>
                <Text style={styles.selectedMeta}>
                  Price: {money(selectedProduct.selling_price)}
                </Text>
              </View>
            ) : null}

            <View style={styles.addProductRow}>
              <View style={styles.quantityBox}>
                <Text style={styles.label}>Quantity</Text>
                <TextInput
                  placeholder="0"
                  style={styles.input}
                  keyboardType="numeric"
                  value={quantity}
                  onChangeText={setQuantity}
                />
              </View>

              <TouchableOpacity style={styles.addProductButton} onPress={handleAddProduct}>
                <Text style={styles.addProductText}>Add Product</Text>
              </TouchableOpacity>
            </View>

            {quoteItems.length > 0 ? (
              <View style={styles.itemsPanel}>
                {quoteItems.map((item) => (
                  <View key={item.id} style={styles.itemRow}>
                    <View style={styles.itemBody}>
                      <Text style={styles.itemName}>{item.product_name}</Text>
                      <Text style={styles.itemMeta}>
                        Qty {item.quantity} × {money(item.price)}
                      </Text>
                    </View>
                    <View style={styles.itemRight}>
                      <Text style={styles.itemTotal}>{money(item.total)}</Text>
                      <TouchableOpacity onPress={() => handleRemoveItem(item.id)}>
                        <Text style={styles.removeText}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}

            <Text style={styles.sectionTitle}>Quotation Details</Text>
            <View style={styles.statusRow}>
              {["Draft", "Sent", "Approved"].map((item) => {
                const active = status === item;
                return (
                  <TouchableOpacity
                    key={item}
                    style={[styles.statusChip, active && styles.activeStatusChip]}
                    onPress={() => setStatus(item)}
                  >
                    <Text
                      style={[styles.statusChipText, active && styles.activeStatusText]}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.label}>Notes</Text>
            <TextInput
              placeholder="Add terms, validity, or job notes"
              style={[styles.input, styles.notesInput]}
              multiline
              value={notes}
              onChangeText={setNotes}
            />

            <View style={styles.totalBox}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalAmount}>{money(totalAmount)}</Text>
            </View>

            <View style={styles.documentActions}>
              <TouchableOpacity
                style={styles.documentActionButton}
                onPress={handlePrintPreview}
              >
                <Ionicons name="print-outline" size={17} color="#075985" />
                <Text style={styles.documentActionText}>Print</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.documentActionButton}
                onPress={handleDownloadPreview}
              >
                <Ionicons name="download-outline" size={17} color="#075985" />
                <Text style={styles.documentActionText}>Download PDF</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.disabledButton]}
              onPress={handleSaveQuotation}
              disabled={saving}
            >
              <Text style={styles.saveButtonText}>
                {saving
                  ? "Saving..."
                  : editQuotation
                    ? "Update Quotation"
                    : "Create Quotation"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={resetForm}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#f4f7fb",
    flex: 1,
  },
  listContent: {
    padding: 18,
    paddingBottom: 32,
  },
  hero: {
    backgroundColor: "#0f172a",
    borderRadius: 26,
    marginBottom: 14,
    padding: 20,
  },
  heroIcon: {
    alignItems: "center",
    backgroundColor: "#1d4ed8",
    borderRadius: 17,
    height: 52,
    justifyContent: "center",
    marginBottom: 16,
    width: 52,
  },
  eyebrow: {
    color: "#93c5fd",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  heading: {
    color: "#ffffff",
    fontSize: 30,
    fontWeight: "900",
    marginTop: 4,
  },
  subtitle: {
    color: "#cbd5e1",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
    marginTop: 8,
  },
  createButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#1d4ed8",
    borderRadius: 15,
    flexDirection: "row",
    gap: 8,
    marginTop: 18,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  createButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900",
  },
  searchCard: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 14,
    padding: 14,
  },
  searchBox: {
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderColor: "#e2e8f0",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    paddingHorizontal: 12,
  },
  searchInput: {
    color: "#0f172a",
    flex: 1,
    fontSize: 15,
    paddingHorizontal: 10,
    paddingVertical: 13,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  summaryText: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "800",
  },
  card: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: 12,
    padding: 15,
  },
  cardTop: {
    alignItems: "center",
    flexDirection: "row",
  },
  quoteIcon: {
    alignItems: "center",
    backgroundColor: "#eff6ff",
    borderRadius: 16,
    height: 48,
    justifyContent: "center",
    marginRight: 12,
    width: 48,
  },
  cardBody: {
    flex: 1,
  },
  clientName: {
    color: "#0f172a",
    fontSize: 17,
    fontWeight: "900",
  },
  metaText: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 3,
  },
  statusPill: {
    backgroundColor: "#ecfdf5",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusText: {
    color: "#047857",
    fontSize: 12,
    fontWeight: "900",
  },
  detailRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  detailBox: {
    backgroundColor: "#f8fafc",
    borderRadius: 15,
    flex: 1,
    padding: 12,
  },
  detailLabel: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  detailValue: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "900",
    marginTop: 4,
  },
  amount: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "900",
    marginTop: 4,
  },
  notes: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
    marginTop: 12,
  },
  actions: {
    flexWrap: "wrap",
    flexDirection: "row",
    gap: 10,
    marginTop: 15,
  },
  editButton: {
    alignItems: "center",
    backgroundColor: "#e0f2fe",
    borderRadius: 14,
    flexBasis: "47%",
    flexGrow: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    padding: 12,
  },
  deleteButton: {
    alignItems: "center",
    backgroundColor: "#fee2e2",
    borderRadius: 14,
    flexBasis: "47%",
    flexGrow: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    padding: 12,
  },
  printButton: {
    alignItems: "center",
    backgroundColor: "#e0f2fe",
    borderRadius: 14,
    flexBasis: "47%",
    flexGrow: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    padding: 12,
  },
  downloadButton: {
    alignItems: "center",
    backgroundColor: "#dcfce7",
    borderRadius: 14,
    flexBasis: "47%",
    flexGrow: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    padding: 12,
  },
  editText: {
    color: "#075985",
    fontWeight: "900",
  },
  printText: {
    color: "#075985",
    fontWeight: "900",
  },
  downloadText: {
    color: "#166534",
    fontWeight: "900",
  },
  deleteText: {
    color: "#b91c1c",
    fontWeight: "900",
  },
  emptyCard: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 22,
    padding: 28,
  },
  emptyTitle: {
    color: "#0f172a",
    fontSize: 17,
    fontWeight: "900",
    marginTop: 10,
  },
  emptyText: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
    marginTop: 5,
    textAlign: "center",
  },
  modalContainer: {
    backgroundColor: "#f4f7fb",
    flex: 1,
  },
  modalHeader: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderBottomColor: "#e2e8f0",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 18,
    paddingTop: 54,
  },
  modalEyebrow: {
    color: "#1d4ed8",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  modalHeading: {
    color: "#0f172a",
    fontSize: 25,
    fontWeight: "900",
    marginTop: 3,
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  formScroll: {
    flex: 1,
  },
  formContent: {
    padding: 18,
    paddingBottom: 34,
  },
  sectionTitle: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 10,
    marginTop: 6,
  },
  label: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#ffffff",
    borderColor: "#cbd5e1",
    borderRadius: 15,
    borderWidth: 1,
    color: "#0f172a",
    fontSize: 15,
    marginBottom: 12,
    padding: 14,
  },
  suggestionList: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    overflow: "hidden",
  },
  loadingProductsRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  loadingProductsText: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "700",
  },
  suggestionRow: {
    alignItems: "center",
    borderBottomColor: "#f1f5f9",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 13,
  },
  suggestionTitle: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "900",
  },
  suggestionMeta: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },
  selectedCard: {
    backgroundColor: "#eff6ff",
    borderColor: "#bfdbfe",
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    padding: 13,
  },
  selectedTitle: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "900",
  },
  selectedMeta: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 4,
  },
  addProductRow: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 12,
  },
  quantityBox: {
    flex: 1,
  },
  addProductButton: {
    alignItems: "center",
    backgroundColor: "#0f172a",
    borderRadius: 15,
    justifyContent: "center",
    marginBottom: 12,
    minHeight: 50,
    paddingHorizontal: 16,
  },
  addProductText: {
    color: "#ffffff",
    fontWeight: "900",
  },
  itemsPanel: {
    marginBottom: 8,
  },
  itemRow: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: 10,
    padding: 13,
  },
  itemBody: {
    flex: 1,
  },
  itemName: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "900",
  },
  itemMeta: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 3,
  },
  itemRight: {
    alignItems: "flex-end",
  },
  itemTotal: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "900",
  },
  removeText: {
    color: "#dc2626",
    fontSize: 12,
    fontWeight: "900",
    marginTop: 5,
  },
  statusRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  statusChip: {
    backgroundColor: "#ffffff",
    borderColor: "#cbd5e1",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  activeStatusChip: {
    backgroundColor: "#1d4ed8",
    borderColor: "#1d4ed8",
  },
  statusChipText: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "900",
  },
  activeStatusText: {
    color: "#ffffff",
  },
  notesInput: {
    minHeight: 96,
    textAlignVertical: "top",
  },
  totalBox: {
    alignItems: "center",
    backgroundColor: "#0f172a",
    borderRadius: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
    padding: 18,
  },
  totalLabel: {
    color: "#cbd5e1",
    fontSize: 14,
    fontWeight: "900",
  },
  totalAmount: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "900",
  },
  documentActions: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  documentActionButton: {
    alignItems: "center",
    backgroundColor: "#e0f2fe",
    borderRadius: 15,
    flex: 1,
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    padding: 14,
  },
  documentActionText: {
    color: "#075985",
    fontSize: 14,
    fontWeight: "900",
  },
  saveButton: {
    alignItems: "center",
    backgroundColor: "#16a34a",
    borderRadius: 15,
    padding: 15,
  },
  disabledButton: {
    opacity: 0.65,
  },
  saveButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900",
  },
  cancelButton: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#cbd5e1",
    borderRadius: 15,
    borderWidth: 1,
    marginTop: 12,
    padding: 15,
  },
  cancelButtonText: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "900",
  },
});
