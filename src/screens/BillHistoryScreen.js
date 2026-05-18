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

const PAGE_SIZE = 6;

const currency = (value) => `₹${Number(value || 0).toFixed(2)}`;

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

const filters = [
  { label: "Latest", value: "latest" },
  { label: "Oldest", value: "oldest" },
  { label: "Highest Amount", value: "highest" },
  { label: "Lowest Amount", value: "lowest" },
];

export default function BillHistoryScreen() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("latest");
  const [page, setPage] = useState(1);
  const [selectedBill, setSelectedBill] = useState(null);
  const [billItems, setBillItems] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);

  useEffect(() => {
    fetchBills();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, activeFilter]);

  const fetchBills = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("bills")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      console.log(error);
      Alert.alert("Bill History Error", "Unable to load saved bills.");
      setBills([]);
    } else {
      setBills(data || []);
    }

    setLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchBills();
    setRefreshing(false);
  };

  const filteredBills = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    const searchedBills = bills.filter((bill) => {
      const billId = String(bill.id || "").toLowerCase();
      const clientName = String(bill.client_name || "").toLowerCase();
      const phone = String(bill.client_phone || "").toLowerCase();

      return (
        !keyword ||
        billId.includes(keyword) ||
        clientName.includes(keyword) ||
        phone.includes(keyword)
      );
    });

    return [...searchedBills].sort((a, b) => {
      if (activeFilter === "oldest") {
        return Number(a.id || 0) - Number(b.id || 0);
      }

      if (activeFilter === "highest") {
        return Number(b.total_amount || 0) - Number(a.total_amount || 0);
      }

      if (activeFilter === "lowest") {
        return Number(a.total_amount || 0) - Number(b.total_amount || 0);
      }

      return Number(b.id || 0) - Number(a.id || 0);
    });
  }, [activeFilter, bills, search]);

  const totalPages = Math.max(1, Math.ceil(filteredBills.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedBills = filteredBills.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  );

  const fetchBillDetails = async (bill) => {
    setSelectedBill(bill);
    setDetailsVisible(true);
    setDetailsLoading(true);
    setBillItems([]);

    const { data, error } = await supabase
      .from("bill_items")
      .select("*")
      .eq("bill_id", bill.id)
      .order("id", { ascending: true });

    if (error) {
      console.log(error);
      Alert.alert("Details Error", "Unable to load bill items.");
      setBillItems([]);
    } else {
      setBillItems(data || []);
    }

    setDetailsLoading(false);
  };

  const loadBillItems = async (bill) => {
    const { data, error } = await supabase
      .from("bill_items")
      .select("*")
      .eq("bill_id", bill.id)
      .order("id", { ascending: true });

    if (error) {
      console.log(error);
      throw error;
    }

    return data || [];
  };

  const handleDeleteBill = (bill) => {
    Alert.alert(
      "Delete Bill",
      `Delete bill #${bill.id}? This will remove the bill and its items.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const { error: itemsError } = await supabase
              .from("bill_items")
              .delete()
              .eq("bill_id", bill.id);

            if (itemsError) {
              console.log(itemsError);
              Alert.alert("Delete Failed", "Unable to delete bill items.");
              return;
            }

            const { error: billError } = await supabase
              .from("bills")
              .delete()
              .eq("id", bill.id);

            if (billError) {
              console.log(billError);
              Alert.alert("Delete Failed", "Unable to delete bill.");
              return;
            }

            setDetailsVisible(false);
            setSelectedBill(null);
            setBillItems([]);
            await fetchBills();
          },
        },
      ]
    );
  };

  const handlePrint = async (bill) => {
    try {
      const items =
        selectedBill?.id === bill.id && billItems.length > 0
          ? billItems
          : await loadBillItems(bill);

      await printInvoice({ bill, items });
    } catch (error) {
      console.log(error);
      Alert.alert("Print Failed", "Unable to print this invoice.");
    }
  };

  const handleDownload = async (bill) => {
    try {
      const items =
        selectedBill?.id === bill.id && billItems.length > 0
          ? billItems
          : await loadBillItems(bill);
      const result = await shareInvoicePdf({ bill, items });

      if (!result.shared) {
        Alert.alert("Invoice Ready", `PDF generated successfully.\n${result.uri}`);
      }
    } catch (error) {
      console.log(error);
      Alert.alert("Download Failed", "Unable to generate this invoice PDF.");
    }
  };

  const renderBillCard = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.receiptIcon}>
          <Ionicons name="receipt-outline" size={23} color="#1d4ed8" />
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.clientName}>{item.client_name || "Client"}</Text>
          <Text style={styles.metaText}>{item.client_phone || "No phone"}</Text>
        </View>

        <View style={styles.amountBox}>
          <Text style={styles.amount}>{currency(item.total_amount)}</Text>
        </View>
      </View>

      <View style={styles.infoGrid}>
        <View style={styles.infoPill}>
          <Text style={styles.infoLabel}>Bill ID</Text>
          <Text style={styles.infoValue}>#{item.id}</Text>
        </View>

        <View style={styles.infoPill}>
          <Text style={styles.infoLabel}>Date</Text>
          <Text style={styles.infoValue}>{formatDate(item.created_at)}</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.primaryAction}
          onPress={() => fetchBillDetails(item)}
        >
          <Ionicons name="eye-outline" size={16} color="#ffffff" />
          <Text style={styles.primaryActionText}>View</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.softAction} onPress={() => handlePrint(item)}>
          <Ionicons name="print-outline" size={16} color="#075985" />
          <Text style={styles.softActionText}>Print</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.softAction}
          onPress={() => handleDownload(item)}
        >
          <Ionicons name="download-outline" size={16} color="#075985" />
          <Text style={styles.softActionText}>Download</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteAction}
          onPress={() => handleDeleteBill(item)}
        >
          <Ionicons name="trash-outline" size={16} color="#b91c1c" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={paginatedBills}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderBillCard}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            <View style={styles.headerCard}>
              <Text style={styles.eyebrow}>Invoice Records</Text>
              <Text style={styles.heading}>Bill History</Text>
              <Text style={styles.subtitle}>
                Search, review, print, download, or delete saved customer bills.
              </Text>
            </View>

            <View style={styles.searchCard}>
              <View style={styles.searchRow}>
                <Ionicons name="search-outline" size={20} color="#64748b" />
                <TextInput
                  placeholder="Search by client, phone, or bill id"
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

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterRow}
              >
                {filters.map((filter) => {
                  const active = activeFilter === filter.value;

                  return (
                    <TouchableOpacity
                      key={filter.value}
                      style={[styles.filterChip, active && styles.activeFilterChip]}
                      onPress={() => setActiveFilter(filter.value)}
                    >
                      <Text
                        style={[
                          styles.filterText,
                          active && styles.activeFilterText,
                        ]}
                      >
                        {filter.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            <View style={styles.resultsHeader}>
              <Text style={styles.resultsTitle}>
                {filteredBills.length} Bills Found
              </Text>
              <Text style={styles.pageText}>
                Page {safePage} of {totalPages}
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator color="#1d4ed8" />
              <Text style={styles.loadingText}>Loading bills...</Text>
            </View>
          ) : (
            <View style={styles.emptyCard}>
              <Ionicons name="receipt-outline" size={34} color="#94a3b8" />
              <Text style={styles.emptyTitle}>No bills found</Text>
              <Text style={styles.emptyText}>
                Saved bills will appear here after billing is completed.
              </Text>
            </View>
          )
        }
        ListFooterComponent={
          filteredBills.length > PAGE_SIZE ? (
            <View style={styles.pagination}>
              <TouchableOpacity
                style={[
                  styles.pageButton,
                  safePage === 1 && styles.disabledButton,
                ]}
                disabled={safePage === 1}
                onPress={() => setPage((current) => Math.max(1, current - 1))}
              >
                <Text style={styles.pageButtonText}>Previous</Text>
              </TouchableOpacity>

              <Text style={styles.pageCounter}>
                {safePage} / {totalPages}
              </Text>

              <TouchableOpacity
                style={[
                  styles.pageButton,
                  safePage === totalPages && styles.disabledButton,
                ]}
                disabled={safePage === totalPages}
                onPress={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
              >
                <Text style={styles.pageButtonText}>Next</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />

      <Modal visible={detailsVisible} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.eyebrow}>Bill Details</Text>
              <Text style={styles.modalTitle}>Invoice #{selectedBill?.id}</Text>
            </View>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setDetailsVisible(false)}
            >
              <Ionicons name="close" size={22} color="#0f172a" />
            </TouchableOpacity>
          </View>

          {selectedBill ? (
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalContent}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.detailSummary}>
                <Text style={styles.detailClient}>
                  {selectedBill.client_name || "Client"}
                </Text>
                <Text style={styles.detailMeta}>
                  {selectedBill.client_phone || "No phone"} •{" "}
                  {formatDate(selectedBill.created_at)}
                </Text>
                <Text style={styles.detailAmount}>
                  {currency(selectedBill.total_amount)}
                </Text>
              </View>

              <Text style={styles.itemsTitle}>Products</Text>

              {detailsLoading ? (
                <ActivityIndicator color="#1d4ed8" style={styles.loader} />
              ) : billItems.length === 0 ? (
                <View style={styles.emptyItems}>
                  <Text style={styles.emptyTitle}>No items found</Text>
                </View>
              ) : (
                billItems.map((item) => (
                  <View key={item.id} style={styles.itemRow}>
                    <View style={styles.itemBody}>
                      <Text style={styles.itemName}>{item.product_name}</Text>
                      <Text style={styles.itemMeta}>
                        Qty {item.quantity} × {currency(item.price)}
                      </Text>
                    </View>
                    <Text style={styles.itemTotal}>{currency(item.total)}</Text>
                  </View>
                ))
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.softModalButton}
                  onPress={() => handlePrint(selectedBill)}
                >
                  <Ionicons name="print-outline" size={17} color="#075985" />
                  <Text style={styles.softActionText}>Print</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.softModalButton}
                  onPress={() => handleDownload(selectedBill)}
                >
                  <Ionicons name="download-outline" size={17} color="#075985" />
                  <Text style={styles.softActionText}>Download</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteModalButton}
                  onPress={() => handleDeleteBill(selectedBill)}
                >
                  <Ionicons name="trash-outline" size={17} color="#b91c1c" />
                  <Text style={styles.deleteText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          ) : null}
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
  headerCard: {
    backgroundColor: "#0f172a",
    borderRadius: 26,
    marginBottom: 14,
    padding: 20,
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
    marginTop: 6,
  },
  subtitle: {
    color: "#cbd5e1",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
    marginTop: 8,
  },
  searchCard: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 14,
    padding: 14,
  },
  searchRow: {
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
  filterRow: {
    gap: 8,
    paddingTop: 12,
  },
  filterChip: {
    backgroundColor: "#f8fafc",
    borderColor: "#e2e8f0",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  activeFilterChip: {
    backgroundColor: "#1d4ed8",
    borderColor: "#1d4ed8",
  },
  filterText: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "900",
  },
  activeFilterText: {
    color: "#ffffff",
  },
  resultsHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  resultsTitle: {
    color: "#0f172a",
    fontSize: 17,
    fontWeight: "900",
  },
  pageText: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "800",
  },
  card: {
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
    padding: 14,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
  },
  cardTop: {
    alignItems: "center",
    flexDirection: "row",
  },
  receiptIcon: {
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
  amountBox: {
    alignItems: "flex-end",
  },
  amount: {
    color: "#0f172a",
    fontSize: 17,
    fontWeight: "900",
  },
  infoGrid: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  infoPill: {
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    flex: 1,
    padding: 11,
  },
  infoLabel: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  infoValue: {
    color: "#0f172a",
    fontSize: 14,
    fontWeight: "900",
    marginTop: 3,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },
  primaryAction: {
    alignItems: "center",
    backgroundColor: "#1d4ed8",
    borderRadius: 13,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  primaryActionText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "900",
  },
  softAction: {
    alignItems: "center",
    backgroundColor: "#e0f2fe",
    borderRadius: 13,
    flexDirection: "row",
    flex: 1,
    gap: 5,
    justifyContent: "center",
    paddingVertical: 10,
  },
  softActionText: {
    color: "#075985",
    fontSize: 13,
    fontWeight: "900",
  },
  deleteAction: {
    alignItems: "center",
    backgroundColor: "#fee2e2",
    borderRadius: 13,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  loadingCard: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 28,
  },
  loadingText: {
    color: "#64748b",
    fontWeight: "800",
    marginTop: 10,
  },
  emptyCard: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 28,
  },
  emptyTitle: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "900",
    marginTop: 10,
  },
  emptyText: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
    marginTop: 4,
    textAlign: "center",
  },
  pagination: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
    marginTop: 8,
  },
  pageButton: {
    backgroundColor: "#0f172a",
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  disabledButton: {
    opacity: 0.4,
  },
  pageButtonText: {
    color: "#ffffff",
    fontWeight: "900",
  },
  pageCounter: {
    color: "#0f172a",
    fontWeight: "900",
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
    paddingTop: 56,
  },
  modalTitle: {
    color: "#0f172a",
    fontSize: 24,
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
  modalScroll: {
    flex: 1,
  },
  modalContent: {
    padding: 18,
    paddingBottom: 34,
  },
  detailSummary: {
    backgroundColor: "#0f172a",
    borderRadius: 22,
    marginBottom: 18,
    padding: 18,
  },
  detailClient: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "900",
  },
  detailMeta: {
    color: "#cbd5e1",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 6,
  },
  detailAmount: {
    color: "#ffffff",
    fontSize: 30,
    fontWeight: "900",
    marginTop: 16,
  },
  itemsTitle: {
    color: "#0f172a",
    fontSize: 20,
    fontWeight: "900",
    marginBottom: 10,
  },
  loader: {
    marginTop: 20,
  },
  emptyItems: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 22,
  },
  itemRow: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#e2e8f0",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: 10,
    padding: 14,
  },
  itemBody: {
    flex: 1,
  },
  itemName: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "900",
  },
  itemMeta: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 3,
  },
  itemTotal: {
    color: "#0f172a",
    fontSize: 16,
    fontWeight: "900",
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  softModalButton: {
    alignItems: "center",
    backgroundColor: "#e0f2fe",
    borderRadius: 14,
    flex: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    padding: 13,
  },
  deleteModalButton: {
    alignItems: "center",
    backgroundColor: "#fee2e2",
    borderRadius: 14,
    flex: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    padding: 13,
  },
  deleteText: {
    color: "#b91c1c",
    fontSize: 13,
    fontWeight: "900",
  },
});
