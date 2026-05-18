import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
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

const clientsPerPage = 5;

export default function ClientsScreen() {
  const [clients, setClients] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [search, setSearch] = useState("");

  const [clientName, setClientName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");

  const [editId, setEditId] = useState(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const fetchClients = async () => {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      console.log(error);
      return;
    }

    setClients(data || []);
  };

  const handleSaveClient = async () => {
    if (!clientName || !phone || !address) {
      Alert.alert("Missing Details", "Please fill required fields.");
      return;
    }

    const clientData = {
      name: clientName,
      phone,
      email,
      address,
      description,
    };

    if (editId) {
      const { error } = await supabase
        .from("clients")
        .update(clientData)
        .eq("id", editId);

      if (error) {
        console.log(error);
        return;
      }
    } else {
      const { error } = await supabase.from("clients").insert([clientData]);

      if (error) {
        console.log(error);
        Alert.alert("Phone number already exists");
        return;
      }
    }

    fetchClients();
    resetForm();
  };

  const handleDelete = async (id) => {
    const { error } = await supabase.from("clients").delete().eq("id", id);

    if (error) {
      console.log(error);
      return;
    }

    fetchClients();
  };

  const confirmDelete = (id) => {
    Alert.alert("Delete Client", "Are you sure you want to delete this client?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => handleDelete(id),
      },
    ]);
  };

  const handleEdit = (item) => {
    setClientName(item.name);
    setPhone(item.phone);
    setEmail(item.email || "");
    setAddress(item.address || "");
    setDescription(item.description || "");
    setEditId(item.id);
    setModalVisible(true);
  };

  const resetForm = () => {
    setClientName("");
    setPhone("");
    setEmail("");
    setAddress("");
    setDescription("");
    setEditId(null);
    setModalVisible(false);
  };

  const openAddClient = () => {
    resetForm();
    setModalVisible(true);
  };

  const filteredClients = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return clients;
    }

    return clients.filter(
      (item) =>
        item.name?.toLowerCase().includes(keyword) ||
        item.phone?.includes(keyword) ||
        item.email?.toLowerCase().includes(keyword)
    );
  }, [clients, search]);

  const totalPages = Math.max(1, Math.ceil(filteredClients.length / clientsPerPage));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * clientsPerPage;
  const paginatedClients = filteredClients.slice(
    startIndex,
    startIndex + clientsPerPage
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={paginatedClients}
        keyExtractor={(item) => item.id.toString()}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            <View style={styles.hero}>
              <View style={styles.heroIcon}>
                <Ionicons name="people-outline" size={28} color="#ffffff" />
              </View>

              <Text style={styles.eyebrow}>Customer Directory</Text>
              <Text style={styles.heading}>Clients</Text>
              <Text style={styles.subtitle}>
                Manage customer contact details, billing addresses, and service
                notes in one professional workspace.
              </Text>

              <TouchableOpacity style={styles.addButton} onPress={openAddClient}>
                <Ionicons name="person-add-outline" size={19} color="#ffffff" />
                <Text style={styles.addButtonText}>Add Client</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.searchCard}>
              <View style={styles.searchBox}>
                <Ionicons name="search-outline" size={20} color="#64748b" />
                <TextInput
                  placeholder="Search by name, phone, or email"
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
                  {filteredClients.length} clients found
                </Text>
                <Text style={styles.summaryText}>Page {safePage} / {totalPages}</Text>
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Ionicons name="people-outline" size={34} color="#94a3b8" />
            <Text style={styles.emptyTitle}>No clients found</Text>
            <Text style={styles.emptyText}>
              Add a client or adjust your search to see customer records here.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(item.name || "C").charAt(0).toUpperCase()}
                </Text>
              </View>

              <View style={styles.clientMain}>
                <Text style={styles.clientName}>{item.name}</Text>
                <Text style={styles.clientMeta}>Client ID #{item.id}</Text>
              </View>
            </View>

            <View style={styles.detailGrid}>
              <View style={styles.detailBox}>
                <Ionicons name="call-outline" size={17} color="#1d4ed8" />
                <View style={styles.detailTextWrap}>
                  <Text style={styles.detailLabel}>Phone</Text>
                  <Text style={styles.detailValue}>{item.phone}</Text>
                </View>
              </View>

              <View style={styles.detailBox}>
                <Ionicons name="mail-outline" size={17} color="#1d4ed8" />
                <View style={styles.detailTextWrap}>
                  <Text style={styles.detailLabel}>Email</Text>
                  <Text style={styles.detailValue}>{item.email || "N/A"}</Text>
                </View>
              </View>
            </View>

            <View style={styles.addressBox}>
              <Ionicons name="location-outline" size={17} color="#64748b" />
              <Text style={styles.addressText}>{item.address}</Text>
            </View>

            {item.description ? (
              <View style={styles.noteBox}>
                <Ionicons name="document-text-outline" size={17} color="#64748b" />
                <Text style={styles.noteText}>{item.description}</Text>
              </View>
            ) : null}

            <View style={styles.actionContainer}>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => handleEdit(item)}
              >
                <Ionicons name="create-outline" size={16} color="#075985" />
                <Text style={styles.editText}>Edit</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => confirmDelete(item.id)}
              >
                <Ionicons name="trash-outline" size={16} color="#b91c1c" />
                <Text style={styles.deleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListFooterComponent={
          totalPages > 1 ? (
            <View style={styles.paginationContainer}>
              <TouchableOpacity
                style={[styles.pageButton, safePage === 1 && styles.disabledButton]}
                disabled={safePage === 1}
                onPress={() => setPage((current) => Math.max(1, current - 1))}
              >
                <Text style={styles.pageButtonText}>Previous</Text>
              </TouchableOpacity>

              <Text style={styles.pageText}>{safePage} / {totalPages}</Text>

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

      <Modal visible={modalVisible} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalEyebrow}>
                {editId ? "Update Customer" : "New Customer"}
              </Text>
              <Text style={styles.modalHeading}>
                {editId ? "Edit Client" : "Add Client"}
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
            <Text style={styles.label}>Client Name</Text>
            <TextInput
              placeholder="Enter client name"
              style={styles.input}
              value={clientName}
              onChangeText={setClientName}
            />

            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              placeholder="Enter phone number"
              style={styles.input}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />

            <Text style={styles.label}>Email</Text>
            <TextInput
              placeholder="Email optional"
              style={styles.input}
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />

            <Text style={styles.label}>Address</Text>
            <TextInput
              placeholder="Enter service or billing address"
              style={[styles.input, styles.addressInput]}
              multiline
              value={address}
              onChangeText={setAddress}
            />

            <Text style={styles.label}>Description</Text>
            <TextInput
              placeholder="Optional customer notes"
              style={[styles.input, styles.descriptionInput]}
              multiline
              value={description}
              onChangeText={setDescription}
            />

            <TouchableOpacity style={styles.saveButton} onPress={handleSaveClient}>
              <Text style={styles.saveButtonText}>
                {editId ? "Update Client" : "Save Client"}
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
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 6,
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
  addButton: {
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
  addButtonText: {
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
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 2,
  },
  cardTop: {
    alignItems: "center",
    flexDirection: "row",
    marginBottom: 14,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: "#eff6ff",
    borderRadius: 18,
    height: 52,
    justifyContent: "center",
    marginRight: 12,
    width: 52,
  },
  avatarText: {
    color: "#1d4ed8",
    fontSize: 20,
    fontWeight: "900",
  },
  clientMain: {
    flex: 1,
  },
  clientName: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: "900",
  },
  clientMeta: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 4,
  },
  detailGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
  },
  detailBox: {
    alignItems: "flex-start",
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    padding: 12,
  },
  detailTextWrap: {
    flex: 1,
  },
  detailLabel: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  detailValue: {
    color: "#0f172a",
    fontSize: 13,
    fontWeight: "900",
    marginTop: 3,
  },
  addressBox: {
    alignItems: "flex-start",
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
    padding: 12,
  },
  addressText: {
    color: "#334155",
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 19,
  },
  noteBox: {
    alignItems: "flex-start",
    backgroundColor: "#fff7ed",
    borderRadius: 16,
    flexDirection: "row",
    gap: 8,
    padding: 12,
  },
  noteText: {
    color: "#7c2d12",
    flex: 1,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 19,
  },
  actionContainer: {
    flexDirection: "row",
    gap: 10,
    marginTop: 15,
  },
  editButton: {
    alignItems: "center",
    backgroundColor: "#e0f2fe",
    borderRadius: 14,
    flex: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    padding: 12,
  },
  deleteButton: {
    alignItems: "center",
    backgroundColor: "#fee2e2",
    borderRadius: 14,
    flex: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    padding: 12,
  },
  editText: {
    color: "#075985",
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
  paginationContainer: {
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
  pageText: {
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
    marginBottom: 14,
    padding: 14,
  },
  addressInput: {
    minHeight: 84,
    textAlignVertical: "top",
  },
  descriptionInput: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  saveButton: {
    alignItems: "center",
    backgroundColor: "#16a34a",
    borderRadius: 15,
    marginTop: 4,
    padding: 15,
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
