import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Modal,
  Alert,
} from "react-native";

import { supabase } from "../lib/supabase";

export default function ClientsScreen() {
  const [clients, setClients] = useState([]);

  const [modalVisible, setModalVisible] =
    useState(false);

  const [search, setSearch] = useState("");

  const [clientName, setClientName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [description, setDescription] =
    useState("");

  const [editId, setEditId] = useState(null);

  // PAGINATION
  const [page, setPage] = useState(1);

  const clientsPerPage = 5;

  useEffect(() => {
    fetchClients();
  }, []);

  // FETCH CLIENTS
  const fetchClients = async () => {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      console.log(error);
      return;
    }

    setClients(data);
  };

  // SAVE CLIENT
  const handleSaveClient = async () => {
    if (!clientName || !phone || !address) {
      Alert.alert(
        "Please fill required fields"
      );
      return;
    }

    const clientData = {
      name: clientName,
      phone,
      email,
      address,
      description,
    };

    // UPDATE
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
      // INSERT
      const { error } = await supabase
        .from("clients")
        .insert([clientData]);

      if (error) {
        console.log(error);
        Alert.alert(
          "Phone number already exists"
        );
        return;
      }
    }

    fetchClients();
    resetForm();
  };

  // DELETE CLIENT
  const handleDelete = async (id) => {
    const { error } = await supabase
      .from("clients")
      .delete()
      .eq("id", id);

    if (error) {
      console.log(error);
      return;
    }

    fetchClients();
  };

  // EDIT CLIENT
  const handleEdit = (item) => {
    setClientName(item.name);
    setPhone(item.phone);
    setEmail(item.email || "");
    setAddress(item.address || "");
    setDescription(item.description || "");

    setEditId(item.id);

    setModalVisible(true);
  };

  // RESET FORM
  const resetForm = () => {
    setClientName("");
    setPhone("");
    setEmail("");
    setAddress("");
    setDescription("");

    setEditId(null);

    setModalVisible(false);
  };

  // FILTER CLIENTS
  const filteredClients = clients.filter(
    (item) =>
      item.name
        ?.toLowerCase()
        .includes(search.toLowerCase()) ||
      item.phone?.includes(search)
  );

  // PAGINATION
  const startIndex = (page - 1) * clientsPerPage;

  const paginatedClients =
    filteredClients.slice(
      startIndex,
      startIndex + clientsPerPage
    );

  const totalPages = Math.ceil(
    filteredClients.length / clientsPerPage
  );

  return (
    <View style={styles.container}>
      {/* HEADER */}

      <View style={styles.header}>
        <Text style={styles.heading}>
          Clients
        </Text>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() =>
            setModalVisible(true)
          }
        >
          <Text style={styles.addButtonText}>
            + Add Client
          </Text>
        </TouchableOpacity>
      </View>

      {/* SEARCH */}

      <TextInput
        placeholder="Search by name or phone"
        style={styles.searchInput}
        value={search}
        onChangeText={setSearch}
      />

      {/* CLIENT LIST */}

      <FlatList
        data={paginatedClients}
        keyExtractor={(item) =>
          item.id.toString()
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            No Clients Found
          </Text>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.clientName}>
              {item.name}
            </Text>

            <Text style={styles.infoText}>
              📞 {item.phone}
            </Text>

            <Text style={styles.infoText}>
              ✉️ {item.email || "N/A"}
            </Text>

            <Text style={styles.infoText}>
              📍 {item.address}
            </Text>

            {item.description ? (
              <Text style={styles.infoText}>
                📝 {item.description}
              </Text>
            ) : null}

            <View style={styles.actionContainer}>
              <TouchableOpacity
                style={styles.editButton}
                onPress={() =>
                  handleEdit(item)
                }
              >
                <Text style={styles.buttonText}>
                  Edit
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() =>
                  handleDelete(item.id)
                }
              >
                <Text style={styles.buttonText}>
                  Delete
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* PAGINATION */}

      {totalPages > 1 && (
        <View style={styles.paginationContainer}>
          <TouchableOpacity
            style={styles.pageButton}
            disabled={page === 1}
            onPress={() =>
              setPage(page - 1)
            }
          >
            <Text style={styles.pageButtonText}>
              Prev
            </Text>
          </TouchableOpacity>

          <Text style={styles.pageText}>
            {page} / {totalPages}
          </Text>

          <TouchableOpacity
            style={styles.pageButton}
            disabled={page === totalPages}
            onPress={() =>
              setPage(page + 1)
            }
          >
            <Text style={styles.pageButtonText}>
              Next
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* MODAL */}

      <Modal
        visible={modalVisible}
        animationType="slide"
      >
        <View style={styles.modalContainer}>
          <Text style={styles.modalHeading}>
            {editId
              ? "Edit Client"
              : "Add Client"}
          </Text>

          <TextInput
            placeholder="Client Name"
            style={styles.input}
            value={clientName}
            onChangeText={setClientName}
          />

          <TextInput
            placeholder="Phone Number"
            style={styles.input}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />

          <TextInput
            placeholder="Email (Optional)"
            style={styles.input}
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />

          <TextInput
            placeholder="Address"
            style={styles.input}
            value={address}
            onChangeText={setAddress}
          />

          <TextInput
            placeholder="Description (Optional)"
            style={[
              styles.input,
              styles.descriptionInput,
            ]}
            multiline
            value={description}
            onChangeText={setDescription}
          />

          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSaveClient}
          >
            <Text style={styles.saveButtonText}>
              {editId
                ? "Update Client"
                : "Save Client"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={resetForm}
          >
            <Text
              style={styles.cancelButtonText}
            >
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },

  heading: {
    fontSize: 28,
    fontWeight: "bold",
  },

  addButton: {
    backgroundColor: "#000",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
  },

  addButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },

  searchInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    fontSize: 16,
  },

  emptyText: {
    textAlign: "center",
    marginTop: 100,
    fontSize: 16,
    color: "gray",
  },

  card: {
    backgroundColor: "#f3f4f6",
    padding: 15,
    borderRadius: 15,
    marginBottom: 15,
  },

  clientName: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
  },

  infoText: {
    fontSize: 14,
    marginBottom: 6,
    color: "#374151",
  },

  actionContainer: {
    flexDirection: "row",
    marginTop: 15,
    gap: 10,
  },

  editButton: {
    backgroundColor: "#2563eb",
    padding: 10,
    borderRadius: 10,
  },

  deleteButton: {
    backgroundColor: "#dc2626",
    padding: 10,
    borderRadius: 10,
  },

  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },

  paginationContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 20,
    gap: 15,
  },

  pageButton: {
    backgroundColor: "#000",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },

  pageButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },

  pageText: {
    fontSize: 16,
    fontWeight: "bold",
  },

  modalContainer: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
    justifyContent: "center",
  },

  modalHeading: {
    fontSize: 30,
    fontWeight: "bold",
    marginBottom: 30,
  },

  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
  },

  descriptionInput: {
    height: 100,
    textAlignVertical: "top",
  },

  saveButton: {
    backgroundColor: "#000",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },

  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },

  cancelButton: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 15,
  },

  cancelButtonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
});